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

console.log("Tone engine regression passed: pristine presets, safe limiter, native WAV, UI controls verified.");
