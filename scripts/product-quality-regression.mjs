import fs from "node:fs";

const source = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const quality = fs.readFileSync(new URL("../product-quality.ts", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

[
  "PRIMARY_PRODUCT_DESTINATIONS",
  "VEDIC_CALCULATION_STANDARD",
  "classifyCounsellingSafety",
  "COUNSELLING_SAFETY_COPY",
  "REDRESS_CONTENT_STANDARD",
  "getRedressReviewState",
  "LocalProductMetric",
  "summarizeLocalProductMetrics",
  "ETHICAL_ACCESS_MODEL",
  "BETA_DEVICE_MATRIX",
  "evaluateBetaRelease"
].forEach((marker) => assert(quality.includes(marker), `Missing product-quality control: ${marker}`));

assert(source.includes('"today",\n      "aihelp",\n      "vedic",\n      "tones",\n      "community",\n      "redress"'), "Primary navigation is not simplified.");
assert(!source.includes('"today",\n      "aihelp",\n      "guide",\n      "redress",\n      "search"'), "Legacy crowded primary navigation remains.");
assert(source.includes('productAnalyticsEnabled={productAnalyticsEnabled}'), "Local analytics consent is not wired into Settings.");
assert(source.includes('Delete my local data'), "Settings must include a clear local-data deletion control.");
assert(source.includes('Export my notes'), "Settings must include a clear notes export control.");
assert(source.includes('Phone and email are used only for verification'), "Privacy copy must explain phone/email verification purpose.");
assert(source.includes('Voice and microphone access are optional') || source.includes('voice and microphone access are optional'), "Privacy copy must explain voice/microphone purpose.");
assert(source.includes('deliveryStatus: "failed"'), "Community failure delivery state is not implemented.");
assert(source.includes('deliveryStatus: "delivered"'), "Community delivered state is not implemented.");
assert(source.includes('COMMUNITY_POST_COOLDOWN_MS') && source.includes('communityPostCooldownRemainingMs'), "Community post anti-flood cooldown is missing.");
assert(source.includes('getRedressReviewState()'), "Redress review expiry is not enforced in the UI.");
assert(source.includes('function exportComplaintLetterPdf') && source.includes('Print.printAsync'), "Complaint-letter PDF export is missing.");
assert(source.includes('Save PDF'), "Save-as-PDF button is not rendered on the complaint letter.");
assert(source.includes('COUNSELLING_SAFETY_COPY[classifyCounsellingSafety(initialIssue)]'), "Counselling safety triage is not rendered.");
assert(source.includes('VEDIC_CALCULATION_STANDARD.zodiac'), "Vedic methodology is not rendered.");

// ── Crisis lifeline safeguard ───────────────────────────────────────────────
// A self-directed safety signal (self-harm / suicidal ideation) must lead with
// verified lifelines, never a conversational reply or a complaint flow.
assert(source.includes('const CRISIS_HELPLINES'), "Verified crisis helpline list is missing.");
assert(source.includes('Tele-MANAS') && source.includes('14416'), "Tele-MANAS lifeline (14416) is missing from crisis helplines.");
assert(source.includes('1800-599-0019'), "KIRAN lifeline (1800-599-0019) is missing from crisis helplines.");
assert(source.includes('function CrisisSupportModal'), "CrisisSupportModal component is missing.");
assert(source.includes('setCrisisSupportVisible(true)'), "Urgent self-harm route does not open the crisis support overlay.");
assert(/if \(route === "urgent"\) \{[\s\S]*?setCrisisSupportVisible\(true\)/.test(source), "Urgent route is not wired to the crisis overlay in the submit handler.");

// ── Mood understanding: positive and negative, actually used ────────────────
// A mood tag the user tapped in Journal must be persisted and must actually
// change what the app says back -- not just get set as UI state and dropped.
assert(source.includes('mood?: string;'), "CheckInEntry is missing a mood field -- the Journal mood tag would be saved nowhere.");
assert(source.includes('function saveCheckIn(mood?: string | null)'), "saveCheckIn does not accept the selected mood.");
assert(source.includes('saveCheckIn(selectedMood)'), "Journal's save action does not pass the selected mood through to saveCheckIn.");
assert(source.includes('...(mood ? { mood } : {})'), "saveCheckIn does not persist the mood onto the saved CheckInEntry.");

const moodTagsBlock = source.match(/const MOOD_TAGS = \[([\s\S]*?)\];/);
assert(moodTagsBlock, "MOOD_TAGS list not found");
const moodLabels = [...moodTagsBlock[1].matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
assert(moodLabels.length >= 18, `MOOD_TAGS should cover a real spectrum (>=18 moods); found ${moodLabels.length}`);
const POSITIVE_MOODS = ["Grateful", "Happy", "Calm", "Motivated", "Proud", "Hopeful", "Excited", "Content", "Relieved"];
const NEGATIVE_MOODS = ["Frustrated", "Anxious", "Sad", "Overwhelmed", "Angry", "Lonely", "Hurt", "Scared", "Numb"];
for (const label of [...POSITIVE_MOODS, ...NEGATIVE_MOODS]) {
  assert(moodLabels.includes(label), `MOOD_TAGS is missing "${label}" -- mood coverage must include a real range of both positive and negative moods.`);
}

// Every mood tag must have its own differentiated reply -- not a shared
// generic line -- so the app actually "replies accordingly" per mood.
const moodResponseBlock = source.match(/const JOURNAL_MOOD_RESPONSES: Record<string, string> = \{([\s\S]*?)\n\};/);
assert(moodResponseBlock, "JOURNAL_MOOD_RESPONSES not found");
for (const label of moodLabels) {
  assert(new RegExp(`\\n  ${label}: "`).test(moodResponseBlock[0]) || moodResponseBlock[1].includes(`${label}: "`), `JOURNAL_MOOD_RESPONSES is missing a differentiated reply for "${label}"`);
}
assert(source.includes('latestEntry.mood ? JOURNAL_MOOD_RESPONSES[latestEntry.mood] : null'), "getJournalInsight does not actually use the saved mood to shape its reply.");

// The Automatic Counselling positive check-in must also differentiate by
// specific emotion (grateful vs proud vs calm, etc.), not return one
// identical sentence for every positive message.
assert(source.includes('function buildPositiveCheckInReply'), "Differentiated positive check-in reply builder is missing.");
assert(source.includes('return buildPositiveCheckInReply(t);'), "Positive check-in branch does not use the differentiated reply builder.");
const positiveReplyBranches = (source.match(/if \(\/\([^)]*\)\/\.test\(n\)\) \{\s*\n\s*return \{\s*\n\s*heard:/g) ?? []).length;
assert(positiveReplyBranches >= 5, `buildPositiveCheckInReply should differentiate at least 5 distinct positive-emotion categories; found ${positiveReplyBranches}`);

assert(!source.includes('Public release still waits on provider-backed SMS and email verification'), 'Release readiness copy must not say OTP providers are still missing once remote verification is supported');
assert(source.includes('connected for SMS and email OTP'), 'Release readiness must clearly show provider-backed OTP when remote verification is active');
assert(source.includes('local fallback only for this build'), 'Release readiness must clearly distinguish local fallback verification builds');

// ── Apple-premium polish contract from the August 9 product pass ────────────
// Home stays simple, with five primary destinations and no dense paragraph
// previews. Each card carries a short benefit and a clear action.
[
  'Premium command center',
  'Choose the right support in one tap.',
  'Private guided conversation with optional checkpoint next steps.',
  'Curated sound, breath timing, meditation, and body reset.',
  'Moon-chart based guidance with practical remedies.',
  'Emergency support, official routes, evidence, and templates.',
  'Verified support conversations when access is confirmed.',
  'Enter room',
  'Open calm',
  'View insight',
  'Get help',
  'Open messages'
].forEach((marker) => assert(source.includes(marker), `Missing simplified Home marker: ${marker}`));

// Counselling is the core guided room: 30-message depth, optional six-reply
// checkpoints, and user-owned next-step actions.
[
  'Guided support room',
  'What brings you here?',
  'Understanding your situation gently first',
  'COUNSELING_AUTO_SYNTHESIS_USER_RESPONSES = 30',
  'COUNSELING_NEXT_STEP_READY_USER_RESPONSES = 6',
  'Prepare next step now',
  'Save summary',
  'Continue later'
].forEach((marker) => assert(source.includes(marker), `Missing counselling polish marker: ${marker}`));

// Help and Redress remains a professional action hub: emergency first, then
// route selection, evidence, template, escalation, tracking and sharing.
[
  '🚨 SOS — 112',
  'Choose your complaint route',
  'Recommended path now',
  'Evidence checklist',
  'Complaint letter',
  'Escalation path',
  'Start tracking this complaint',
  'Share script ↗',
  'One route, one next step'
].forEach((marker) => assert(source.includes(marker), `Missing Help and Redress marker: ${marker}`));

// Calm / Tones must feel curated, not like a flat sound list.
[
  'Recommended for you today',
  'Curated tone library',
  'Sleep',
  'Anxiety reset',
  'Focus',
  'Emotional grounding',
  'Deep calm',
  'Breath timing',
  'Purpose:',
  'Duration:',
  'Headphones needed',
  'Headphones optional',
  'Intensity:'
].forEach((marker) => assert(source.includes(marker), `Missing Calm/Tones marker: ${marker}`));

// Vedic presentation hides internal machinery while preserving explainability.
[
  'Multi-dimensional Vedic Insight',
  'Key insight:',
  'Reason:',
  'Supporting chart factor:',
  'Practical remedy:',
  'Interpretation note:',
  'View calculation basis'
].forEach((marker) => assert(source.includes(marker), `Missing Vedic presentation marker: ${marker}`));

// Onboarding is a calm first minute: five choices, optional profile, and clear
// privacy reassurance instead of a wall of explanation.
[
  'Choose what you need today.',
  'automatic counselling engine',
  'Profile details are optional. You can enter the app now and add more later.',
  'Privacy first',
  'Skip for now',
  'Enter app'
].forEach((marker) => assert(source.includes(marker), `Missing onboarding/privacy marker: ${marker}`));

// Store and tester polish must remain visible in the web recruitment surface
// and launch readiness copy.
[
  'Become an Aethon Beacon tester',
  'TestFlight',
  'Android closed testing',
  'Store release readiness',
  'Crash/error monitoring'
].forEach((marker) => assert(source.includes(marker), `Missing tester/store polish marker: ${marker}`));

const hiddenNumberPhrase = ['48', ' dimension'].join('');
assert(!source.includes(hiddenNumberPhrase), 'Public internal numeric capability wording must stay hidden.');
const hiddenProviderPattern = new RegExp(`\\b(?:${['A', 'I'].join('')}|${['Gemi', 'ni'].join('')})\\b`, 'i');
assert(!hiddenProviderPattern.test(source), 'Public provider/model terminology must stay hidden.');

console.log("Product quality regression passed: focused navigation, calculation transparency, counselling safeguards, crisis lifelines, redress governance, local metrics, ethical access, beta coverage standards, and mood understanding (positive + negative, persisted and differentiated) are present.");
