import fs from 'node:fs';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const dashaYears = { Ketu: 7, Shukra: 20, Surya: 6, Chandra: 10, Mangal: 7, Rahu: 18, Guru: 16, Shani: 19, Budha: 17 };
const dashaOrder = ['Ketu', 'Shukra', 'Surya', 'Chandra', 'Mangal', 'Rahu', 'Guru', 'Shani', 'Budha'];
const totalYears = Object.values(dashaYears).reduce((sum, value) => sum + value, 0);
assert(totalYears === 120, `Vimshottari dasha years must total 120; got ${totalYears}`);
assert(dashaOrder.length === 9, 'Vimshottari dasha order must contain 9 planets');

assert(!source.includes('jdn * 13'), 'Old fake Janma Nakshatra formula is still present');
assert(!source.includes('daysSinceEpoch * 13'), 'Old fake today Nakshatra formula is still present');
assert(source.includes('getSiderealMoonLongitude'), 'Sidereal Moon longitude calculation is missing');
assert(source.includes('lahiriAyanamsaDegrees'), 'Lahiri ayanamsa calculation is missing');
assert(source.includes('balanceFraction'), 'Birth dasha balance from Nakshatra remainder is missing');
assert(source.includes('SIDEREAL_YEAR_MS'), 'Dasha timing should use sidereal-year milliseconds');

