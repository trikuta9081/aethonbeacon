import fs from "node:fs";

const source = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

[
  "meditationSourceLibrary",
  "sanatanaMeditationStages",
  "getLocalizedSanatanaMeditationStage",
  "supportPracticeFocusByDimension",
  "getSupportPracticeProfile",
  "getLocalizedSupportPracticeCopy",
  "buildCounsellingPracticeOrchestration"
].forEach((marker) => assert(source.includes(marker), `Missing meditation/support control: ${marker}`));

[
  "Bhagavad Gita",
  "Svetasvatara Upanishad",
  "Maitri Upanishad",
  "Patanjali Yoga Sutra",
  "Sat-Cakra-Nirupana",
  "Hatha Yoga Pradipika",
  "Ministry of AYUSH Common Yoga Protocol"
].forEach((title) => assert(source.includes(title), `Missing named source: ${title}`));

[
  'traditionLayer: "upanishadic"',
  'traditionLayer: "patanjala"',
  'traditionLayer: "tantric-hatha"',
  'traditionLayer: "modern-support"'
].forEach((marker) => assert(source.includes(marker), `Missing historical layer: ${marker}`));

const stageBlock = source.match(/const sanatanaMeditationStages: SanatanaMeditationStage\[\] = \[([\s\S]*?)\n\];/);
assert(stageBlock, "Sanatana meditation-stage catalogue is missing");
const stageIds = [...stageBlock[1].matchAll(/^\s{4}id: "([^"]+)"/gm)].map((match) => match[1]);
assert(stageIds.length === 7, `Expected exactly seven meditation stages; found ${stageIds.length}`);
assert(new Set(stageIds).size === 7, "Meditation stage IDs must be unique");
[
  "intent",
  "place",
  "breath",
  "withdrawal",
  "concentration",
  "meditation",
  "integration"
].forEach((id) => assert(stageIds.includes(id), `Missing meditation stage: ${id}`));

const chakraBlock = source.match(/const meditationChakraTeachings: MeditationChakra\[\] = \[([\s\S]*?)\n\];/);
assert(chakraBlock, "Chakra teaching catalogue is missing");
const chakraIds = [...chakraBlock[1].matchAll(/^\s{4}id: "([^"]+)"/gm)].map((match) => match[1]);
[
  "root",
  "sacral",
  "solar",
  "heart",
  "throat",
  "thirdEye",
  "crown"
].forEach((id) => assert(chakraIds.includes(id), `Missing chakra teaching: ${id}`));
[
  "Muladhara",
  "Svadhisthana",
  "Manipura",
  "Anahata",
  "Visuddha",
  "Ajna",
  "Sahasrara"
].forEach((name) => assert(chakraBlock[1].includes(`sanskrit: "${name}"`), `Missing chakra name: ${name}`));
assert(chakraIds.length === 7, `Expected seven chakra teaching entries; found ${chakraIds.length}`);
assert((chakraBlock[1].match(/sourceIds:/g) ?? []).length === 7, "Every chakra entry must name its sources");
assert((chakraBlock[1].match(/safety:/g) ?? []).length === 7, "Every chakra entry must carry safety guidance");
assert((chakraBlock[1].match(/officialPracticeUrl:/g) ?? []).length === 7, "Every chakra entry must route to an official practice guide");

assert(!source.includes("videoQuery"), "Generic chakra-video search must not return");
assert(!chakraBlock[1].includes("youtube.com/results"), "Uncurated YouTube-result links must not be used for chakra practice guidance");
[
  "not a medical diagnosis",
  "qualified teacher",
  "Meditation is secondary here.",
  "does not claim that one modern seven-colour chakra chart appears unchanged across all Vedic scripture"
].forEach((marker) => assert(source.includes(marker), `Missing safety/provenance disclosure: ${marker}`));

const dimensionMapBlock = source.match(/const supportPracticeFocusByDimension: Record<[\s\S]*?= \{([\s\S]*?)\n\};/);
assert(dimensionMapBlock, "48-dimension meditation/support map is missing");
const dimensionIds = [...dimensionMapBlock[1].matchAll(/^\s{2}(?:"([^"]+)"|([a-zA-Z0-9]+)): \{/gm)].map((match) => match[1] ?? match[2]);
assert(dimensionIds.length === 48, `Expected exactly 48 synchronized support mappings; found ${dimensionIds.length}`);
assert(new Set(dimensionIds).size === 48, "All 48 synchronized support mappings must have unique IDs");

[
  "Synchronized support plan",
  "48-dimension synchronized focus",
  "Coordinated 48-dimension plan",
  "Path / Help / Redress",
  "Seven stages from intention to action",
  "Read the text behind the teaching"
].forEach((marker) => assert(source.includes(marker), `Missing visible synchronized teaching marker: ${marker}`));

[
  'practicePlan.copy.calmCue',
  'practicePlan.copy.pathHandoff',
  'tabId: "focus"',
  'tabId: "guide"',
  'tabId: "meditation"',
  'tabId: "tones"',
  'tabId: "community"',
  'tabId: "redress"',
  'tabId: "vedic"',
  'Message or reach out'
].forEach((marker) => assert(source.includes(marker), `Counselling orchestration is missing: ${marker}`));

assert(
  source.includes('stop if it feels uncomfortable'),
  'The synchronized Tone handoff must retain an explicit comfort-based stop rule'
);
assert(
  source.includes('does not replace professional or urgent help'),
  'The synchronized Message handoff must preserve professional/urgent-help boundaries'
);
assert(
  source.includes('const selectedVoiceText = languageId === "english"'),
  'Meditation voice guidance must branch on the selected app language instead of always reading English'
);
assert(
  source.includes('Keep the breath natural. Stop if you feel pain, dizziness, panic, or disorientation.'),
  'Localized meditation voice guidance must retain a spoken stop rule'
);

console.log("Meditation/Dharma regression passed: seven-stage source-led practice, explicit historical layers, safety controls, seven chakra entries, official guidance links, all 48 support mappings, and Counselling handoffs across Calm, Path, Meditation, Tone, Message, Vedic, and Help/Redress are present.");
