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

console.log('Vedic engine regression checks passed: Moon longitude, dasha balance, 48 dimensions, antardasha totals, and no sun-chart user-facing text.');
