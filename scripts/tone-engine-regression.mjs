#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";

const app = readFileSync("App.tsx", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const asset = statSync("assets/aethon-pristine-tone.wav");
const studioToneIds = ["studio-crystal", "studio-shimmer", "studio-slow-pulse", "studio-body-scan", "studio-still-point"];
const supportedIssueIds = ["general", "anger", "anxiety", "fear", "overconfidence", "stigma", "burnout", "loneliness", "grief", "identity", "health", "financial", "relationship", "parenting", "trauma", "academic", "addiction"];

function assert(condition, message) {
  if (!condition) {
    console.error(`Tone regression failed: ${message}`);
    process.exit(1);
  }
}

assert(app.includes("type ToneSessionPreset"), "session preset type must exist");
assert(app.includes("type ToneEngineOptions"), "engine options must exist");
assert(app.includes("PRISTINE_TONE_SESSION_PRESETS"), "pristine preset library must exist");
assert((app.match(/id: "(quick-reset|moon-balance|deep-calm|focus-flow|sleep-soft)"/g) ?? []).length >= 5, "all five pristine presets must be present");
assert(app.includes("startContinuousTone(tone: RelaxingToneMode, options: ToneEngineOptions = {})"), "continuous engine must accept options");
assert(app.includes("createDynamicsCompressor"), "web engine must include safety limiter");
assert(app.includes("exponentialRampToValueAtTime(targetGain"), "engine must fade in to safe target gain");
assert(!app.includes("linearRampToValueAtTime(0.82"), "old unsafe 0.82 continuous gain must be removed");
assert(app.includes("aethon-pristine-tone.wav"), "native/audio cue must use the upgraded packaged WAV");
assert(asset.size > 500_000, "upgraded WAV asset should be a real stereo tone, not a tiny placeholder");
assert(app.includes("Playback quality &amp; safety"), "tone UI must show the upgraded playback quality and safety controls");
assert(app.includes("Session preset"), "tone UI must expose session presets");
assert(app.includes("Safe gain"), "tone UI must expose safe gain control");
assert(app.includes("getToneContraindication"), "tone safety copy must be generated per tone family");
assert(pkg.scripts["test:tone"] === "node scripts/tone-engine-regression.mjs", "package.json must expose test:tone");
for (const toneId of studioToneIds) {
  assert(app.includes(`id: "${toneId}"`), `${toneId} must be present in the curated tone library`);
  assert(app.includes(`"${toneId}": require("./assets/tones/${toneId}.wav")`), `${toneId} must use its own bundled native asset`);
  assert(statSync(`assets/tones/${toneId}.wav`).size > 1_000_000, `${toneId} must be a real stereo soundscape, not a placeholder`);
}
assert(app.includes('const isStudio = tone.id.startsWith("studio-")'), "web tone engine must synthesize the original studio soundscapes");
assert(!app.includes("miracle tone") && !app.includes("'natural' concert pitch"), "tone copy must not make unsupported frequency claims");
const issueProgramBlock = app.match(/const ISSUE_TONE_PROGRAMS:[\s\S]*?\n\};\n\/\/ Breathing pattern guide text/);
assert(issueProgramBlock, "issue-specific Calm programme map must exist");
for (const issueId of supportedIssueIds) {
  assert(new RegExp(`^\\s*${issueId}: \\[`, "m").test(issueProgramBlock[0]), `Calm programmes must explicitly cover ${issueId} instead of silently falling back to general`);
}
assert(app.includes("calmMoonComplement"), "Calm must consume the same Moon-chart context used by Path and counselling");
assert(
  app.includes('l("Continue with the practical Path", {'),
  "Calm must provide a localized, clear hand-off into the practical Path"
);
assert(app.includes('const calmProgram = (ISSUE_TONE_PROGRAMS[selectedIssueGuide.id] ?? ISSUE_TONE_PROGRAMS.general)[0]'), "Calm Reset and Path must resolve the same issue-specific programme");
assert(app.includes('Recommended now · {calmProgram.name}'), "Calm Reset must surface the synchronized programme before deeper guidance");
assert(app.includes('activeTab === "focus" ? <FocusSection'), "Calm Reset must not be buried beneath the Meditation library");

