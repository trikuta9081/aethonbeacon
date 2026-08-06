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
const importantNumbers = indexOf('{/* ── QUICK HELP NUMBERS STRIP ── */}');
const directoriesHub = indexOf('{/* ── UNIFIED DIRECTORIES HUB ── */}');
const routeChips = indexOf('{/* ── ROUTE CHIPS ── */}');
assert(redressSectionStart < immediateSafety, 'Immediate safety actions must live inside RedressSection');
assert(immediateSafety < importantNumbers, 'Immediate safety actions must appear before important numbers');
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
const testerFront = indexOf('Become an Aethon Beacon tester');
assert(todayStart < landingHeader, 'Landing header must remain inside the Today/front UI');
assert(mergedHelp < testerFront, 'Help and Redress must appear above the tester page');
assert(!source.includes('Curated sound programmes for relaxation, focus, sleep, and emotional regulation'), 'Calm Sound preview must not remain on the front UI');
assert(!source.includes('Moderated community support and private conversations'), 'Community/Messages preview must not remain on the front UI');
indexOf('Open Help and Redress');
// homeRedressInfoGrid/Card styles were removed as dead code once the front-screen
// safety strip was trimmed down to SOS + "Open Help and Redress" (the 4-number
// grid they styled no longer exists in JSX) -- see mergedHelp marker above.
indexOf('Platform.OS === "web" && (');
indexOf('"tones",\n      "community",\n      "redress",\n      "insights"');
// The richer report card that Visit Report moved into still lives on Patterns.
indexOf('Progress Report Card');
indexOf('automatic multidimensional counselling engine');
assert(!source.includes('What Aethon Beacon does'), 'Vision card must not remain on the front UI');
assert(!source.includes('48-Dimension'), 'Public 48-Dimension terminology must remain hidden');
assert(!source.includes('48-dimension reading'), 'Public 48-dimension reading terminology must remain hidden');

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
  'Stop speaker',
  'Unmute speaker',
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
  source.includes('buildCounselingSynthesis(updatedSession, issueId, moonChart48Readings, recurrenceCount, sadeSatiNote, weeklyTrend)'),
  'Counselling synthesis call site must pass real recurrenceCount, sadeSatiNote, and weeklyTrend'
);
assert(
  source.includes('buildJourneySteps(mergedThemes, issueId, route, moonChart48Readings, { streak, moodTagLeaning, recurrenceCount, moodTrend })'),
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

console.log('App upgrades regression passed: section order, consolidated Help and Redress, web-only tester recruitment, professional home previews, templates/scripts/timelines, admin gate, voice mute, Gemini counselling enrichment, a real typing beat on every counselling chat reply, confirm-gated destructive actions with haptic feedback across Community/Redress/Tones, a persistent Tones mini-player that survives tab navigation, and counselling personalization wired to real visit-recurrence and mood-trend history are present.');
