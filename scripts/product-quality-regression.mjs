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
// Home stays simple: emergency access remains a separate priority strip and
// Start Here contains four non-duplicated destinations. Counselling is the
// primary card; each entry carries a short benefit and clear action.
[
  'Premium command center',
  'Choose the right support in one tap.',
  'A private guided room with a 30-message arc and optional next-step checkpoints.',
  'Curated sound, breath timing, meditation, and body reset.',
  'Moon-chart based guidance with practical remedies.',
  'Verified support conversations when access is confirmed.',
  'Start counselling',
  'Open calm',
  'View insight',
  'Open messages'
].forEach((marker) => assert(source.includes(marker), `Missing simplified Home marker: ${marker}`));
assert(!source.includes('title: "Help and Redress",\n                body:'), 'Help and Redress must not be duplicated inside Start Here.');

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
  'Emergency first',
  'Choose your situation',
  'Your route',
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

// Onboarding is a calm first minute: four primary choices, a separate
// always-available safety route, optional profile, and clear privacy assurance.
[
  'Choose what you need today.',
  'automatic counselling engine',
  'Help and Redress is always available',
  'Profile details are optional. You can enter the app now and add more later.',
  'Privacy first',
  'Skip for now',
  'Enter app'
].forEach((marker) => assert(source.includes(marker), `Missing onboarding/privacy marker: ${marker}`));

// Counselling opens on the prompt entry rather than a text-heavy summary and
// the Action Plan keeps all supporting sections coordinated around one issue.
[
  'Enter what you would like help with…',
  'Start counselling',
  'A private two-way conversation will begin immediately',
  'function buildCounselingCoreProbe',
  'Your coordinated plan',
  'Your next-step plan',
  'Practice now',
  'Continue without losing context',
  'Safety remains available at every step',
  'View full reasoning'
].forEach((marker) => assert(source.includes(marker), `Missing coordinated counselling/action-plan marker: ${marker}`));
assert(!source.includes('id: "complaint",\n    label: "Help and Redress"'), 'Help and Redress must remain outside the onboarding choice grid.');

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

