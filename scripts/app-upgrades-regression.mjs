import fs from 'node:fs';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function indexOf(marker) {
  const index = source.indexOf(marker);
  assert(index >= 0, `Missing marker: ${marker}`);
  return index;
}

function assertBefore(leftMarker, rightMarker, message) {
  const left = indexOf(leftMarker);
  const right = indexOf(rightMarker);
  assert(left < right, message ?? `${leftMarker} must appear before ${rightMarker}`);
}

// Main section order: Help & Redress must remain in the intentional page block,
// before the lower-priority "other/general" surfaces such as Patterns, Explore,
// Practice, Language, Settings, and Admin/Control.
assertBefore(
  '{ id: "redress", label: "Help and Redress"',
  '{ id: "insights", label: "Patterns"',
  'Help & Redress must be ordered before Patterns in the page switcher'
);
assertBefore(
  '{ id: "redress", label: "Help and Redress"',
  '{ id: "search", label: "Explore"',
  'Help & Redress must be ordered before Explore in the page switcher'
);
assertBefore(
  '{ id: "redress", label: "Help and Redress"',
  '{ id: "settings", label: "Settings"',
  'Help & Redress must be ordered before Settings/Profile in the page switcher'
);
assertBefore(
  '{ id: "redress",    label: "Help"',
  '{ id: "settings",   label: "Profile"',
  'Help must be visible in the primary bottom nav before Profile/other-general access'
);
indexOf('safety, SOS, complaint route, and immediate support must be one tap away');

// Help and Redress realignment: immediate safety actions remain within
// the Help & Redress panel, before the general route chips, so emergency action
// is seen first instead of buried below route selection.
const redressSectionStart = indexOf('function RedressSection({');
const immediateSafety = indexOf('{/* ── IMMEDIATE SAFETY ACTIONS ── */}');
const directoryDisclosure = indexOf('More emergency contacts and official directories');
const importantNumbers = indexOf('{/* ── QUICK HELP NUMBERS STRIP ── */}');
const directoriesHub = indexOf('{/* ── UNIFIED DIRECTORIES HUB ── */}');
const routeChips = indexOf('{/* ── ROUTE CHIPS ── */}');
assert(redressSectionStart < immediateSafety, 'Immediate safety actions must live inside RedressSection');
assert(immediateSafety < directoryDisclosure, 'Immediate safety actions must appear before the optional directory disclosure');
assert(directoryDisclosure < importantNumbers, 'Optional emergency directories must remain behind their disclosure control');
assert(importantNumbers < directoriesHub, 'Important numbers must appear before directories hub');
assert(directoriesHub < routeChips, 'Directories hub must appear before route chips/general route selection');