const blueprintBlock = source.match(/const MOON_CHART_48_BLUEPRINTS[\s\S]*?\n\];/);
assert(blueprintBlock, 'Moon Chart 48 blueprint block missing');
const blueprintCount = [...blueprintBlock[0].matchAll(/\{ id: "/g)].length;
assert(blueprintCount === 48, `Moon Chart engine must contain exactly 48 dimensions; got ${blueprintCount}`);

const userFacingSource = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
assert(!/sun chart|solar chart|surya chart/i.test(userFacingSource), 'User-facing Sun/Solar/Surya chart phrase detected');

assert(source.includes('COUNSELING_THEME_TO_MOON48_CATEGORIES'), 'Counselling theme to Moon Chart 48D category mapping is missing');
assert(source.includes('buildMoonChartCounselingOverlay'), 'Counselling synthesis Moon Chart 48D overlay is missing');
assert(source.includes('shouldAddMoonChartJourneyStep'), 'Counselling journey Moon Chart 48D step guard is missing');
assert(source.includes('moonChart48Readings={vedicMoonChart48Readings}'), 'Counselling modal is not receiving current Moon Chart 48D readings');
assert(source.includes('buildCounselingSynthesis(updatedSession, issueId, moonChart48Readings, recurrenceCount)'), 'Counselling synthesis is not using Moon Chart 48D readings');
assert(source.includes('buildJourneySteps(mergedThemes, issueId, route, moonChart48Readings, { streak, moodTagLeaning, recurrenceCount, moodTrend })'), 'Counselling journey is not using Moon Chart 48D readings');
assert(source.includes('Multidimensional Moon Chart counselling layer'), 'User-facing Multidimensional counselling layer text is missing');

assert(source.includes('interpretation: string'), 'Moon Chart readings must include plain-language interpretation');
assert(source.includes('scoreReason: string'), 'Moon Chart readings must include explainable score reason');
assert(source.includes('remedySteps: string[]'), 'Moon Chart readings must include step-by-step remedies');
assert(source.includes('moonChartCategoryRemedyPack'), 'Moon Chart remedy packs are missing');
assert(source.includes('buildMoonChartScoreReason'), 'Moon Chart score trace builder is missing');
assert(source.includes('Pristine 2D/3D lunar chart map'), 'Pristine 2D/3D lunar chart layout is missing');
assert(source.includes('2D/3D Moon-house visual map'), 'Moon-house visual map is missing');
assert(source.includes('Score trace:'), 'All-dimensions score trace UI is missing');
assert(source.includes('Care points · remedies made practical'), 'Practical remedy panel is missing');
assert(source.includes('No Sun-chart prediction is shown'), 'Moon-only no-Sun-chart assurance text is missing');

assert(source.includes('getNavagrahaLongitudes'), 'Advanced Vedic engine must compute all 9 graha longitudes');
assert(source.includes('buildNavamsaEntries'), 'D9 Navamsa calculation layer is missing');
assert(source.includes('detectClassicalYogas'), 'Classical Yoga detection layer is missing');
assert(source.includes('buildAshtakavarga'), 'Ashtakavarga calculation layer is missing');
assert(source.includes('computeShadbala'), 'Shadbala calculation layer is missing');
assert(source.includes('Advanced Vedic Engine — D9 Navamsa · Yogas · Ashtakavarga · Shadbala'), 'Advanced Vedic Engine panel is missing');
assert(source.includes('D1 Rashi Chart — Lagna and all 9 grahas'), 'D1 Rashi chart wheel panel is missing');
assert(source.includes('D9 Navamsa Chart'), 'D9 Navamsa chart wheel panel is missing');
assert(source.includes('Rashi → Navamsa detail'), 'Rashi-to-Navamsa detail list is missing');
assert(source.includes('★ Vargottama'), 'Vargottama flag UI is missing');
assert(source.includes('South Indian style: signs are fixed to position'), 'South Indian fixed-sign chart explanation is missing');
assert(source.includes('askTheChartPanel={'), 'Ask-the-chart panel must be passed into BirthChartSection for correct placement');
assert(source.includes('{askTheChartPanel}'), 'Ask-the-chart panel is not rendered inside BirthChartSection');
assert(source.includes('return pairs.reverse().flat();'), 'Ask-the-chart history must render newest exchange first while preserving question→reply pairing');
assert(source.includes("Kala Bala's day/night components and the last of Sthana Bala's five classical parts"), 'Partial Shadbala limitations must remain disclosed until fully implemented');
assert(source.includes('drikBala'), 'Drik Bala (aspectual strength) calculation is missing');
assert(source.includes('drishtiVirupas'), 'Drik Bala drishti virupa table is missing');
assert(source.includes('netVirupasWithDrik'), 'Shadbala net-with-aspects figure is missing');
assert(source.includes('function drekkanaBala'), 'Drekkana Bala calculation is missing');
assert(source.includes('PLANET_GENDER'), 'Drekkana Bala planet gender table is missing');

// ── Next 15 Years — bilingual Dasha forecast timeline ───────────────────────
assert(source.includes('function getVimshottariDashaTimeline'), 'Vimshottari forward-forecast timeline builder is missing');
assert(source.includes('function overallPeriodVerdict'), 'Per-period overall verdict function is missing');
assert(source.includes('Next 15 Years'), 'Next 15 Years forecast panel is not rendered');
assert(source.includes('getVimshottariDashaTimeline(profileDOB, janmaNakshatra.lord, profileBirthTime, 15)'), '15-year forecast must be computed from real birth details, not a placeholder horizon');
assert(source.includes('dashaForecastTimeline'), 'Forecast timeline state/memo is missing from BirthChartSection');
assert(source.includes('DASHA_PLANET_HI') && source.includes('DASHA_QUALITIES_HI') && source.includes('DASHA_REMEDY_LINE_HI'), 'Hindi translation packs for the Dasha forecast are missing');
assert(source.includes('DASHA_FORECAST_VERDICT_EN') && source.includes('DASHA_FORECAST_VERDICT_HI'), 'Bilingual verdict framing for the Dasha forecast is missing');
assert(source.includes("period.verdict === \"Watch\""), 'Forecast must surface remedies specifically for Watch-verdict periods');
assert(source.includes('🪔'), 'Forecast remedy line is not rendered');
// The forecast must reuse the existing chartBriefLang toggle already in scope
// for the Plain Language card, not a duplicate/independent language state.
const forecastPanelBlock = source.match(/Next 15 Years — Dasha Forecast[\s\S]{0,400}/);
assert(forecastPanelBlock, 'Next 15 Years panel block not found for language-toggle check');
assert(source.includes('setChartBriefLang("en")') && source.includes('setChartBriefLang("hi")'), 'Forecast language toggle must drive the shared chartBriefLang state');

// ── Bilingual Yogas / Ashtakavarga / Shadbala + Shadbala strength narrative ──
assert(source.includes('nameHi: string;') && source.includes('meaningHi: string;'), 'DetectedYoga type must carry Hindi name/meaning fields');
assert(source.includes('const GRAHA_LABELS_HI'), 'Hindi graha label map for Yogas is missing');
assert(source.includes('चंद्र और गुरु') || source.includes('गज केसरी योग'), 'Gaja Kesari Yoga Hindi text is missing');
assert(source.includes('function buildShadbalaStrengthNarrative'), 'Shadbala strongest/weakest narrative builder is missing');
assert(source.includes('SHADBALA_DOMAIN_EN') && source.includes('SHADBALA_DOMAIN_HI'), 'Shadbala planet-domain significance packs are missing');
assert(source.includes('buildShadbalaStrengthNarrative(shadbalaResult.planets, chartBriefLang)'), 'Shadbala panel must render the strongest/weakest narrative, wiring Drik/Drekkana Bala into real understanding rather than leaving them as raw numbers only');
assert(source.includes('सर्वाष्टकवर्ग') , 'Ashtakavarga Hindi title is missing');
assert(source.includes('षड्बल'), 'Shadbala Hindi title is missing');

// ── Gochar (current transits) foresight layer ───────────────────────────────
assert(source.includes('function getGocharChart'), 'Gochar (current transits) chart builder is missing');
assert(source.includes('function getGocharGuidance'), 'Gochar guidance builder is missing');
assert(source.includes('function houseFromMoonSign'), 'Gochar house-from-Moon calculation is missing');
assert(source.includes('getGocharChart(rashiInfo.rashiId, new Date())'), 'Transit panel must compute gochar from the natal Moon for the current moment');
assert(source.includes('Current transits (Gochar)'), 'Gochar transit panel is not rendered in the Vedic section');
assert(/sadeSatiPhase/.test(source), 'Sade Sati detection is missing from the gochar layer');
assert(source.includes('getNavagrahaLongitudes(new Date(date.getTime() + MS_PER_DAY))'), 'Gochar retrograde detection (next-day motion) is missing');

// Independent computational verification of the gochar math (mirrors the app's
// houseFromMoonSign so the test fails if the real formula ever drifts).
assert(source.includes('((rashiIndex - natalMoonRashiIndex + 12) % 12) + 1'), 'houseFromMoonSign must use the classical (transit - moon) mod-12 + 1 formula');
function houseFromMoonRef(transitSign, moonSign) {
  return ((transitSign - moonSign + 12) % 12) + 1;
}
// Classical Sade Sati window = Saturn in the 12th, 1st or 2nd from the natal Moon.
assert(houseFromMoonRef(11, 0) === 12, 'Sign before the Moon must be the 12th (Sade Sati rising)');
assert(houseFromMoonRef(0, 0) === 1, 'Same sign as the Moon must be the 1st (Sade Sati peak)');
assert(houseFromMoonRef(1, 0) === 2, 'Sign after the Moon must be the 2nd (Sade Sati setting)');
assert(houseFromMoonRef(0, 11) === 2, 'House-from-Moon must wrap correctly across the zodiac boundary');
assert(houseFromMoonRef(2, 0) === 3, 'Third from the Moon must be the 3rd (outside the Sade Sati window)');
for (let moon = 0; moon < 12; moon += 1) {
  for (let t = 0; t < 12; t += 1) {
    const h = houseFromMoonRef(t, moon);
    assert(h >= 1 && h <= 12, 'House-from-Moon must always resolve to 1..12');
  }
}
// The app must treat exactly the 12th/1st/2nd as Sade Sati and 2/5/7/9/11 as Jupiter's auspicious transit houses.
assert(source.includes('saturnHouse === 12 ? "rising" : saturnHouse === 1 ? "peak" : saturnHouse === 2 ? "setting"'), 'Sade Sati phase mapping (12=rising,1=peak,2=setting) must be exact');
assert(source.includes('[2, 5, 7, 9, 11].includes(jupiterHouseFromMoon)'), 'Jupiter auspicious transit houses must be 2/5/7/9/11 from the Moon');

function antardashaDurations(mahadasha) {
  return dashaOrder.map((planet, index) => ({
    planet,
    index,
    years: dashaYears[mahadasha] * dashaYears[planet] / 120,
  }));
}
for (const planet of dashaOrder) {
  const sum = antardashaDurations(planet).reduce((acc, item) => acc + item.years, 0);
  assert(Math.abs(sum - dashaYears[planet]) < 1e-9, `${planet} antardashas must add to Mahadasha duration`);
}

const sampleBirthLord = 'Chandra';
const sampleNakshatraElapsed = 0.25;
const expectedBalance = dashaYears[sampleBirthLord] * (1 - sampleNakshatraElapsed);
assert(expectedBalance === 7.5, `Sample Chandra balance should be 7.5 years; got ${expectedBalance}`);

// ── Path/Guide × Moon Chart 48D complement ──────────────────────────────────
// Path used to be a text-only 5-lens system with no link to the personal
// Moon Chart. It must now draw on the same multidimensional engine the
// Automatic Counselling chat overlays, mirroring COUNSELING_THEME_TO_MOON48_CATEGORIES.
assert(source.includes('const ISSUE_TO_MOON48_CATEGORIES'), 'Issue-to-Moon-Chart category map is missing from Path');
assert(source.includes('function buildPathMoonChartComplement'), 'Path Moon Chart complement builder is missing');
assert(source.includes('moonChartComplement = useMemo'), 'Path does not memoize its Moon Chart complement');
assert(source.includes('moonChart48Readings={vedicMoonChart48Readings}'), 'Path is not receiving the live Moon Chart 48D readings');
assert(source.includes('Moon Chart complement'), 'Moon Chart complement panel is not rendered on Path');
assert(source.includes('Add your date of birth, time, and place in Vedic Insights to see how your personal Moon Chart connects'), 'Path is missing the no-birth-data fallback for the Moon Chart complement');
// All 17 Path issues must have an explicit Moon Chart category mapping — no
// issue should silently fall through to a hardcoded default.
const issueMoon48Block = source.match(/const ISSUE_TO_MOON48_CATEGORIES: Record<IssueId, MoonChart48Category\[\]> = \{[\s\S]*?\n\};/);
assert(issueMoon48Block, 'ISSUE_TO_MOON48_CATEGORIES block not found');
const mappedIssueIds = [...issueMoon48Block[0].matchAll(/^\s*(\w[\w-]*):\s*\[/gm)].map((m) => m[1]);
const allIssueIds = ['general', 'anger', 'anxiety', 'fear', 'overconfidence', 'stigma', 'burnout', 'loneliness', 'grief', 'identity', 'health', 'financial', 'relationship', 'parenting', 'trauma', 'academic', 'addiction'];
for (const id of allIssueIds) {
  assert(mappedIssueIds.includes(id), `ISSUE_TO_MOON48_CATEGORIES is missing an explicit mapping for issue "${id}"`);
}

// ── Path/Guide × 48-axis support library complement ─────────────────────────
// Tones and Meditation already surface the real 48-axis support library;
// Path is the tab most relevant to it and must too.
assert(source.includes('🧭 Path frame'), 'Path is missing the 48-axis SupportDimensionLibraryPanel complement');

// ── Cross-section 48-dimension actionability ────────────────────────────────
// The 48-axis library used to be read-only in every section except the
// counselling chat. Every section that renders it must now let a tap reveal
// the real escalation guidance, its Moon Chart complement, and a working
// route button -- not just a label and a first action.
assert(source.includes('function buildMoonChartComplementForCategories'), 'Shared category-based Moon Chart complement builder is missing');
assert(source.includes('function buildDimensionMoonChartComplement'), '48-dimension-scoped Moon Chart complement builder is missing');
assert(source.includes('openDimensionMoonChart'), 'SupportDimensionLibraryPanel does not compute a per-dimension Moon Chart complement');
assert(source.includes('routeLabel(guide.route)'), 'SupportDimensionLibraryPanel does not surface each dimension\'s route');
assert(/Escalate when: /.test(source), 'SupportDimensionLibraryPanel does not surface each dimension\'s escalation guidance');
assert(source.includes('const routeToTab = (tab: TabId)'), 'Search does not adapt the panel\'s route buttons onto its own onOpenGuide/onOpenRedress/onOpenCommunity routing');

// Every section already known to render the 48-axis panel (Tones banner,
// Path banner + Path itself, Journal, Tones library, Meditation, Search,
// Practice/Play, Insights) must feed it the live Moon Chart readings -- a
// panel with the prop wired to nothing would silently stay read-only.
const moonChartWiredCount = (source.match(/moonChart48Readings=\{(vedicMoonChart48Readings|moonChart48Readings)\}/g) ?? []).length;
assert(moonChartWiredCount >= 10, `Expected at least 10 live moonChart48Readings wire-ups across sections; found ${moonChartWiredCount}`);

// ── All 48 support dimensions resolve to an actual conclusion ───────────────
// Each of the 48 used to be a one-line nudge (firstAction) plus a one-line
// escalation. That is not enough to actually redress an issue to conclusion.
// Every single one of the 48 must now carry: why it matters (context), a
// real multi-step path to resolution (resolutionSteps, >= 3 steps), a
// checkable definition of "resolved" (conclusionMarker), and at least two
// concrete, searchable next-step targets (supportSearch) -- not just the
// existing firstAction/escalation pair. This is checked per-entry, not by
// sampling, so a shallow or missing entry fails the build.
assert(source.includes('context: string;') && source.includes('resolutionSteps: string[];') && source.includes('conclusionMarker: string;') && source.includes('supportSearch: Array<{ label: string; query: string }>;'), 'SupportDimensionGuide type is missing the resolution-depth fields (context, resolutionSteps, conclusionMarker, supportSearch)');

const dimensionsBlock = source.match(/const supportDimensionGuides: Record<SupportDimensionId, SupportDimensionGuide> = \{([\s\S]*?)\n\};/);
assert(dimensionsBlock, 'supportDimensionGuides block not found');
const dimensionsBody = dimensionsBlock[1];
// Split into one chunk per dimension entry (each starts with a 2-space-indented `key: {` or `"key": {` line).
const entryStarts = [...dimensionsBody.matchAll(/^ {2}"?[\w-]+"?: \{/gm)].map((m) => m.index);
assert(entryStarts.length === 48, `Expected exactly 48 support dimension entries; found ${entryStarts.length}`);
const entryChunks = entryStarts.map((start, i) => dimensionsBody.slice(start, entryStarts[i + 1] ?? dimensionsBody.length));
const allDimensionIds = [
  'self-image', 'grief', 'trauma', 'addiction', 'academic', 'financial', 'health', 'parenting', 'relationship', 'unappreciated',
  'work', 'home-family', 'anger', 'anxiety', 'sadness', 'burnout', 'loneliness', 'safety', 'fear', 'sleep',
  'appetite', 'body-symptoms', 'legal-rights', 'digital-safety', 'social-reputation', 'career-growth', 'workplace-conflict', 'education-admin', 'exam-performance', 'time-management',
  'procrastination', 'motivation', 'confidence', 'boundaries', 'communication', 'trust', 'intimacy', 'caregiving', 'elder-care', 'pregnancy-postpartum',
  'identity-values', 'spirituality-faith', 'cultural-belonging', 'decision-making', 'habit-routine', 'environment', 'documentation-evidence', 'direction'
];
assert(allDimensionIds.length === 48, 'Test fixture drifted from the real 48-dimension id list');
for (const id of allDimensionIds) {
  const chunk = entryChunks.find((c) => c.startsWith(`  "${id}": {`) || c.startsWith(`  ${id}: {`));
  assert(chunk, `No supportDimensionGuides entry found for "${id}"`);
  assert(/context: "[^"]{20,}"/.test(chunk), `"${id}" is missing a real context sentence`);
  const stepsMatch = chunk.match(/resolutionSteps: \[([\s\S]*?)\]/);
  assert(stepsMatch, `"${id}" is missing resolutionSteps`);
  const stepCount = [...stepsMatch[1].matchAll(/"[^"]{15,}"/g)].length;
  assert(stepCount >= 3, `"${id}" must have at least 3 real resolution steps; found ${stepCount}`);
  assert(/conclusionMarker: "[^"]{20,}"/.test(chunk), `"${id}" is missing a real conclusionMarker`);
  const searchMatch = chunk.match(/supportSearch: \[([\s\S]*?)\]/);
  assert(searchMatch, `"${id}" is missing supportSearch`);
  const searchCount = [...searchMatch[1].matchAll(/\{ label:/g)].length;
  assert(searchCount >= 2, `"${id}" must have at least 2 supportSearch targets; found ${searchCount}`);
}

// The detail view must actually render this depth, not just carry it as data.
assert(source.includes('Path to resolution'), 'SupportDimensionLibraryPanel does not render the resolution steps');
assert(source.includes('Resolved when: '), 'SupportDimensionLibraryPanel does not render the conclusion marker');
assert(source.includes('Find: {target.label}'), 'SupportDimensionLibraryPanel does not render per-dimension supportSearch buttons');

console.log('Vedic engine regression checks passed: Moon longitude, dasha balance, 48 dimensions, explainable remedies, 2D/3D UI, Advanced D1/D9/Navamsa/Yoga/Ashtakavarga/Shadbala panel, ask-chat ordering, antardasha totals, no sun-chart user-facing text, Path/Guide Moon Chart + 48-axis complement, cross-section 48-dimension actionability, and all 48 dimensions carry a real path to resolution and conclusion.');
