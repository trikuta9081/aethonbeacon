import fs from 'node:fs';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const appConfig = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const iosInfo = fs.readFileSync(new URL('../ios/AethonBeacon/Info.plist', import.meta.url), 'utf8');
const androidStrings = fs.readFileSync(new URL('../android/app/src/main/res/values/strings.xml', import.meta.url), 'utf8');

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

// One public NAYIQ identity, while retaining the existing store records and
// installed-app continuity represented by the original bundle identifiers.
assert(appConfig.name === 'NAYIQ', 'The installed app display name must remain NAYIQ');
assert(appConfig.icon === './assets/nayiq-logo.png', 'Expo must use the NAYIQ master icon');
assert(appConfig.ios.icon === './assets/nayiq-logo.png', 'iOS must use the NAYIQ master icon');
assert(appConfig.android.adaptiveIcon.foregroundImage === './assets/nayiq-logo.png', 'Android must use the NAYIQ master icon');
assert(appConfig.web.favicon === './assets/nayiq-logo.png', 'Web must use the NAYIQ master icon');
assert(appConfig.ios.bundleIdentifier === 'com.aethonbeacon.app', 'Do not create a second App Store app by changing the established bundle identifier');
assert(appConfig.android.package === 'com.aethonbeacon.app', 'Do not create a second Play Store app by changing the established package name');
const appSchemes = Array.isArray(appConfig.scheme) ? appConfig.scheme : [appConfig.scheme];

// Counselling chat motion. Bubbles used to appear between frames, which is the
// clearest tell between this and a first-party messaging app. Reduced Motion
// must collapse the entrance entirely rather than merely slowing it.
assert(source.includes('function ChatTurnAppear('), 'Counselling turns must animate into place');
assert(source.includes('useNativeDriver: true'), 'Chat entrance motion must run on the native driver');
assert(/ChatTurnAppear\s+key=\{i\}\s+reduceMotion=\{chatReduceMotion\}/.test(source), 'Chat entrance must honour the Reduced Motion setting');
assert(source.includes('void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);'), 'A guide reply landing must be marked with a light haptic');

