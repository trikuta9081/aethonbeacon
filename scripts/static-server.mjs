import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { mkdir, readFile, stat, appendFile } from "node:fs/promises";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const port = parsePositiveInt(process.env.PORT, 3000);
const host = process.env.HOST?.trim() || "0.0.0.0";
const staticRoot = resolve(process.env.STATIC_ROOT ?? "dist");
const testerPromotionUrl = process.env.TESTER_PROMOTION_URL?.trim() || "https://aethonbeacon.com/join-testers-20260715.html?v=20260715-0315";
const testerRequestNotifyEmail = process.env.TESTER_REQUEST_NOTIFY_EMAIL?.trim() || "slathiarimple567@gmail.com";
const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim() || "";
const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() || testerRequestNotifyEmail;
const sendgridFromName = process.env.SENDGRID_FROM_NAME?.trim() || "Aethon Beacon";
const testerRequestsLogPath = process.env.TESTER_REQUESTS_LOG_PATH?.trim() || "/tmp/aethon-tester-requests.ndjson";

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
    "Android: add Gmail to Play Console tester list or connected Google Group.",
    "iOS: add Apple ID email to TestFlight / App Store Connect beta group."
  ].join("\n");
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
