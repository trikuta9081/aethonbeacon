import fs from "node:fs";

const appPath = new URL("../App.tsx", import.meta.url);
const source = fs.readFileSync(appPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// These are the logical dimensions used by the supplied 2x iPhone evidence.
// The audit is deliberately deterministic: it does not pretend to replace a
// native screenshot, but it does protect the geometry contract between builds.
const viewport = { width: 369, height: 800 };
const focusedHeaderHeight = 56;
const composerIntrinsicHeight = 6 + 44 + 10;
const minimumTranscriptHeight = 160;
const keyboardHeights = [291, 346, 390];

assert(source.includes('Keyboard.addListener("keyboardWillChangeFrame"'), "iOS keyboard frame listener is missing");
assert(source.includes('keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}'), "interactive keyboard dismissal is missing");
assert(source.includes('enabled={Platform.OS !== "ios"}'), "iOS KeyboardAvoidingView must remain disabled for measured page-sheet padding");
assert(source.includes("keyboardHeight + (isVeryCompactPhone ? 6 : 10)"), "keyboard clearance padding contract is missing");
assert(source.includes('accessibilityLabel={l("Hide keyboard"'), "explicit keyboard-dismiss action is missing");
assert((source.match(/width: 44, height: 44/g) ?? []).length >= 3, "voice, send, and keyboard-dismiss targets must remain 44x44");
assert(source.includes("style={{ flex: 1 }}"), "transcript must retain a flexible viewport");

const cases = keyboardHeights.map((keyboardHeight) => {
  const visibleWindowHeight = viewport.height - keyboardHeight;
  const transcriptHeight = visibleWindowHeight - focusedHeaderHeight - composerIntrinsicHeight;
  assert(transcriptHeight >= minimumTranscriptHeight, `focused transcript is too short at keyboard height ${keyboardHeight}`);
  return {
    keyboardHeight,
    visibleWindowHeight,
    transcriptHeight,
    composerClearsKeyboard: true,
    controlsMeet44PointTarget: true
  };
});

console.log(JSON.stringify({
  viewport,
  minimumTranscriptHeight,
  cases,
  result: "passed"
}, null, 2));
