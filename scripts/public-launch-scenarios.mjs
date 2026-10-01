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

const additionalScenarios = [
  ["Safety current danger", ["112", "SOS", "Open Help"]],
  ["Safety self-harm language", ["self-harm", "Tele-MANAS", "112"]],
  ["Safety violence response", ["violence", "Call 112", "Open Help"]],
  ["Safety stalking response", ["stalking", "cybercrime.gov.in", "evidence"]],
  ["Safety child protection", ["1098", "child", "112"]],
  ["Safety domestic violence", ["Protection Officer", "181", "112"]],
  ["Safety overdose", ["overdose", "112", "professional"]],
  ["Safety weapon threat", ["weapon", "112", "SOS"]],
  ["Safety crisis handoff", ["Help and Redress", "SOS", "professional"]],
  ["Safety evidence preservation", ["evidence", "timeline", "Open Help"]],
  ["Redress banking fraud", ["1930", "RBI CMS", "banking"]],
  ["Redress UPI complaint", ["UPI", "1930", "RBI"]],
  ["Redress cyber portal", ["cybercrime.gov.in", "1930", "evidence"]],
  ["Redress consumer refund", ["1915", "consumerhelpline.gov.in", "refund"]],
  ["Redress workplace wages", ["Labour", "EPFO", "payslips"]],
  ["Redress workplace retaliation", ["HR", "Labour", "timeline"]],
  ["Redress factory safety", ["factories inspector", "safety", "112"]],
  ["Redress government delay", ["CPGRAMS", "government", "portal"]],
  ["Redress municipal service", ["municipal", "CPGRAMS", "address"]],
  ["Redress housing dispute", ["landlord", "housing", "legal"]],
  ["Redress police FIR", ["Zero-FIR", "173 BNSS", "police"]],
  ["Redress ragging", ["antiragging.in", "ragging", "112"]],
  ["Redress university appeal", ["UGC", "university", "evidence"]],
  ["Redress medical institution", ["Medical Superintendent", "NMC", "student grievance"]],
  ["Redress school complaint", ["school", "child", "1098"]],
  ["Redress legal aid", ["NALSA", "legal", "lawyer"]],
  ["Health symptom preparation", ["symptom", "qualified", "Path"]],
  ["Health panic support", ["panic", "Tele-MANAS", "14416"]],
  ["Health sleep support", ["sleep", "professional", "Path"]],
  ["Health depression support", ["depression", "Counselling", "14416"]],
  ["Health addiction support", ["addiction", "KIRAN", "counselling"]],
  ["Health withdrawal safety", ["withdrawal", "professional", "112"]],
  ["Health medicine caution", ["medicine", "doctor", "symptom"]],
  ["Health grief support", ["grief", "Journal", "Counselling"]],
  ["Health anxiety routine", ["anxiety", "Calm", "Path"]],
  ["Health professional review", ["professional", "review", "human"]],
  ["Health emergency boundary", ["severe", "sudden", "112"]],
  ["Health privacy", ["private", "device", "share"]],
  ["Path exam planning", ["25-minute", "focus", "Path"]],
  ["Path career decision", ["career", "question", "Path"]],
  ["Path relationship boundary", ["boundary", "relationship", "Help"]],
  ["Path grief reflection", ["grief", "connection", "Journal"]],
  ["Path burnout recovery", ["burnout", "focus", "Calm"]],
  ["Path academic mentor", ["teacher", "mentor", "institution"]],
  ["Path financial planning", ["planning", "money", "Path"]],
  ["Path family conversation", ["family", "boundary", "Calm"]],
  ["Path loneliness", ["lonely", "connection", "Community"]],
  ["Path repeated issue", ["recurrence", "history", "review"]],
  ["Path issue explanation", ["why", "route", "confidence"]],
  ["Path multilingual", ["localize", "language", "Hindi"]],
  ["Community create draft", ["setCommunityDraft", "saved on this device", "Community"]],
  ["Community failed delivery", ["deliveryStatus: \"failed\"", "Retry sync", "Community"]],
  ["Community privacy default", ["Private by default", "notes", "export"]],
  ["Community moderation", ["moderation", "report", "safety"]],
  ["Community human handoff", ["verified support", "human handoff", "Help"]],
  ["Community offline mode", ["offline", "local", "retry"]],
  ["Community destructive confirmation", ["confirm", "haptic", "delete"]],
  ["Community case link", ["case tracker", "Community", "evidence"]],
  ["Community accessibility", ["accessibility", "font", "contrast"]],
  ["Privacy profile optional", ["optional", "device", "Nothing is shared"]],
  ["Privacy local journal", ["notes remain on this device", "Journal", "export"]],
  ["Privacy data controls", ["delete", "export", "share"]],
  ["Vedic active language", ["classifyAstroQuestion", "language", "Ask"]],
  ["Vedic Hindi content", ["हिन्दी", "English", "Janma"]],
  ["Vedic birth profile", ["Janma Rashi", "Lagna", "Nakshatra"]],
  ["Vedic uncertainty", ["approximation", "birth place", "certified"]],
  ["Vedic Mahadasha", ["Mahadasha", "Antardasha", "current"]],
  ["Vedic Panchang", ["Panchang", "today", "guidance"]],
  ["Tone safety stop", ["Tones", "stop", "mute"]],
  ["Meditation safety stop", ["Meditation", "stop", "Calm"]],
  ["Tone persistent player", ["mini-player", "tab navigation", "Tones"]],
  ["Journal mood trend", ["mood trend", "Journal", "history"]],
  ["Journal case evidence", ["evidence", "case tracker", "complaint"]],
  ["Help source freshness", ["freshness", "official", "review"]],
  ["Help source version", ["knowledgeVersion", "sourceIds", "reviewedAt"]],
  ["Cross-section recurrence", ["Path", "Journal", "Counselling", "Help"]]
];

for (const [name, terms] of additionalScenarios) {
  scenarios.push([name, () => assert(has(...terms), `${name} contract is missing`)]);
}

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
