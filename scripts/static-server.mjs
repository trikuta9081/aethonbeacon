import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { mkdir, readFile, stat, appendFile } from "node:fs/promises";
import { createSign } from "node:crypto";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const port = parsePositiveInt(process.env.PORT, 3000);
const host = process.env.HOST?.trim() || "0.0.0.0";
const staticRoot = resolve(process.env.STATIC_ROOT ?? "dist");
const testerPromotionUrl = process.env.TESTER_PROMOTION_URL?.trim() || "https://aethonbeacon.com/join-testers-20260715.html?v=20260715-2315";
const testerRequestNotifyEmail = process.env.TESTER_REQUEST_NOTIFY_EMAIL?.trim() || "slathiarimple567@gmail.com";
const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim() || "";
const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() || testerRequestNotifyEmail;
const sendgridFromName = process.env.SENDGRID_FROM_NAME?.trim() || "Aethon Beacon";
const testerRequestsLogPath = process.env.TESTER_REQUESTS_LOG_PATH?.trim() || "/tmp/aethon-tester-requests.ndjson";
const googleTesterGroupEmail = process.env.GOOGLE_TESTER_GROUP_EMAIL?.trim() || "";
const googleGroupServiceAccountJson = process.env.GOOGLE_GROUP_SERVICE_ACCOUNT_JSON?.trim() || "";
const googleWorkspaceSubject = process.env.GOOGLE_WORKSPACE_SUBJECT?.trim() || "";
const appstoreApiKeyId = process.env.APPSTORE_API_KEY_ID?.trim() || "";
const appstoreApiIssuerId = process.env.APPSTORE_API_ISSUER_ID?.trim() || "";
const appstoreApiKeyP8 = process.env.APPSTORE_API_KEY_P8?.trim() || "";
const appstoreBetaGroupId = process.env.APPSTORE_BETA_GROUP_ID?.trim() || "";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".txt", "text/plain; charset=utf-8"]
]);

function contentTypeFor(filePath) {
  return mimeTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function cacheHeadersFor(filePath) {
  if (filePath.endsWith(".html")) {
    return {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    };
  }

  return {
    "Cache-Control": "public, max-age=31536000, immutable"
  };
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req, maxBytes = 16384) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function cleanField(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

function buildTesterRequestPayload(input, req) {
  const platform = cleanField(input.platform, 80) || "Unknown";
  const email = cleanField(input.email, 160).toLowerCase();
  const name = cleanField(input.name, 120);
  const device = cleanField(input.device, 180);
  const feedback = cleanField(input.feedback, 1500);
  const source = cleanField(input.source, 240) || "https://aethonbeacon.com/testers";
  return {
    id: `atr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    platform,
    email,
    name,
    device,
    feedback,
    source,
    userAgent: cleanField(req.headers["user-agent"], 240),
    ipHint: cleanField(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress, 120)
  };
}

function testerRequestEmailBody(payload) {
  return [
    "Please process this Aethon Beacon tester request.",
    "",
    `Request ID: ${payload.id}`,
    `Created: ${payload.createdAt}`,
    `Platform: ${payload.platform}`,
    `Email to add: ${payload.email}`,
    `Name: ${payload.name || "(not entered)"}`,
    `Device / OS: ${payload.device || "(not entered)"}`,
    "",
    `Feedback / testimony / issue: ${payload.feedback || "(not entered)"}`,
    "",
    `Source: ${payload.source}`,
    `User agent: ${payload.userAgent || "(not captured)"}`,
    "",
    "Android: join the Google Group aethon-beacon-android-testers@googlegroups.com, then use the Play opt-in link.",
    "iOS: add Apple ID email to TestFlight / App Store Connect beta group."
  ].join("\n");
}


function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(value) {
  const trimmed = String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (trimmed.includes("-----BEGIN")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) return decoded;
  } catch {
    // Fall through to raw value.
  }
  return trimmed.replace(/\\n/g, "\n");
}

function signJwt({ header, payload, privateKey, algorithm = "RSA-SHA256" }) {
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = createSign(algorithm);
  signer.update(signingInput);
  signer.end();
  const signature = signer
    .sign(privateKey)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signingInput}.${signature}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.errors?.[0]?.detail || data?.error_description || data?.error?.message || data?.message || text || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function getGoogleAccessToken() {
  if (!googleGroupServiceAccountJson || !googleTesterGroupEmail) {
    return null;
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(googleGroupServiceAccountJson);
  } catch {
    throw new Error("GOOGLE_GROUP_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("GOOGLE_GROUP_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/admin.directory.group.member",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  if (googleWorkspaceSubject) {
    payload.sub = googleWorkspaceSubject;
  }
  const assertion = signJwt({
    header: { alg: "RS256", typ: "JWT" },
    payload,
    privateKey: normalizePrivateKey(serviceAccount.private_key),
    algorithm: "RSA-SHA256"
  });
  const tokenData = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  return tokenData.access_token;
}

async function addAndroidTesterToGoogleGroup(email) {
  if (!googleTesterGroupEmail || !googleGroupServiceAccountJson) {
    return { attempted: false, success: false, reason: "google_group_not_configured" };
  }
  const token = await getGoogleAccessToken();
  if (!token) {
    return { attempted: false, success: false, reason: "google_token_not_available" };
  }
  try {
    await fetchJson(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(googleTesterGroupEmail)}/members`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, role: "MEMBER" })
    });
    return { attempted: true, success: true, target: googleTesterGroupEmail };
  } catch (error) {
    const alreadyMember = error.status === 409;
    if (alreadyMember) {
      return { attempted: true, success: true, target: googleTesterGroupEmail, alreadyMember: true };
    }
    return { attempted: true, success: false, reason: "google_group_add_failed", detail: cleanField(error.message, 240) };
  }
}