// ── The local-only promise must actually hold ────────────────────────────────
// Settings offers a "Local-only journal" switch whose meta reads "Data stays
// on this device". The connected daily-brief fetch ignored it and POSTed the
// first 150 characters of the most recent journal entry on every launch and
// after every check-in -- and then discarded the reply, so that data left the
// device in exchange for nothing.
const briefEffect = source.slice(
  source.indexOf("Connected Daily Brief"),
  source.indexOf("Connected Daily Brief") + 2600
);
assert(
  /if \(localOnly\) \{/.test(briefEffect),
  "the connected daily-brief fetch must return early in local-only mode -- Settings promises the journal stays on the device"
);
assert(
  !/lastNote/.test(briefEffect),
  "the daily-brief payload must not carry raw journal text; the brief is built from aggregates (streak, focus, scores, Rashi)"
);
assert(
  source.includes("guidanceDailyBrief ?? motivations["),
  "the connected brief must actually be rendered -- data should never leave the device for a result nothing reads"
);
assert(
  !source.includes("const smartBrief = useMemo"),
  "the dead smartBrief memo must not come back: it computed a greeting card that was never mounted, on every render"
);

// Every path that ships journal text off the device must sit behind the same
// switch. Scanned with comments stripped, so a comment merely *mentioning*
// localOnly cannot satisfy the check -- only real guard code can. Structural
// rather than a fixed list, so an endpoint added later is caught too.
const codeOnly = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

const guidanceFetches = [...codeOnly.matchAll(/fetch\(`\$\{[A-Za-z]+\}(\/guidance\/[a-z-]+)`/g)]
  .map((m) => ({ endpoint: m[1], at: m.index ?? 0 }));
assert(guidanceFetches.length >= 3, `expected to find the connected guidance endpoints, found ${guidanceFetches.length}`);

let notesCarrying = 0;
for (const { endpoint, at } of guidanceFetches) {
  // Scope to the enclosing handler rather than a fixed character window. A
  // symmetric +/-2200 window will happily accept a localOnly guard that
  // belongs to a completely different function further up the file, which
  // would let a new leaking endpoint pass by sitting near an old safe one.
  // Walk back to the nearest scope opener instead.
  const openers = [...codeOnly.slice(0, at).matchAll(/\basync function |\bfunction |useEffect\(|onFetch=\{|onPress=\{/g)];
  const scopeStart = openers.length ? openers[openers.length - 1].index : 0;
  const scope = codeOnly.slice(scopeStart, at + 1400);
  if (!/\bnote\b|recentNotes|lastNote/.test(scope)) continue;
  notesCarrying += 1;
  assert(
    /if \(localOnly\)|!localOnly &&/.test(scope),
    `${endpoint} sends journal text with no localOnly guard in its own handler -- Settings promises "Data stays on this device"`
  );
}
assert(notesCarrying >= 1, `expected at least one journal-carrying guidance endpoint to be checked, saw ${notesCarrying}`);

// /guidance/journal is gone, not merely gated. It POSTed the whole entry on
// every check-in and stored the reply somewhere nothing read. If it comes
// back it needs a UI and a fresh decision about sending journal text at all.
assert(
  !codeOnly.includes("/guidance/journal"),
  "the /guidance/journal round trip was removed because it sent the full entry and discarded the reply -- reinstating it needs somewhere for the insight to appear"
);
assert(
  !codeOnly.includes("guidanceJournalInsight"),
  "guidanceJournalInsight held the discarded reply; it should not return without a render site"
);

// The user should learn the trade-off before tapping, not after.
assert(
  source.includes("Local-only journal is on, so this reading is unavailable"),
  "the pattern-reading card must explain up front why it is unavailable in local-only mode, rather than failing silently on tap"
);

// ── The startup prompt must never trap anyone ────────────────────────────────
// It auto-opens on launch whenever the profile is incomplete, and it used to
// disable its own close button for ten seconds -- counting down "Exit 10s"
// while the header read "Startup prompt - 10s left". A modal with no way out
// is an Apple HIG violation outright, and this is a mental-health app: the
// first screen a distressed person meets must not hold them.
{
  const codeOnly = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
  assert(
    !/setStartupAccessPromptDismissEnabled\(false\)/.test(codeOnly),
    "the startup access prompt must never disable its own dismissal -- a launch modal has to be closable from the first frame"
  );
  assert(
    !/setStartupAccessPromptDismissEnabled\(true\)[\s\S]{0,80}\}, \d+\)/.test(codeOnly),
    "dismissal of the startup prompt must not be gated behind a timer"
  );
}

// ── Counselling safety classifier -- behaviour ───────────────────────────────
// The classifier gates whether a distressed message gets an automated reply
// or a crisis screen. Its predecessor caught 2 of 16 real phrasings -- it
// matched the clinical vocabulary and missed the way people actually type in
// distress. This is a mental-health app; a false negative here is not a UX
// bug, it is a person in a bad moment being answered by a breathing tip.
//
// So this is checked on OUTPUTS across a fixed corpus rather than by looking
// at the regex source, and it is required to run in the suite. Add cases;
// never remove them.
{
  const fs = await import("node:fs");
  const ts = await import("typescript");
  const src = fs.readFileSync("product-quality.ts", "utf8").replace(/export /g, "");
  const compiled = ts.transpileModule(src + "\nglobalThis.__c = classifyCounsellingSafety;",
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
  new Function("exports", "module", compiled)({}, {});
  const classify = globalThis.__c;

  const MUST_BE_IMMEDIATE = [
    "i just want it to stop",
    "i can't do this anymore",
    "everyone would be better off without me",
    "i've been thinking about not being here",
    "planning to take all the pills tonight",
    "cutting myself again",
    "can't stop thinking about death",
    "want to disappear",
    "life is not worth living anymore",
    "no reason to keep going",
    "nobody would miss me",
    "i've been thinking about ending it",
    "want to die",
    "there is no point in going on"
  ];
  const MUST_BE_URGENT_OR_HIGHER = [
    "he hits me when he drinks",
    "my husband won't let me leave",
    "i haven't slept properly for weeks",
    "voices are telling me things",
    "i drink to sleep every night",
    "they're watching me all the time",
    "can't stop drinking",
    // Negated forms of the immediate stems still deserve a human, just not
    // an emergency screen -- they are DISCLOSURES.
    "i'm not thinking about hurting myself",
    "i don't want to die, i just want help"
  ];
  const MUST_STAY_SUPPORTED = [
    "work stress is getting to me",
    "having a rough week",
    "fighting with my sister a lot",
    "feeling stuck about my career"
  ];

  const missed = [];
  for (const t of MUST_BE_IMMEDIATE) if (classify(t) !== "immediate") missed.push(`should be immediate: "${t}" -> ${classify(t)}`);
  for (const t of MUST_BE_URGENT_OR_HIGHER) {
    const level = classify(t);
    if (level === "supported-self-care") missed.push(`should route to a human: "${t}" -> supported-self-care`);
  }
  for (const t of MUST_STAY_SUPPORTED) if (classify(t) !== "supported-self-care") missed.push(`should stay supported (over-triggering harms trust): "${t}" -> ${classify(t)}`);

  assert(
    missed.length === 0,
    `counselling safety classifier missed ${missed.length} case(s):\n  ${missed.join("\n  ")}`
  );
}

console.log("Product quality regression passed: focused navigation, calculation transparency, counselling safeguards, crisis lifelines, redress governance, local metrics, ethical access, beta coverage standards, and mood understanding (positive + negative, persisted and differentiated) are present.");
