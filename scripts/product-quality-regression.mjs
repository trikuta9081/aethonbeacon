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
assert(
  source.includes('getLocalizedCounsellingSafetyCopy(classifyCounsellingSafety(initialIssue), languageId)'),
  "Localized counselling safety triage is not rendered."
);
assert(source.includes('VEDIC_CALCULATION_STANDARD.zodiac'), "Vedic methodology is not rendered.");
assert(source.includes('हिन्दी') && source.includes('मार्गदर्शन के लिए हिंदी'), "Hindi language option must be native-labeled.");
assert(source.includes('label={uiCopy.languagePageVoiceAssistLabel}'), "Language page voice-assistance toggle is not localized.");
assert(source.includes('languagePageTitle: "ప్రాధాన్య భాష"') && source.includes('languagePageTitle: "விருப்ப மொழி"') && source.includes('languagePageTitle: "ترجیحی زبان"'), "Telugu/Tamil/Urdu language pages must have localized titles.");
assert(source.includes('makeLocalizedTextPicker(languageId, profileOnboardingTextCatalog)'), "Profile/onboarding text must use the shared multilingual picker.");
assert(source.includes('आपका आने वाला सप्ताह तैयार है') && source.includes('पढ़ें'), "Hindi Home hero and weekly banner must be localized.");
assert(source.includes('परामर्श शुरू करें') && source.includes('जारी रखें'), "Hindi Home support-card actions must be localized.");
assert(source.includes('एक पेज खोलें') && source.includes('सीधे जाने के लिए कोई पेज टैप करें।'), "Hindi section chooser must be localized.");
assert(source.includes('const HEADER_NAV_SHORT_LABEL_SOURCE'), "Top-rail short-label sources are not centralized.");
assert(source.includes('translateNavLabel(languageId, HEADER_NAV_SHORT_LABEL_SOURCE[tab.id] ?? tab.label)'), "Top-rail short labels must use the shared multilingual catalogue.");
assert(source.includes('Ask: "అడగండి"') && source.includes('Messages: "సందేశాలు"'), "Telugu top navigation must be fully localized.");
assert(source.includes('Ask: "கேளுங்கள்"') && source.includes('Messages: "செய்திகள்"'), "Tamil top navigation must be fully localized.");
assert(source.includes('Ask: "پوچھیں"') && source.includes('Messages: "پیغامات"'), "Urdu top navigation must be fully localized.");
assert(source.includes('పూర్తయ్యాక ← వెనుకకు నొక్కండి') && source.includes('முடித்ததும் ← பின்செல்') && source.includes('کام مکمل ہونے پر ← واپس'), "Primary-language page-mode guidance must not fall back to English.");
assert(source.includes('अगला कदम चुनें') && source.includes('विश्लेषण') && source.includes('विवरण →'), "Hindi route overlay and hero helper labels must be localized.");
assert(source.includes('accessibilityLabel={homeUiCopy.homeOpenProfileSettingsA11y}'), "Home profile chip accessibility label must be localized.");
assert(source.includes('accessibilityLabel={homeUiCopy.flowExitA11y}'), "Home Exit control accessibility label must be localized.");
assert(source.includes('{homeUiCopy.flowExit}'), "Home Exit button label must be localized.");
assert(source.includes('accessibilityLabel={homeUiCopy.closeSectionSwitcherA11y}'), "Section chooser close label must be localized.");
assert(source.includes('languageId={languageId}') && source.includes('<SupportDimensionLibraryPanel'), "Shared support panels should receive language context on localized screens.");

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
assert(/connected for SMS and email OTP/i.test(source), 'Profile verification status must clearly show provider-backed OTP when remote verification is active');
assert(/local fallback only for this build/i.test(source), 'Profile verification status must clearly distinguish local fallback verification builds');
assert(source.includes('showOneTimeProfileNudge={!featureNudgeDismissed}'), 'Profile essentials guidance must be a persisted one-time nudge');
assert(source.includes('Only the essentials'), 'Profile must explain which details are genuinely needed');
for (const internalTitle of ['Controlled beta standard', 'Launch status', 'Release readiness']) {
  assert(!source.includes(`>{t("${internalTitle}"`), `${internalTitle} must not appear as user-facing Profile clutter`);
}

// ── Apple-premium polish contract from the August 9 product pass ────────────
// Home stays simple: emergency access remains a separate priority strip and
// Start Here contains four non-duplicated destinations. Counselling is the
// primary card; each entry carries a short benefit and clear action.
[
  'Premium command center',
  'One calm start, four connected paths.',
  'Start with Counselling. Calm steadies the body. Path becomes one next step. Vedic adds perspective when needed.',
  'Private first step. The next Path stays clear.',
  'Sound and breath to steady you before Path.',
  'Moon-chart insight when perspective helps.',
  'Verified support when a human handoff fits best.',
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
  'Help and Redress remains available from every page',
  'Profile details are optional',
  'Privacy first',
  'Explore first'
].forEach((marker) => assert(source.includes(marker), `Missing onboarding/privacy marker: ${marker}`));
assert(source.includes('compactOnboarding && styles.launchNeedCardCompact'), 'Mobile onboarding choices must stack instead of clipping below the sheet.');
assert(source.includes('need.id === "guide" && styles.launchNeedCardPrimary'), 'Counselling must remain the visually dominant onboarding route.');
assert(!source.includes('setStartupAccessPromptAutoOpen(true)'), 'Choosing an onboarding route must not trigger a second timed profile sheet; profile setup remains optional.');