function getAppStoreConnectToken() {
  if (!appstoreApiKeyId || !appstoreApiIssuerId || !appstoreApiKeyP8 || !appstoreBetaGroupId) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    header: { alg: "ES256", kid: appstoreApiKeyId, typ: "JWT" },
    payload: {
      iss: appstoreApiIssuerId,
      iat: now,
      exp: now + 20 * 60,
      aud: "appstoreconnect-v1"
    },
    privateKey: normalizePrivateKey(appstoreApiKeyP8),
    algorithm: "SHA256"
  });
}

async function findAppStoreBetaTesterId(token, email) {
  const data = await fetchJson(`https://api.appstoreconnect.apple.com/v1/betaTesters?filter[email]=${encodeURIComponent(email)}&limit=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data?.data?.[0]?.id ?? null;
}

async function createAppStoreBetaTester(token, payload) {
  const names = (payload.name || "").split(/\s+/).filter(Boolean);
  const firstName = names[0] || "Aethon";
  const lastName = names.slice(1).join(" ") || "Tester";
  const data = await fetchJson("https://api.appstoreconnect.apple.com/v1/betaTesters", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        type: "betaTesters",
        attributes: { email: payload.email, firstName, lastName }
      }
    })
  });
  return data?.data?.id;
}

async function addBetaTesterToGroup(token, testerId) {
  await fetchJson(`https://api.appstoreconnect.apple.com/v1/betaGroups/${encodeURIComponent(appstoreBetaGroupId)}/relationships/betaTesters`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [{ type: "betaTesters", id: testerId }] })
  });
}

async function addIosTesterToTestFlight(payload) {
  if (!appstoreApiKeyId || !appstoreApiIssuerId || !appstoreApiKeyP8 || !appstoreBetaGroupId) {
    return { attempted: false, success: false, reason: "appstore_connect_not_configured" };
  }
  try {
    const token = getAppStoreConnectToken();
    let testerId = await findAppStoreBetaTesterId(token, payload.email);
    if (!testerId) {
      testerId = await createAppStoreBetaTester(token, payload);
    }
    await addBetaTesterToGroup(token, testerId);
    return { attempted: true, success: true, betaGroupId: appstoreBetaGroupId, testerId };
  } catch (error) {
    const alreadyInGroup = error.status === 409;
    if (alreadyInGroup) {
      return { attempted: true, success: true, betaGroupId: appstoreBetaGroupId, alreadyInGroup: true };
    }
    return { attempted: true, success: false, reason: "testflight_add_failed", detail: cleanField(error.message, 240) };
  }
}

async function autoProvisionTester(payload) {
  const platform = payload.platform.toLowerCase();
  if (platform.includes("android")) {
    return { android: await addAndroidTesterToGoogleGroup(payload.email) };
  }
  if (platform.includes("ios") || platform.includes("testflight")) {
    return { ios: await addIosTesterToTestFlight(payload) };
  }
  return { skipped: true, reason: "feedback_only" };
}