// Front UI order: Help and Redress above other sections, tester page at the bottom.
const todayStart = indexOf('{activeTab === "today" && (');
const landingHeader = indexOf('{/* ── LANDING HEADER — Premium redesign ── */}');
// The front-screen Help and Redress card was intentionally trimmed from a
// full preview (all 4 emergency numbers + 3 actions) down to a compact
// safety strip -- the full version already has its own always-visible
// bottom-nav tab (see PRIMARY_NAV_TABS comment), so repeating it in full on
// the front screen was redundant clutter. SOS stays a single tap either way.
const mergedHelp = indexOf('In immediate danger, call 112.');
// Calm Sound, Community/Messages, and Visit Report preview cards were removed
// from the front page entirely -- all three already have their own
// always-visible tab in the top tab rail (headerNavTabs includes "tones",
// "community", and "insights"), so previewing them again on the front page
// was redundant clutter, same reasoning as the Help & Redress trim above.
// The Patterns/insights tab's own "Progress Report Card" is a richer version
// of what the front-page report card used to show.
const premiumCommandCenter = indexOf('Premium command center');
const premiumCommandTitle = indexOf('Choose the right support in one tap.');
const testerFront = indexOf('Become an Aethon Beacon tester');
assert(todayStart < landingHeader, 'Landing header must remain inside the Today/front UI');
assert(mergedHelp < premiumCommandCenter, 'Help and Redress must remain the first Home action surface');
assert(premiumCommandCenter < testerFront, 'Premium command center must appear before the web-only tester page');
assert(premiumCommandTitle < testerFront, 'Premium command copy must remain on the Home surface');
assert(!source.includes('Curated sound programmes for relaxation, focus, sleep, and emotional regulation'), 'Calm Sound preview must not remain on the front UI');
assert(!source.includes('Moderated community support and private conversations'), 'Community/Messages preview must not remain on the front UI');
indexOf('Open Help and Redress');
indexOf('Open Path');
indexOf('Start Calm');
indexOf('A private guided room with a 30-message arc and optional next-step checkpoints.');
indexOf('Moon-chart based guidance with practical remedies.');
indexOf('Verified support conversations when access is confirmed.');
indexOf('Privacy first: notes stay local unless you choose verified sharing, export, or tester enrolment.');
// homeRedressInfoGrid/Card styles were removed as dead code once the front-screen
// safety strip was trimmed down to SOS + "Open Help and Redress" (the 4-number
// grid they styled no longer exists in JSX) -- see mergedHelp marker above.
indexOf('Platform.OS === "web" && (');
indexOf('"tones",\n      "community",\n      "redress",\n      "insights"');
// The richer report card that Visit Report moved into still lives on Patterns.
indexOf('Progress Report Card');
indexOf('automatic counselling engine');
assert(!source.includes('What Aethon Beacon does'), 'Vision card must not remain on the front UI');
const hiddenNumericLabel = ['48', '-Dimension'].join('');
const hiddenNumericReading = ['48', '-dimension reading'].join('');
assert(!source.includes(hiddenNumericLabel), 'Public numeric Vedic terminology must remain hidden');
assert(!source.includes(hiddenNumericReading), 'Public numeric Vedic reading terminology must remain hidden');

// Concrete Help & Redress upgrade markers from the July 26 batch.
[
  '🚨 SOS — 112',
  '🔊 Read this route aloud',
  '🚨 IMPORTANT NUMBERS',
  'Tele-MANAS (mental health)',
  'Anti-Ragging',
  'RedressDirectoriesHub',
  'Legal aid + helplines',
  'Govt grievance',
  'State police + officers',
  'Health + hospitals',
  'DRAFT_TEMPLATES',
  'FIRST_SCRIPTS',
  'ROUTE_TIMELINES',
  'Evidence checklist',
  'Recommended path now',
  'First offices to select',
  'Suggested wording',
  'RBI CMS',
  'NCPCR',
  'EPFO',
  'Share script ↗',
  'Admin center',
  'Admin tools',
  'Too many failed attempts',
  'Disable speaker',
  'Enable speaker',
  'onFetchGuideEnrichment',
  // Counselling chat "typing…" beat -- replies are computed instantly from
  // local logic, so without this every guide message (opening line, each
  // follow-up question, and the final synthesis) used to land in the same
  // frame as the tap, reading like a form submit instead of a conversation.
  'isGuideTyping',
  'typingDotsAnim',
  // Community/Redress/Tones premium pass: confirmation gates on destructive
  // actions (previously single-tap-and-gone), and real haptic feedback on
  // the highest-repeat taps in each section (reactions, send, save, report,
  // evidence checklist, route select, tone play/loop/pause/preset/volume) --
  // confirmed zero Haptics.* calls existed in any of the three before this.
  'function confirmDestructive',
  // Tones mini-player: audio used to die silently the instant you left the
  // Tones tab (the whole section unmounted with the tab, and its playback
  // effect's cleanup called stopContinuousTone). ToneLibrarySection now stays
  // mounted (hidden via display:none, not unmounted) for the app's whole
  // session and reports state up so a persistent mini-player can show/control
  // it from any tab, matching Calm/Spotify-style background playback.
  'onNowPlayingChange',
  'onControlsReady',
  'toneControlsRef',
  'toneNowPlaying',
].forEach((marker) => indexOf(marker));

// Lock in that ToneLibrarySection is rendered unconditionally (hidden via
// style, not removed from the tree) -- a regression back to
// `{activeTab === "tones" && <ToneLibrarySection` would silently reintroduce
// the "audio dies when you leave the tab" bug this was built to fix.
assert(
  /<View style=\{activeTab === "tones" \? undefined : \{ display: "none" \}\}>\s*<ToneLibrarySection/.test(source),
  'ToneLibrarySection must stay mounted (hidden via display:none) instead of being conditionally rendered, or background tone playback breaks again'
);

