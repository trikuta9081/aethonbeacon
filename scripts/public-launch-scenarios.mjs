import fs from "node:fs";
import { localizeRedressRoute } from "../redressHindi.ts";
import { localizeInstitution } from "../institutionHindi.ts";

const root = new URL("..", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");
const app = read("App.tsx");
const redressCatalogStart = app.indexOf("const redressRoutes");
assert(redressCatalogStart >= 0, "redress catalog is missing");

const checks = [];
function pass(name, detail) {
  checks.push({ name, detail });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function has(...terms) {
  return terms.every((term) => app.includes(term));
}

function route(id) {
  const start = app.indexOf(`id: "${id}"`, redressCatalogStart);
  assert(start >= 0, `redress route ${id} is missing`);
  const next = app.indexOf("id: \"", start + 5);
  return app.slice(start, next < 0 ? start + 1800 : next);
}

function issue(id) {
  assert(app.includes(`id: "${id}"`), `issue guide ${id} is missing`);
}

function institution(id) {
  assert(app.includes(`id: "${id}"`), `institution sector ${id} is missing`);
}

function redressRoute(id, required = []) {
  const text = route(id);
  for (const term of required) assert(text.includes(term), `${id} route lacks ${term}`);
}

function routeFixture(id) {
  return {
    id,
    label: "Route",
    subtitle: "Subtitle",
    summary: "Summary",
    firstOffice: "First office",
    firstAction: "First action",
    escalation: "Escalation",
    keepReady: "Evidence",
    phone: "112",
    website: "https://example.gov.in",
    trackWebsite: "https://example.gov.in/track",
    urgentNote: "Call 112 if there is immediate danger."
  };
}

function institutionFixture(id) {
  return {
    id,
    label: "Institution",
    subtitle: "Institution subtitle",
    firstOffice: "First office",
    escalation: "Escalation",
    portal: "https://example.gov.in",
    portalLabel: "Official portal",
    evidence: "Evidence",
    immediateAction: "Immediate action",
    offices: ["Office one"],
    portals: [{ label: "Official portal", use: "Use this portal", url: "https://example.gov.in" }],
    documents: ["Document"],
    timeline: "Timeline",
    complaintLine: "Complaint",
    caution: "Caution",
    keywords: ["office"]
  };
}

function localizedChecks() {
  const hindiRoute = localizeRedressRoute(routeFixture("financial"), "hindi");
  assert(/[\u0900-\u097F]/u.test(hindiRoute.label), "Hindi redress label is not localized");
  const hindiInstitution = localizeInstitution(institutionFixture("university"), "hindi");
  assert(/[\u0900-\u097F]/u.test(hindiInstitution.label), "Hindi institution label is not localized");
  for (const language of ["telugu", "tamil", "urdu"]) {
    const localizedRoute = localizeRedressRoute(routeFixture("crime"), language);
    assert(localizedRoute.label !== "Route", `${language} redress label is not localized`);
    const localizedInstitution = localizeInstitution(institutionFixture("school"), language);
    assert(localizedInstitution.label !== "Institution", `${language} institution label is not localized`);
  }
}

const scenarios = [
  ["University marks or fee dispute", () => { issue("academic"); institution("university"); redressRoute("academic", ["UGC", "CPGRAMS"]); }],
  ["IIT ragging or hostel intimidation", () => { issue("academic"); institution("iit"); redressRoute("ragging", ["antiragging.in", "112"]); }],
  ["Medical college stipend or clinical posting", () => { institution("medical"); redressRoute("academic", ["student grievance"]); assert(has("Medical Superintendent", "NMC"), "medical escalation is missing"); }],
  ["School bullying or child safety", () => { institution("school"); redressRoute("harassment", ["112"]); assert(has("1098", "child"), "child-safety support is missing"); }],
  ["Bank UPI fraud", () => { institution("banking"); redressRoute("financial", ["RBI"]); assert(has("1930", "RBI CMS"), "bank fraud immediate action is missing"); }],
  ["Government certificate delay", () => { institution("government"); redressRoute("public", ["CPGRAMS"]); }],
  ["Private employer unpaid salary", () => { institution("private"); redressRoute("workplace", ["Labour", "EPFO"]); }],
  ["Factory unsafe working condition", () => { institution("factory"); redressRoute("workplace", ["112"]); assert(has("factories inspector", "safety"), "factory safety route is missing"); }],
  ["Assault or immediate threat", () => { redressRoute("crime", ["112", "police"]); assert(has("Zero-FIR", "173 BNSS"), "FIR guidance is missing"); }],
  ["Domestic violence", () => { redressRoute("domestic", ["181", "112", "Protection Officer"]); }],
  ["Cyber stalking or morphed image", () => { redressRoute("cybercrime", ["cybercrime.gov.in", "1930"]); }],
  ["Defective product or refund", () => { redressRoute("consumer", ["1915", "consumerhelpline.gov.in"]); }],
  ["Unclear general institutional complaint", () => { issue("general"); assert(has("More situations", "First office", "First offices to select"), "general route chooser is missing"); }],
  ["Anxiety or panic", () => { issue("anxiety"); assert(has("Tele-MANAS", "14416", "112"), "anxiety safety handoff is missing"); }],
  ["Grief and isolation", () => { issue("grief"); assert(has("14416", "Counselling", "Journal"), "grief support handoff is incomplete"); }],
  ["Academic burnout", () => { issue("burnout"); assert(has("Path", "Journal", "focus"), "burnout action handoff is incomplete"); }],
  ["Relationship coercion", () => { issue("relationship"); assert(has("domestic", "harassment", "safety"), "relationship safety routing is missing"); }],
  ["Addiction or withdrawal concern", () => { issue("addiction"); assert(has("112", "KIRAN", "counselling"), "addiction safety support is missing"); }],
  ["Hindi redress and institution journey", () => { localizedChecks(); assert(has("language", "localizeRedressRoute", "localizeInstitution"), "language handoff is missing"); }],
  ["Regional language redress journey", () => { localizedChecks(); assert(has("telugu", "tamil", "urdu"), "regional language catalog is missing"); }],
  ["Community send failure and retry", () => { assert(has('deliveryStatus: "failed"', "saved on this device", "Retry sync", "setCommunityDraft"), "community recovery contract is missing"); }],
  ["Vedic question in active language", () => { assert(has("classifyAstroQuestion", "Ask", "language"), "Vedic language-aware flow is missing"); }],
  ["Tone or meditation safety stop", () => { assert(has("Meditation", "stop", "tone", "calm"), "tone and meditation stop controls are missing"); }],
  ["Journal evidence to case tracker", () => { assert(has("case tracker", "evidence", "Journal", "complaint"), "evidence handoff is missing"); }]
];

for (const [name, test] of scenarios) {
  try {
    test();
    pass(name, "journey has a route, safety/escalation guidance, or a verified cross-section handoff");
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

console.log(`Public launch scenarios: ${checks.length}/${scenarios.length} passed`);
for (const check of checks) console.log(`PASS ${check.name}`);
if (process.exitCode) console.log("Some scenarios failed; this suite is intentionally fail-closed.");