async function appendTesterRequestLog(payload) {
  try {
    await mkdir(new URL(".", `file://${testerRequestsLogPath}`).pathname, { recursive: true });
  } catch {
    // /tmp exists in production; ignore directory creation failures and try append.
  }
  await appendFile(testerRequestsLogPath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function sendTesterRequestEmail(payload) {
  if (!sendgridApiKey || !sendgridFromEmail || !testerRequestNotifyEmail) {
    return { sent: false, reason: "email_not_configured" };
  }
  const subject = `Aethon Beacon ${payload.platform} access/testify request`;
  const body = testerRequestEmailBody(payload);
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: testerRequestNotifyEmail }] }],
      from: { email: sendgridFromEmail, name: sendgridFromName },
      subject,
      content: [{ type: "text/plain", value: body }]
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SendGrid failed: ${response.status} ${detail.slice(0, 300)}`);
  }
  return { sent: true };
}

async function handleTesterRequest(req, res) {
  try {
    const raw = await readRequestBody(req);
    const input = JSON.parse(raw || "{}");
    const payload = buildTesterRequestPayload(input, req);
    if (!isLikelyEmail(payload.email)) {
      json(res, 400, { ok: false, message: "Please enter a valid email address." });
      return;
    }
    await appendTesterRequestLog(payload).catch((error) => {
      console.error("tester request log failed", error);
    });
    let provisioning = { skipped: true, reason: "not_attempted" };
    try {
      provisioning = await autoProvisionTester(payload);
    } catch (error) {
      console.error("tester auto provisioning failed", error);
      provisioning = { success: false, reason: "auto_provision_failed", detail: cleanField(error.message, 240) };
    }
    let emailResult = { sent: false, reason: "email_not_configured" };
    try {
      emailResult = await sendTesterRequestEmail(payload);
    } catch (error) {
      console.error("tester request email failed", error);
      emailResult = { sent: false, reason: "email_failed" };
    }
    json(res, 200, {
      ok: true,
      id: payload.id,
      emailSent: emailResult.sent,
      provisioning,
      message: emailResult.sent
        ? "Request received and emailed."
        : "Request received. If email does not open, use the fallback copy shown on the page.",
      mailto: `mailto:${testerRequestNotifyEmail}?subject=${encodeURIComponent(`Aethon Beacon ${payload.platform} access/testify request`)}&body=${encodeURIComponent(testerRequestEmailBody(payload))}`
    });
  } catch (error) {
    console.error("tester request failed", error);
    json(res, 500, { ok: false, message: "Could not submit tester request. Please use the email fallback." });
  }
}

async function readStaticFile(filePath) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error("Not a file.");
  }
  return readFile(filePath);
}

function safePathname(urlPath) {
  if (urlPath === "/") return "/index.html";
  const cleaned = urlPath.split("?")[0].split("#")[0];
  return cleaned.endsWith("/") ? `${cleaned}index.html` : cleaned;
}

async function resolveAsset(urlPath) {
  const normalized = safePathname(urlPath);
  const candidate = resolve(staticRoot, `.${normalized}`);
  const relative = candidate.startsWith(`${staticRoot}${sep}`) || candidate === staticRoot ? candidate : null;
  if (!relative) {
    return null;
  }
  try {
    return { filePath: candidate, body: await readStaticFile(candidate) };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    json(res, 400, { message: "Missing URL." });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/tester-request") {
    if (req.method !== "POST") {
      res.writeHead(405, {
        Allow: "POST",
        "Content-Type": "application/json; charset=utf-8"
      });
      res.end(JSON.stringify({ message: "Method not allowed." }));
      return;
    }
    await handleTesterRequest(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, {
      Allow: "GET,HEAD",
      "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify({ message: "Method not allowed." }));
    return;
  }

  if (url.pathname === "/testers" || url.pathname === "/testers.html") {
    res.writeHead(302, {
      Location: testerPromotionUrl,
      "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Clear-Site-Data": "\"cache\", \"storage\"",
      "Vary": "*",
      "X-Robots-Tag": "noarchive",
      "Content-Type": "text/plain; charset=utf-8"
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(`Redirecting to ${testerPromotionUrl}`);
    return;
  }

  const directAsset = await resolveAsset(url.pathname);
  const asset = directAsset ?? (url.pathname.includes(".") ? null : await resolveAsset("/index.html"));

  if (!asset) {
    json(res, 404, { message: "Not found." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentTypeFor(asset.filePath),
    ...cacheHeadersFor(asset.filePath)
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(asset.body);
});

server.listen(port, host, () => {
  console.log(`Aethon Beacon static web server listening on http://${host}:${port}`);
  console.log(`Serving ${staticRoot}`);
});