// Counselling personalization pass: two real, already-computed signals that
// were previously dead-ended before reaching the counselling engine --
// visitReports (a real, timestamped per-issue history log populated across
// the app on check-ins and Home-intake routing) and
// crossSectionSignal.recentMoodTrend -- now flow into both the synthesis
// paragraph (recurrence acknowledgement) and the journey steps (grounding /
// guidance reason copy). Purely additive: never changes theme detection or
// which steps/route get recommended, only reason/synthesis copy.
[
  'recurrenceCount = 0',
  "moodTrend?: \"improving\" | \"steady\" | \"declining\" | null;",
  'visitReports?: VisitReport[];',
  'this is not the first time this has come up',
  'Your recent check-ins have been trending heavier',
].forEach((marker) => indexOf(marker));
assert(
  source.includes('buildCounselingSynthesis(updatedSession, issueId, moonChartInsightReadings, recurrenceCount, sadeSatiNote, weeklyTrend)'),
  'Counselling synthesis call site must pass real recurrenceCount, sadeSatiNote, and weeklyTrend'
);
assert(
  source.includes('buildJourneySteps(mergedThemes, issueId, route, moonChartInsightReadings, { streak, moodTagLeaning, recurrenceCount, moodTrend })'),
  'Counselling journey steps call site must pass recurrenceCount and moodTrend through personalization'
);
assert(
  source.includes('visitReports={visitReports}') && source.includes('moodTrend={crossSectionSignal.recentMoodTrend}'),
  'CounselingChatModal must receive real visitReports and crossSectionSignal.recentMoodTrend from App()'
);

// Path tab: the same visitReports-derived recurrence signal and
// crossSectionSignal.recentMoodTrend used in counselling chat are now also
// surfaced directly on the Path tab's "Active focus" strip, so the pattern
// is visible without having to start a chat conversation.
[
  'selectedIssueRecurrenceCount',
  'This has come up {selectedIssueRecurrenceCount} times before',
  'crossSectionSignal.recentMoodTrend === "declining"',
].forEach((marker) => indexOf(marker));

// Three more previously-dead-ended real signals now reach the counselling
// engine: journal notes feed theme detection, a real active Sade Sati
// transit phase (Gochar, already shown on the Vedic tab) adds one sentence
// for anxiety/fear/direction themes, and the real weekly-vs-monthly clarity
// average (already shown on Patterns) names an actual measured dip.
[
  'recentJournalNotesText',
  'counselingSadeSatiNote',
  'sadeSatiNote: string | null = null',
  'weeklyTrend: { weeklyAverage: number; monthlyAverage: number; sampleSize: number } | null = null',
  'Your own check-in history backs this up',
].forEach((marker) => indexOf(marker));
assert(
  source.includes('weeklyTrend={{ weeklyAverage, monthlyAverage, sampleSize: weekEntries.length }}'),
  'CounselingChatModal must receive the real weekly/monthly clarity averages, not a placeholder'
);

// Counselling chat UI polish: consistent "Beacon Guide" branding (header
// previously said the generic "Your guide", clashing with the enrichment
// card's "Beacon Guide" label), and a dismissible Scope-and-safety notice
// (previously permanently consumed header space with no way to collapse it
// once read, and reset back open on every new session).
[
  'Beacon Guide is listening',
  'safetyNoticeExpanded',
  'setSafetyNoticeExpanded(true)',
].forEach((marker) => indexOf(marker));
assert(!source.includes('>Your guide is listening<'), 'Counselling header must not regress to the inconsistent "Your guide" label');