// ── "Tone keeps buzzing after Stop" fix ──────────────────────────────────────
// Root causes: (1) masterGain-only cancellation left every individually
// pre-scheduled pulse envelope on bilateral/isochronic/gamma tones' own gain
// nodes still queued; (2) the old approach waited on a JS setTimeout before
// ever calling osc.stop()/disconnect(), and background-tab JS timer
// throttling could delay that indefinitely; (3) React's effect
// cleanup-then-rerun could fire stopContinuousTone twice concurrently,
// racing on the same not-yet-cleared shared engine reference.
assert(app.includes("osc.stop(stopAt)"), "stopContinuousTone must schedule oscillator stops on the WebAudio clock, not rely on a JS setTimeout before stopping audio");
assert(/for \(const g of gainNodes\) \{\s*try \{\s*g\.gain\.cancelScheduledValues\(now\);/.test(app), "stopContinuousTone must cancel scheduled automation on every individual gain node, not only masterGain");
assert(app.includes("_aethonContinuousWindow.__aethonContinuous = undefined"), "stopContinuousTone must claim (null out) the shared engine reference before doing async work, to prevent concurrent stop calls from racing");

// ── Dead "Home mind-rest loop" player removed ────────────────────────────────
// This second, entirely independent continuous-loop player shared the same
// single-instance audio engine as ToneLibrarySection's loop player, but had
// no UI ever wired to turn it on -- its effect still ran on every
// selectedRelaxingToneId change (i.e. every tap of the Home brain-reset
// button) and unconditionally called stopContinuousTone(), silently killing
// any tone actively looping elsewhere in the app.
assert(!app.includes("useState(false); const [mindRestLoopEnabled") && !app.includes("const [mindRestLoopEnabled, setMindRestLoopEnabled] = useState"), "dead mindRestLoopEnabled Home tone-loop state must not be reintroduced -- it had no UI and silently killed unrelated active tones");

// ── "Play matching sound" must be stoppable ──────────────────────────────────
// The Meditation/Practice "Play matching sound" (and "Play audio") cue used
// playRelaxingToneCue with no way to stop it -- once tapped it played out with
// nothing to silence it. There is now a stopRelaxingToneCue() that halts both
// the packaged native sound and the tracked web cue oscillator, the cue
// stops any prior cue before starting (no overlap/buzz), and the buttons are
// real Play/Stop toggles.
assert(app.includes("function stopRelaxingToneCue"), "a stopRelaxingToneCue() must exist so the meditation 'matching sound' cue can be silenced");
assert(/async function playRelaxingToneCue\(tone: RelaxingToneMode\) \{\s*\n\s*\/\/[\s\S]*?stopRelaxingToneCue\(\);/.test(app), "playRelaxingToneCue must stop any prior cue first so taps can't stack into a buzz");
assert(app.includes('"⏹ Stop sound"') && app.includes('"⏹ Stop audio"'), "the meditation matching-sound / play-audio buttons must be Play/Stop toggles");

// ── Every listed tone must actually make its own sound ───────────────────────
// Twenty-two ids (ambient-*, asmr-*, reset-quiet, trend-*) used to fall through
// to a single 174 Hz sine on web and a single generic file on native, so
// choosing "Ambient rain", "Fireplace", "Forest birds" or "Tibetan bowl" all
// produced the identical drone. Guard both halves of that fix.
const listedAmbient = [...new Set(
  [...app.matchAll(/id: "((?:ambient|asmr|trend)-[a-z0-9-]+|reset-quiet)"/g)].map((m) => m[1])
)];
assert(listedAmbient.length >= 20, `expected the ambient/ASMR/trend tone families to still be present, found ${listedAmbient.length}`);

const specBlock = app.slice(app.indexOf("const TONE_TEXTURES"), app.indexOf("async function startContinuousTone"));
const missingSynthesis = listedAmbient.filter((id) => !specBlock.includes(`"${id}"`));
assert(
  missingSynthesis.length === 0,
  `every ambient/ASMR/trend tone needs its own procedural voice (TONE_TEXTURES / TONE_DRONES / TONE_EVENT_LAYERS) instead of falling through to the shared 174 Hz sine -- missing: ${missingSynthesis.join(", ")}`
);

const missingNative = listedAmbient.filter((id) => !app.includes(`"${id}": require("./assets/tones/${id}.mp3")`));
assert(
  missingNative.length === 0,
  `every ambient/ASMR/trend tone needs its own bundled native asset in NATIVE_TONE_ASSETS, or Android/iOS silently serve the shared fallback file -- missing: ${missingNative.join(", ")}`
);

// The generic sine must remain reachable only as a genuine last resort.
assert(
  /Last-resort fallback/.test(app),
  "the 174 Hz sine must be documented as a last-resort fallback, not the default path for whole tone families"
);
assert(
  app.includes("function loop_seam") === false,
  "loop_seam belongs in the Python asset generator, not App.tsx"
);

console.log(`Tone engine regression passed: pristine presets, safe limiter, native WAV, UI controls, reliable audio-clock-scheduled stop, no dead cross-tab-interfering tone state, and all ${listedAmbient.length} ambient/ASMR/trend tones carry their own synthesis + native asset.`);
