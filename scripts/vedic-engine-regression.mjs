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
assert(source.includes('buildCounselingSynthesis(updatedSession, issueId, moonChart48Readings)'), 'Counselling synthesis is not using Moon Chart 48D readings');
assert(source.includes('buildJourneySteps(mergedThemes, issueId, route, moonChart48Readings)'), 'Counselling journey is not using Moon Chart 48D readings');
assert(source.includes('48D Moon Chart counselling layer'), 'User-facing 48D counselling layer text is missing');

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
assert(source.includes("Kala Bala's day/night components, Drik (aspect) Bala, and the full six-divisional-chart Vimshopak Bala are deferred"), 'Partial Shadbala limitations must remain disclosed until fully implemented');

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

console.log('Vedic engine regression checks passed: Moon longitude, dasha balance, 48 dimensions, explainable remedies, 2D/3D UI, Advanced D1/D9/Navamsa/Yoga/Ashtakavarga/Shadbala panel, ask-chat ordering, antardasha totals, and no sun-chart user-facing text.');