// Cross-device sync must read the blob the app actually writes. The previous
// implementation synced "@aethon_*" keys that were never written anywhere, so
// every push sent zero rows and still reported success.
const syncSource = fs.readFileSync(new URL('../supabaseSync.ts', import.meta.url), 'utf8');
assert(!/@aethon_/.test(syncSource), 'Sync must not reference storage keys the app never writes');
assert(syncSource.includes('export const SYNC_STORAGE_KEY = "aethon-beacon:v2"'), 'Sync must target the real persisted blob');
assert(source.includes('const STORAGE_KEY = SYNC_STORAGE_KEY'), 'App and sync must share one storage key so they cannot drift apart');
assert(source.includes('applyPersistedStateRef.current?.(outcome.merged)'), 'A merged payload must be applied to live state, not just written to disk');
assert(/AppState\.addEventListener\("change", \(state\) => \{\s*if \(state === "active"\) tick\(\);/.test(source), 'Sync must run when the app returns to the foreground, not only at verification');
assert(appSchemes.includes('aethonbeacon'), 'Keep the original URL scheme so links in already-installed builds keep resolving');
assert(appSchemes.includes('nayiq'), 'Ship a NAYIQ URL scheme alongside the original one');
const androidManifest = fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
appSchemes.forEach((scheme) => {
  assert(iosInfo.includes(`<string>${scheme}</string>`), `iOS must register the ${scheme} URL scheme`);
  assert(androidManifest.includes(`android:scheme="${scheme}"`), `Android must register the ${scheme} URL scheme`);
});
assert(
  fs.readFileSync(new URL('../android/app/src/main/res/values/styles.xml', import.meta.url), 'utf8')
    .includes('<item name="android:windowBackground">@drawable/splashscreen</item>'),
  'The launch theme must use the centred splash layer-list, not a stretched bitmap'
);
assert(iosInfo.includes('<string>NAYIQ</string>'), 'Native iOS display name must be NAYIQ');
assert(androidStrings.includes('<string name="app_name">NAYIQ</string>'), 'Native Android display name must be NAYIQ');
assert(source.includes('brandTagline: "From concern to clarity"'), 'The selected NAYIQ brand promise must appear in the app header');
assert(source.includes('NAYIQ · From concern to clarity'), 'Shared reports must use the selected NAYIQ brand promise');
assert(source.includes('Delete this check-in?'), 'Deleting a saved check-in must require confirmation');
assert(source.includes('Clear saved check-ins?'), 'Clearing saved check-ins must require confirmation');
assert(source.includes('journalText("Clear draft"'), 'The draft-only action must not be mislabeled as clearing history');
assert(source.includes('accessibilityLabel={journalText("Delete this saved check-in"'), 'Journal delete controls need a spoken label');
assert(source.includes('Ionicons name="trash-outline"'), 'Journal delete controls must use a recognizable trash icon');
assert(
  fs.readFileSync(new URL('../assets/icon.png', import.meta.url)).equals(
    fs.readFileSync(new URL('../ios/AethonBeacon/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png', import.meta.url))
  ),
  'The checked-in TestFlight icon must match the generated NAYIQ master output'
);

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


// Front UI order: Help and Redress above the premium support cards.
const todayStart = indexOf('{activeTab === "today" && (');
const landingHeader = indexOf('{/* ── LANDING HEADER — Premium redesign ── */}');
// The front-screen Help and Redress card was intentionally trimmed from a
// full preview (all 4 emergency numbers + 3 actions) down to a compact
// safety strip -- the full version already has its own always-visible
// bottom-nav tab (see PRIMARY_NAV_TABS comment), so repeating it in full on
// the front screen was redundant clutter. SOS stays a single tap either way.
const mergedHelp = indexOf('In immediate danger, call 112.');
// Calm / Tones and Vedic Insight preview cards were removed from the front
// page entirely -- the top home surface now stays focused on Counselling and
// Community, with the rest still reachable through the deeper Pages flows.
// The Patterns/insights tab's own "Progress Report Card" is a richer version
// of what the front-page report card used to show.
const premiumCommandCenter = indexOf('Premium command center');
const premiumCommandTitle = indexOf('One clear start, two connected paths.');
assert(todayStart < landingHeader, 'Landing header must remain inside the Today/front UI');
assert(mergedHelp < premiumCommandCenter, 'Help and Redress must remain the first Home action surface');
assert(!source.includes('Curated sound programmes for relaxation, focus, sleep, and emotional regulation'), 'Calm Sound preview must not remain on the front UI');
assert(!source.includes('Moderated community support and private conversations'), 'Community/Messages preview must not remain on the front UI');
indexOf('Open Help and Redress');
indexOf('Start with Counselling. Community stays one tap away when you want verified human support.');
indexOf('Counselling → Community');
indexOf('Private first, then verified support when you need a human handoff.');
assert(!source.includes('title: uiCopy.homeSupportCalmTitle'), 'Calm support card must not remain on the front UI');
assert(!source.includes('title: uiCopy.homeSupportVedicTitle'), 'Vedic insight card must not remain on the front UI');
indexOf('Private first step. The next Path stays clear.');
indexOf('Verified support when a human handoff fits best.');
indexOf('Open messages');
indexOf('Private by default. Notes stay local unless shared or exported.');
// homeRedressInfoGrid/Card styles were removed as dead code once the front-screen
// safety strip was trimmed down to SOS + "Open Help and Redress" (the 4-number
// grid they styled no longer exists in JSX) -- see mergedHelp marker above.
indexOf('"tones",\n      "community",\n      "redress",\n      "insights"');
// The richer report card that Visit Report moved into still lives on Patterns.
indexOf('Progress report card');
indexOf('automatic counselling engine');
assert(!source.includes('What NAYIQ does'), 'Vision card must not remain on the front UI');
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

// Voice readout is explicitly opt-in and prioritises a natural Indian device
// voice. Male/female character comes from the installed voice rather than a
// synthetic pitch effect; pitch remains close to normal human speech.
[
  'const [voiceAssistEnabled, setVoiceAssistEnabled] = useState(false)',
  'normalizedVoice.endsWith("-in")',
  'getReadyWebVoices',
  'const speakPitch = 1.0',
  'Natural · Indian voice',
  'Pitch stays close to a normal speaking voice',
].forEach((marker) => indexOf(marker));
assert(
  !source.includes('voiceGender === "female" ? 1.02 : 0.98'),
  'Male/female voice selection must use an installed device voice, not synthetic pitch-shifting'
);
assert(
  !/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]{0,600}?speakGuidance\(/.test(source),
  'Voice guidance must not start automatically from an effect'
);

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
  'Your recent check-ins have trended heavier',
].forEach((marker) => indexOf(marker));
assert(
  source.includes('buildCounselingSynthesis(updatedSession, issueId, moonChartInsightReadings, recurrenceCount, sadeSatiNote, weeklyTrend, languageId)'),
  'Counselling synthesis call site must pass real recurrenceCount, sadeSatiNote, weeklyTrend, and the selected language'
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
  'This has come up ${selectedIssueRecurrenceCount} times before',
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

// Counselling chat UI polish: consistent "NAYIQ Guide" branding (header
// previously said the generic "Your guide", clashing with the enrichment
// card's "NAYIQ Guide" label), and a dismissible Scope-and-safety notice
// (previously permanently consumed header space with no way to collapse it
// once read, and reset back open on every new session).
[
  'NAYIQ Guide is listening',
  'safetyNoticeExpanded',
  'setSafetyNoticeExpanded(true)',
].forEach((marker) => indexOf(marker));
assert(!source.includes('>Your guide is listening<'), 'Counselling header must not regress to the inconsistent "Your guide" label');

// Primary-language counselling parity: Hindi, Telugu, Tamil, and Urdu must
// not drop back to English for the first message, adaptive questions,
// synthesis, safety notice, or voice-input operational states.
[
  'function getLocalizedCounsellingSafetyCopy',
  'function buildPrimaryLanguageCounsellingQuestion',
  'function buildPrimaryLanguageCounsellingSynthesis',
  'buildBetweenTurnAcknowledgment(text, userResponses, languageId)',
  'आवाज़ दर्ज हो गई।',
  'వాయిస్ నమోదు అయింది.',
  'குரல் பதிவு செய்யப்பட்டது.',
  'آواز درج ہو گئی۔',
].forEach((marker) => indexOf(marker));
assert(
  source.includes('const [showAllLanguages, setShowAllLanguages] = useState(false)'),
  'LanguageSection must keep the compact/full language-list toggle state'
);
assert(
  source.includes('const visibleLanguages = showAllLanguages ? languageOptions : primaryLanguageOptions'),
  'LanguageSection must switch between the primary-language preview and the full language list'
);
assert(
  source.includes('uiCopy.languagePageToggleCompact') && source.includes('uiCopy.languagePageToggleExpanded'),
  'LanguageSection must expose copy for the compact/full language-list toggle'
);
assert(
  source.includes('getLocalizedCounsellingSafetyCopy(classifyCounsellingSafety(initialIssue), languageId)'),
  'The counselling modal safety notice must follow the selected primary language'
);

// Small-phone keyboard focus mode: opening the native keyboard must prioritise
// the actual transcript and composer instead of leaving informational chrome
// in the reduced viewport. The close, voice and send controls keep a 44pt
// target even when their visual treatment is compact, matching Apple HIG.
const counsellingModalSource = source.slice(
  source.indexOf('function CounselingChatModal({'),
  source.indexOf('// GUIDED JOURNEY BAR', source.indexOf('function CounselingChatModal({'))
);
[
  'accessibilityViewIsModal',
  'keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}',
  'onPress={Keyboard.dismiss}',
  'accessibilityLabel={l("Counselling reply"',
  'disabled={!draft.trim() || isGuideTyping}',
].forEach((marker) => assert(counsellingModalSource.includes(marker), `Missing counselling keyboard-focus marker: ${marker}`));
assert(
  (counsellingModalSource.match(/!isKeyboardVisible && <Pressable/g) ?? []).length >= 3,
  'Safety, speaker and route controls must collapse while the keyboard is open'
);
assert(
  (counsellingModalSource.match(/width: 44, height: 44/g) ?? []).length >= 3,
  'Counselling close, keyboard, mic and send controls must retain 44pt touch targets'
);

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
assert(
  /Alert\.alert\([\s\S]{0,220}Delete this case\?/.test(source) || /l\(\s*"Delete this case\?"/.test(source),
  'Deleting a tracked case must stay confirm-gated'
);

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

console.log('App upgrades regression passed: section order, consolidated Help and Redress, premium support cards, professional home previews, templates/scripts/timelines, admin gate, voice mute, connected counselling enrichment, a real typing beat on every counselling chat reply, confirm-gated destructive actions with haptic feedback across Community/Redress/Tones, a persistent Tones mini-player that survives tab navigation, counselling personalization wired to real visit-recurrence and mood-trend history, and a persistent Redress "My case" tracker with a follow-up reminder are present.');
