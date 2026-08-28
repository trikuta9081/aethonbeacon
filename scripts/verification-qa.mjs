function readArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : "";
}

function envOrArg(envName, argName) {
  return readArg(argName) || String(process.env[envName] ?? "").trim();
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/$/, "");
}

function redactDestination(value) {
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (value.length <= 4) return "***";
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return { status: response.status, ok: response.ok, body: await readJson(response) };
}

async function requestAndConfirm({ baseUrl, channel, destination, code }) {
  const destinationKey = channel === "phone" ? "phone" : "email";
  const payload = {
    channel,
    [destinationKey]: destination,
    name: "NAYIQ QA",
    profileRoleId: "student",
    profileGender: "prefer_not_to_say"
  };

  const request = await postJson(`${baseUrl}/verification/request`, payload);
  if (!request.ok) {
    throw new Error(
      `${channel} request failed with ${request.status}: ${request.body.message ?? "unknown error"}`
    );
  }

  const deliveredCode = code || request.body.previewCode || "";
  if (!deliveredCode) {
    return {
      channel,
      destination: redactDestination(destination),
      requestStatus: request.status,
      deliveryId: request.body.deliveryId ?? null,
      pendingManualCode: true
    };
  }

  const confirm = await postJson(`${baseUrl}/verification/confirm`, {
    ...payload,
    code: deliveredCode,
    challenge: request.body.challenge || undefined
  });

  if (!confirm.ok || confirm.body.verified !== true) {
    throw new Error(
      `${channel} confirm failed with ${confirm.status}: ${confirm.body.message ?? "unknown error"}`
    );
  }

  return {
    channel,
    destination: redactDestination(destination),
    requestStatus: request.status,
    confirmStatus: confirm.status,
      verified: true,
      usedPreviewCode: Boolean(request.body.previewCode && !code),
      signedChallenge: Boolean(request.body.challenge)
  };
}

const baseUrl = normalizeBaseUrl(
  envOrArg("VERIFY_BASE_URL", "base-url") || envOrArg("EXPO_PUBLIC_VERIFICATION_API_BASE_URL", "api-base-url")
);
const phone = envOrArg("VERIFY_PHONE", "phone");
const email = envOrArg("VERIFY_EMAIL", "email");
const phoneCode = envOrArg("VERIFY_PHONE_CODE", "phone-code");
const emailCode = envOrArg("VERIFY_EMAIL_CODE", "email-code");

if (!baseUrl) {
  console.error("Missing verification API base URL. Set VERIFY_BASE_URL or pass --base-url=https://...");
  process.exit(1);
}

if (!phone && !email) {
  console.error("Provide at least one destination: VERIFY_PHONE or VERIFY_EMAIL.");
  process.exit(1);
}

const healthResponse = await fetch(`${baseUrl}/health`);
const health = await readJson(healthResponse);
if (!healthResponse.ok || health.ok !== true) {
  console.error(JSON.stringify({ healthStatus: healthResponse.status, health }, null, 2));
  process.exit(1);
}

const results = [];
if (phone) {
  results.push(await requestAndConfirm({ baseUrl, channel: "phone", destination: phone, code: phoneCode }));
}
if (email) {
  results.push(await requestAndConfirm({ baseUrl, channel: "email", destination: email, code: emailCode }));
}

const pending = results.filter((result) => result.pendingManualCode);
console.log(
  JSON.stringify(
    {
      baseUrl,
      health: {
        mode: health.mode,
        providers: health.providers,
        webhooks: health.webhooks,
        debugPreview: health.debugPreview
      },
      results
    },
    null,
    2
  )
);

if (pending.length > 0) {
  console.error(
    [
      "OTP request succeeded, but confirmation is waiting for manual codes.",
      "Read the SMS/email code, then rerun with VERIFY_PHONE_CODE and/or VERIFY_EMAIL_CODE."
    ].join("\n")
  );
  process.exit(2);
}