// Calm and Meditation are separate focused pages. They must not render both
// long engines at once, and their deeper libraries stay progressive.
assert(source.includes('activeTab === "meditation" ? <MeditationSection'), 'Meditation must render only on its own focused page.');
assert(source.includes('activeTab === "focus" ? <FocusSection'), 'Calm Reset must render only on its own focused page.');
assert(source.includes('Recommended now · {calmProgram.name}'), 'Calm must begin with the same issue-matched programme used by Path.');
assert(source.includes('Continue to Path'), 'Calm must provide a direct hand-off to the practical Path.');
assert(source.includes('Voice never starts automatically.'), 'Calm must state and preserve opt-in voice behavior.');
assert(source.includes('Explore more meditation methods'), 'Meditation must progressively disclose its longer practice library.');
assert(source.includes('View supporting perspectives'), 'Meditation support perspectives must remain hidden until requested.');

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

// User-facing trust and launch protections must remain visible without
// leaking beta targets or release-engineering diagnostics into Profile.
[
  'Legal and privacy',
  'Privacy policy',
  'Terms of use',
  'Crash/error monitoring and backend auth'
].forEach((marker) => assert(source.includes(marker), `Missing trust and launch-protection marker: ${marker}`));

assert(
  source.includes('Coordinated 48-dimension plan'),
  'Counselling must explain the synchronized 48-dimension plan in user-facing language.',
);
assert(
  source.includes('supportPracticeFocusByDimension'),
  'The visible 48-dimension plan must be backed by the shared support-practice mapping.',
);
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

// ── Counselling opening line -- warmth, not routing ──────────────────────────
// buildGuidedSupportSeedReply() is the very first thing a person sees on the
// counselling surface. Someone opening this at 2am has just made a small
// brave decision; the opening line has to make typing feel safe, not read
// like a routing spec. The prior version read: "Tell me what is on your
// mind... and I will understand what dimension of your life it is touching,
// then build you a clear path forward." Every phrase in that line is
// process-language.
{
  const fn = source.slice(source.indexOf("function buildGuidedSupportSeedReply"), source.indexOf("function buildGuidedSupportSeedReply") + 900);
  const body = fn.match(/return\s+"([^"]+)"/)?.[1] ?? "";
  const forbidden = ["dimension", "path forward", "next tab", "engine", "will understand", "build you", "route you"];
  const hits = forbidden.filter((w) => body.toLowerCase().includes(w.toLowerCase()));
  assert(
    hits.length === 0,
    `counselling seed line reads as routing spec (${hits.join(", ")}) rather than something a person in distress would want to read at 2am`
  );
  assert(
    /\bhere\b|\blistening\b|\btake your time\b|\bwhatever you|\bas much or as little\b/i.test(body),
    "counselling seed line must open with presence -- something along the lines of 'I'm here', 'take your time', 'as much or as little as you want'"
  );
}

// ── Counselling: between-turn acknowledgment must actually run ───────────────
// The original engine acknowledged only on turn one and then fired the next
// question raw for the whole 30-reply arc. A helper now prepends a short warm
// line -- and, when it can find one, echoes one concrete phrase from the
// most recent reply. This check makes sure both the helper stays there AND
// the wiring stays there: it is easy for a refactor to drop either half.
{
  const helper = source.slice(source.indexOf("function buildBetweenTurnAcknowledgment"), source.indexOf("function buildBetweenTurnAcknowledgment") + 2400);
  assert(/openers = \[/.test(helper), "buildBetweenTurnAcknowledgment must rotate through opener phrases");
  assert(/echoPatterns/.test(helper), "buildBetweenTurnAcknowledgment must attempt an echo before falling back to opener alone");
  assert(
    /const ack = buildBetweenTurnAcknowledgment\(text, userResponses, languageId\);/.test(source),
    "the counselling reply flow must call buildBetweenTurnAcknowledgment for every follow-up turn"
  );
  assert(
    /: `\$\{ack\}\\n\\n\$\{nextQ\}`/.test(source),
    "the non-checkpoint branch must prepend the acknowledgment to the next question, or every reply reverts to interrogation"
  );
}

// ── Chart tab's EN/हिन्दी toggle must follow the global language ─────────────
// The Chart tab has heavy per-string Hindi content already, but it hangs off
// a local chartBriefLang state seeded to "en". A user who selected Hindi
// globally used to open Chart in English -- a real "language switch does not
// apply" symptom. A useEffect now binds chartBriefLang to languageId once
// AsyncStorage has hydrated; a manual toggle still sticks until the global
// language changes again.
{
  const src = source;
  assert(
    /useEffect\(\(\) => \{\s*\n\s*if \(!hasLoaded\) return;\s*\n\s*setChartBriefLang\(languageId === "hindi" \? "hi" : "en"\);/.test(src),
    "chartBriefLang must sync from the global languageId after hydration -- otherwise Chart shows English to a Hindi user"
  );
}

console.log("Product quality regression passed: focused navigation, calculation transparency, counselling safeguards, crisis lifelines, redress governance, local metrics, ethical access, beta coverage standards, and mood understanding (positive + negative, persisted and differentiated) are present.");
