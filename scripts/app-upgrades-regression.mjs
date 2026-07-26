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
  '{ id: "redress", label: "Help & Redress"',
  '{ id: "insights", label: "Patterns"',
  'Help & Redress must be ordered before Patterns in the page switcher'
);
assertBefore(
  '{ id: "redress", label: "Help & Redress"',
  '{ id: "search", label: "Explore"',
  'Help & Redress must be ordered before Explore in the page switcher'
);
assertBefore(
  '{ id: "redress", label: "Help & Redress"',
  '{ id: "settings", label: "Settings"',
  'Help & Redress must be ordered before Settings/Profile in the page switcher'
);
assertBefore(
  '{ id: "redress",    label: "Help"',
  '{ id: "settings",   label: "Profile"',
  'Help must be visible in the primary bottom nav before Profile/other-general access'
);
indexOf('safety, SOS, complaint route, and Quick Exit must be one tap away');

// Help & Redress realignment: the former Quick Exit strip must be folded into
// the Help & Redress panel, before the general route chips, so emergency action
// is seen first instead of buried below route selection.
const redressSectionStart = indexOf('function RedressSection({');
const quickExit = indexOf('{/* ── QUICK EXIT ── */}');
const importantNumbers = indexOf('{/* ── QUICK HELP NUMBERS STRIP ── */}');
const directoriesHub = indexOf('{/* ── UNIFIED DIRECTORIES HUB ── */}');
const routeChips = indexOf('{/* ── ROUTE CHIPS ── */}');
assert(redressSectionStart < quickExit, 'Quick Exit must live inside RedressSection');
assert(quickExit < importantNumbers, 'Quick Exit must appear before important numbers');
assert(importantNumbers < directoriesHub, 'Important numbers must appear before directories hub');
assert(directoriesHub < routeChips, 'Directories hub must appear before route chips/general route selection');


// Front UI order: vision first, merged Help/Redress + Quick Exit above other sections,
// Calm Sound above Community, Community above Daily/report, tester page at the bottom.
const todayStart = indexOf('function TodaySection({');
const frontVision = indexOf('What Aethon Beacon does');
const mergedHelp = indexOf('Help & Redress · Quick Exit');
const calmSound = indexOf('Front door to the full sound library');
const communityFront = indexOf('styles.homeOverviewCard, styles.homeOverviewCardCommunity');
const dailyReportFront = indexOf('uiCopy.reportTitle');
const testerFront = indexOf('Current tester page · July 15 update');
assert(todayStart < frontVision, 'Front vision block must live inside TodaySection');
assert(frontVision < mergedHelp, 'Vision block must appear before merged Help & Redress');
assert(mergedHelp < calmSound, 'Merged Help & Redress / Quick Exit must appear above Calm Sound');
assert(calmSound < communityFront, 'Calm Sound must appear above Community/message section');
assert(communityFront < dailyReportFront, 'Community/message must appear above Daily Snapshot/report');
assert(dailyReportFront < testerFront, 'Current tester page must be placed at the bottom of the front UI');
indexOf('Emergency, complaint, official help');
indexOf('binaural beats, solfeggio Hz, nature ambience, isochronic pulses');

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
].forEach((marker) => indexOf(marker));

console.log('App upgrades regression passed: section order, Quick Exit + Help & Redress merge, templates/scripts/timelines, admin gate, voice mute, and Gemini counselling enrichment are present.');
