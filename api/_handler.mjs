import { handleRequest, requestContext, resolveCorsOrigin } from "../scripts/verification-server.mjs";

export function handleApiRequest(req, res) {
  const originalUrl = req.url ?? "/";
  req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";

  return requestContext.run({ corsOrigin: resolveCorsOrigin(req) }, async () => {
    try {
      await handleRequest(req, res);
    } finally {
      req.url = originalUrl;
    }
  });
}
