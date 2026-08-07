#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";

const app = readFileSync("App.tsx", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const asset = statSync("assets/aethon-pristine-tone.wav");

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
assert(app.includes("Pristine Tone Engine"), "tone UI must show the upgraded engine controls");
assert(app.includes("Session preset"), "tone UI must expose session presets");
assert(app.includes("Safe gain"), "tone UI must expose safe gain control");
assert(app.includes("getToneContraindication"), "tone safety copy must be generated per tone family");
assert(pkg.scripts["test:tone"] === "node scripts/tone-engine-regression.mjs", "package.json must expose test:tone");

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

console.log("Tone engine regression passed: pristine presets, safe limiter, native WAV, UI controls, reliable audio-clock-scheduled stop, and no dead cross-tab-interfering tone state verified.");
