import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { readFile, stat } from "node:fs/promises";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const port = parsePositiveInt(process.env.PORT, 3000);
const host = process.env.HOST?.trim() || "0.0.0.0";
const staticRoot = resolve(process.env.STATIC_ROOT ?? "dist");
const testerPromotionUrl = process.env.TESTER_PROMOTION_URL?.trim() || "https://aethon-beacon-testers.trikuta9081.chatgpt.site/?v=20260715-0245";

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

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, {
      Allow: "GET,HEAD",
      "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify({ message: "Method not allowed." }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/testers" || url.pathname === "/testers.html") {
    res.writeHead(302, {
      Location: testerPromotionUrl,
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
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
