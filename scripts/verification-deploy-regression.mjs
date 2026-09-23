import fs from "node:fs";

const adapter = fs.readFileSync(new URL("../api/[...path].mjs", import.meta.url), "utf8");
const server = fs.readFileSync(new URL("./verification-server.mjs", import.meta.url), "utf8");
const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

if (!adapter.includes("replace(/^\\/api(?=\\/|$)/, \"\")")) {
  throw new Error("Vercel adapter must strip /api before routing to the shared verification server.");
}
if (!server.includes("export { handleRequest, requestContext, resolveCorsOrigin }")) {
  throw new Error("Verification server must expose the shared request handler to serverless hosting.");
}
if (vercel.functions?.["api/[...path].mjs"]?.maxDuration !== 30) {
  throw new Error("Vercel verification function must retain the 30-second provider timeout budget.");
}
if (adapter.includes("TWILIO_AUTH_TOKEN") || adapter.includes("SENDGRID_API_KEY")) {
  throw new Error("The serverless adapter must not embed provider secrets.");
}
for (const marker of ["api.openai.com/v1/responses", "api.anthropic.com/v1/messages", "x-goog-api-key"]) {
  if (!server.includes(marker)) throw new Error(`Guidance provider adapter is missing ${marker}.`);
}
if (!server.includes("runConfiguredGuidance") || !server.includes("independentEngine: true")) {
  throw new Error("Guidance must retain a provider chain and an independent local fallback.");
}

console.log("Verification serverless deployment checks: passed");
