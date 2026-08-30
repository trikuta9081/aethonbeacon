import fs from "node:fs";

const root = new URL("../", import.meta.url);

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, root), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const appConfig = JSON.parse(read("app.json"));
const expo = appConfig.expo ?? {};
const appVersion = String(expo.version ?? "").trim();
const runtimeVersion = String(expo.runtimeVersion ?? "").trim();
const privacyPolicyUrl = String(expo.extra?.privacyPolicyUrl ?? "").trim();
const supportEmail = String(expo.extra?.supportEmail ?? "").trim();
const publisher = String(expo.owner ?? "").trim();

assert(appVersion.length > 0, "app.json is missing expo.version.");
assert(runtimeVersion === appVersion, `runtimeVersion (${runtimeVersion}) must match app version (${appVersion}).`);

let parsedPrivacyUrl;
try {
  parsedPrivacyUrl = new URL(privacyPolicyUrl);
} catch {
  throw new Error("app.json extra.privacyPolicyUrl must be an absolute URL.");
}
assert(parsedPrivacyUrl.protocol === "https:", "Privacy policy URL must use HTTPS.");
assert(parsedPrivacyUrl.pathname.endsWith("/privacy-policy.html"), "Privacy policy URL must point to privacy-policy.html.");

assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail), "app.json extra.supportEmail must be a valid email address.");
assert(publisher.length > 0, "app.json owner must identify the configured publisher.");

for (const requiredFile of ["privacy-policy.html", "public/privacy-policy.html"]) {
  assert(fs.existsSync(new URL(requiredFile, root)), `Missing privacy policy artifact: ${requiredFile}.`);
}

const privacyDoc = read("docs/PRIVACY_AND_COMPLIANCE.md");
const storeListing = read("docs/STORE_LISTING.md");
const hostedPolicy = read("public/privacy-policy.html");
const unresolvedPlaceholder = /\[(?:LEGAL ENTITY[^\]]*|SUPPORT EMAIL)\]/i;

assert(!unresolvedPlaceholder.test(privacyDoc), "Privacy compliance document still contains a publisher/support placeholder.");
assert(privacyDoc.includes(supportEmail), "Privacy compliance document must use the configured support email.");
assert(storeListing.includes(privacyPolicyUrl), "Store listing must contain the configured privacy policy URL.");
assert(storeListing.includes(supportEmail), "Store listing must contain the configured support email.");
assert(hostedPolicy.includes(supportEmail), "Hosted privacy policy must contain the configured support email.");
assert(hostedPolicy.toLowerCase().includes(`published by ${publisher.toLowerCase()}`), "Hosted privacy policy must identify the configured publisher.");

console.log(JSON.stringify({
  ok: true,
  appVersion,
  runtimeVersion,
  privacyPolicyUrl,
  publisher,
  supportEmail,
  privacyArtifacts: ["privacy-policy.html", "public/privacy-policy.html"]
}, null, 2));