// Chat message timestamps: CounselingTurn now carries an optional ts, set at
// every visible construction site and rendered as a local clock time under
// each bubble, so the counselling exchange reads like a real conversation with
// a timeline instead of a timeless wall of text. The Ask-the-chart bubbles
// (which already carried ts) render a matching time for parity.
assert(/interface CounselingTurn \{[\s\S]*?ts\?: string;/.test(source), 'CounselingTurn must carry an optional ts timestamp field');
assert((source.match(/message: (?:openingMsg|text|synthesis|checkpointQuestion), ts: new Date\(\)\.toISOString\(\)/g) ?? []).length >= 4, 'All CounselingTurn construction sites must set ts');
assert(source.includes('toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })'), 'Counselling chat bubbles must render a local clock time per message');

// Counselling depth: the guide must not force-close after six replies. It
// should offer a user-controlled next-step checkpoint every six replies, while
// allowing a full 30-reply counselling arc before automatic synthesis.
[
  'COUNSELING_AUTO_SYNTHESIS_USER_RESPONSES = 30',
  'COUNSELING_NEXT_STEP_READY_USER_RESPONSES = 6',
  'userResponses % COUNSELING_NEXT_STEP_READY_USER_RESPONSES === 0',
  'Prepare next step now',
  'You remain in control',
].forEach((marker) => indexOf(marker));

// Progressive disclosure: the three dense Vedic sections (multi-dimensional trace,
// Detailed calculation panel, plain-language house-by-house reading) each collapse
// by default behind the same tap gesture, so the tab is scannable instead of
// an endless scroll. Guards against a refactor silently re-expanding them.
[
  'expandedMoonDims',
  'advancedVedicOpen',
  'plainHousesOpen',
].forEach((marker) => indexOf(marker));

// Redress "My case" tracker: the one persistent piece of user state in the
// otherwise-generated Redress tab -- reference number, filing office, status,
// notes, and a follow-up date that doubles as a lightweight reminder. Must
// survive restarts (persisted array) and stay confirm-gated on delete.
assert(source.includes('type RedressCase'), 'RedressCase type is missing');
assert(source.includes('redressCases: RedressCase[];'), 'redressCases must be part of the persisted app state');
assert(source.includes('function normalizeRedressCases'), 'RedressCase load-normaliser is missing (persistence hardening)');
assert(source.includes('setRedressCases(normalizeRedressCases(parsed.redressCases))'), 'redressCases must be rehydrated from storage on load');
assert(source.includes('redressCases: redressCases.slice(0, 20)'), 'redressCases must be written back to storage');
assert(source.includes('function redressFollowUpState'), 'Follow-up reminder state helper is missing');
assert(source.includes('Start tracking this complaint'), 'Redress case tracker start affordance is missing');
assert(/Alert\.alert\(\s*"Delete this case\?"/.test(source), 'Deleting a tracked case must stay confirm-gated');

// ── Chat drafts must not live in App() ───────────────────────────────────────
// App() is a single ~6,600-line component holding ~180 pieces of state. Any
// setState there re-renders the whole active tab -- every inline style object
// rebuilt, every useMemo dependency array compared. A chat draft held up
// there runs that pass on every keystroke, which is what makes typing feel
// heavy on a mid-range device. The composer owns its own draft instead.
assert(source.includes("const ChatComposer = React.memo("), "ChatComposer must stay memoised, or confining the per-keystroke render achieves nothing");
assert(/const ChatComposer = React\.memo\(function ChatComposer\([\s\S]{0,1400}?const \[draft, setDraft\] = useState\(""\)/.test(source), "ChatComposer must hold its own draft state rather than receiving it from App()");
assert(!source.includes("const [astroChatDraft"), "the Ask-the-chart draft must not move back into App() state");

// ── Route previews must not run on every keystroke ───────────────────────────
// buildRoutePreview() reaches 38 pattern tests across five functions, and it
// feeds three live previews: the Home issue box, the journal, and the
// counselling composer. Keyed on raw draft text, a 170-character journal entry
// ran roughly 6,500 pattern evaluations while it was being typed, to produce a
// hint that only has to be right once the person stops to read it.
assert(source.includes("function useDebouncedValue"), "a useDebouncedValue hook must exist so live previews settle instead of tracking every keystroke");
for (const [live, settled] of [["homeIssueDraft", "settledHomeIssueDraft"], ["journal", "settledJournal"], ["aiHelpPreviewSource", "settledAiHelpPreviewSource"]]) {
  assert(source.includes(`const ${settled} = useDebouncedValue(${live})`), `${live} must be debounced before it feeds a route preview`);
}
assert(!/buildRoutePreview\(journal,/.test(source), "the journal route preview must read the settled value, not raw keystrokes");
assert(!/buildRoutePreview\(homeIssueDraft,/.test(source), "the Home route preview must read the settled value, not raw keystrokes");
assert(!/buildRoutePreview\(aiHelpPreviewSource,/.test(source), "the counselling route preview must read the settled value, not raw keystrokes");

// ── Draft text must not live in App() ────────────────────────────────────────
// App() holds ~180 pieces of state across ~6,600 lines; a setState there
// re-renders the whole active tab. Draft text belongs next to its TextInput.
// Listed explicitly rather than by pattern, so adding a new draft to App()
// is a deliberate decision someone has to make against this list.
const appBody = source.slice(
  source.indexOf("export default function App("),
  source.indexOf("\nfunction ", source.indexOf("export default function App("))
);
for (const draft of ["communityDraft", "communityChatDraft", "astroChatDraft", "privateSpaceKindDraft", "privateSpaceTitleDraft", "privateSpaceMembersDraft", "privateSpaceDraft"]) {
  assert(
    !appBody.includes(`const [${draft},`),
    `${draft} must live in the component that owns its TextInput, not in App() -- holding it here re-renders the whole tab on every keystroke`
  );
}
// The send handlers report success so a refused message is not silently lost.
assert(
  /function createPrivateSpaceRoom\(input: \{/.test(source),
  "createPrivateSpaceRoom must take the composed room as an argument rather than reading four pieces of App() state"
);
assert(
  /function sendPrivateSpaceMessage\(rawText: string\): boolean/.test(source),
  "sendPrivateSpaceMessage must take the text and report whether it sent"
);
for (const fn of ["postCommunityMessage", "postCommunityChatMessage"]) {
  assert(
    new RegExp(`async function ${fn}\\(rawText: string\\): Promise<boolean>`).test(source),
    `${fn} must take the text and return whether it sent, so the composer keeps the draft when a post is refused`
  );
}

// ── The Home route preview must track something the user can actually type ──
// It renders directly beneath the journal input on Today. It used to read
// homeRoutePreview, which is derived from homeIssueDraft -- a value only ever
// set with text inside DynamicHeroCard, a component that is never mounted. So
// the card permanently read "Route waiting -- type one line and the app will
// choose the next page automatically", under an input that was not the one it
// meant, while the same empty placeholder was also being written into every
// step visit report.
assert(
  source.includes("routePreview={journalRoutePreview}"),
  "TodaySection's route preview must read journalRoutePreview -- it sits under the journal input, and homeRoutePreview is derived from a draft nothing can set"
);
assert(
  !/buildStepVisitReport\([\s\S]{0,220}homeRoutePreview/.test(source),
  "visit reports must not embed homeRoutePreview -- it is permanently the empty placeholder"
);

// ── No write-only state ──────────────────────────────────────────────────────
// Five useState slots were being written and never read. Each one meant a
// feature that ran and produced nothing: a loading flag with no spinner, two
// network replies discarded on arrival, and -- worst -- a weekly banner whose
// effect stamped the week as seen while rendering nothing, so the weekly
// moment was consumed and thrown away every week. This catches the shape.
{
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
  const writeOnly = [];
  for (const m of withoutComments.matchAll(/const \[([A-Za-z0-9_]+), (set[A-Za-z0-9_]+)\] = useState/g)) {
    const value = m[1];
    const reads = withoutComments.match(new RegExp(`\\b${value}\\b`, "g")) ?? [];
    if (reads.length <= 1) writeOnly.push(value);
  }
  assert(
    writeOnly.length === 0,
    `state is written but never read: ${writeOnly.join(", ")} -- either render it or delete it, because a value nothing reads is a feature that silently does nothing`
  );
}

// The weekly reading prompt must actually render. Its effect stamps
// lastWeeklyVedicCheck, so a banner that never shows burns the week.
assert(
  source.includes("{showWeeklyVedicBanner && ("),
  "the weekly reading banner must be rendered -- its effect marks the week as seen either way"
);

console.log('App upgrades regression passed: section order, consolidated Help and Redress, web-only tester recruitment, professional home previews, templates/scripts/timelines, admin gate, voice mute, connected counselling enrichment, a real typing beat on every counselling chat reply, confirm-gated destructive actions with haptic feedback across Community/Redress/Tones, a persistent Tones mini-player that survives tab navigation, counselling personalization wired to real visit-recurrence and mood-trend history, and a persistent Redress "My case" tracker with a follow-up reminder are present.');
