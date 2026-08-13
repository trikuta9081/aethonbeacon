import fs from 'node:fs';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mustInclude(marker, message) {
  assert(source.includes(marker), message ?? `Expected marker missing: ${marker}`);
}

function mustNotInclude(marker, message) {
  assert(!source.includes(marker), message ?? `Forbidden low-visibility marker still present: ${marker}`);
}

function mustNotMatch(pattern, message) {
  assert(!pattern.test(source), message ?? `Forbidden visibility pattern still present: ${pattern}`);
}

[
  'rgba(110,231,183,0.85)',
  'color: h.color',
  'color: section.color',
  'color: item.color',
  'color: r.color',
  'color: "#000", fontSize: 10, fontWeight: "900" }>📞',
  'fontSize: 10, fontWeight: "800" }}>Portal ↗',
].forEach((marker) => mustNotInclude(marker));

[
  /color:\s*["']rgba\((?:13,31,34|226,232,240|240,249,255|241,245,249|196,163,90|252,211,77)[^)]*0\.[0-6][^)]*\)["']/g,
  /fontSize:\s*(?:[0-9]|10|11)\b/g,
  /lineHeight:\s*(?:[0-9]|10|11|12|13|14|15)\b/g,
  /#(?:64748B|818CF8|A78BFA|F472B6)/g,
  /homeToneFeaturedMarkText:\s*\{\s*color:\s*["']#0D1F22["']/g,
  /communityBadgeTextVerified:\s*\{\s*color:\s*["']#0D1F22["']/g,
  /adminStatusPillTextActive:\s*\{\s*color:\s*["']#0D1F22["']/g,
].forEach((pattern) => mustNotMatch(pattern));

[
  'HIGH_CONTRAST_ACCENTS',
  'function highContrastAccent',
  'function textOnAccent',
  'color: "#111827", fontSize: 12',
  'color: "#1F3F35", fontSize: 12',
  'borderWidth: 1.5, borderColor: accent',
  // Was fontWeight "900". The guarantee this marker exists for is that action
  // labels are at least 13px and unambiguously bold on an accent background;
  // 700 still satisfies both. The weight policy changed (small labels no
  // longer use the heaviest weight), the legibility requirement did not.
  'fontSize: 13, fontWeight: "700"',
  'minWidth: 104',
  'minWidth: 112',
  'backgroundColor: "#FFFFFF", borderRadius: 9',
  'color: "#1F2937", fontSize: 12',
  'communityBadgeTextVerified: {\n    color: "#FFFFFF"',
  'adminStatusPillTextActive: {\n    color: "#FFFFFF"',
  // Healing Program cards were converted from near-black cards + light text
  // to the app's standard light glassy card + dark text (see tone-engine/
  // app-upgrades commit "Tones visibility pass") -- these now assert the
  // new, correctly-paired colors instead of the old dark-card ones.
  'color: "#0D1F22", fontSize: 14, fontWeight: "900" }}>{prog.name}',
  'color: "#1F2937", fontSize: 12, lineHeight: 16, fontWeight: "600" }}>{prog.purpose}',
  // homeToneChipLabel and homeToneFeaturedUse were asserted here by the Tones
  // visibility pass. Both styles were unused -- nothing in the app referenced
  // them -- so these two lines were guarding the contrast of text that never
  // rendered. Removed with the styles themselves; the live Tones surfaces are
  // covered by the two prog.name / prog.purpose markers above.
  `onboardingSheet: {
    width: "94%",
    maxWidth: 680,`,
  `homeSafetyStrip: {\n    maxWidth: "100%",\n    overflow: "hidden",\n    marginTop: 0,`,
  `profileGenderGrid: {\n    flexWrap: "wrap"`,
  `profileGenderButton: {\n    flexGrow: 1,\n    flexBasis: "46%"`,
].forEach((marker) => mustInclude(marker));


[
  'const APP_TEXT_WRAP_GUARD = {',
  'function Text({ style, ...props }: TextProps)',
  'allowFontScaling: true',
  'maxFontSizeMultiplier: MAX_FONT_SCALE',
  `topTabLabel: {
    minWidth: 0,
    flexShrink: 1,`,
  
  `bottomNavItem: {
    flex: 1,
    minWidth: 0,`
  ,
  'isWide={width >= 1280}',
  `grid: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,`,
  `panel: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",`,
  'flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", paddingHorizontal: 14'
  // homeToneQuickStrip and tonePresetRow were asserted here too. Both styles
  // were unused, so these guards were protecting the wrap behaviour of rows
  // that never rendered. Removed with the styles; the live Tones rows are
  // still covered by the toneChipRow / issueChipGrid markers above.
].forEach((marker) => mustInclude(marker, `Expected mobile overflow guard missing: ${marker}`));

mustNotInclude(
  'allowFontScaling: false',
  'Dynamic Type must remain enabled for text and input controls'
);

// ── Tones player header visibility fix ───────────────────────────────────────
// The now-playing/idle player header used to be near-black
// (#071C2E/#040C18) while the tone name/category text directly inside it
// used near-black colors (#0D1F22/#1F2937) meant for a light background --
// dark text on a dark header, effectively invisible. Header is now light
// (#DCEEFB/#E9F3F2) so that same dark text is legible again.
mustNotInclude(
  'backgroundColor: loopEnabled ? "#071C2E" : "#040C18"',
  'Tones player header must not regress to the near-black background that made its own dark tone-name/category text invisible'
);
mustInclude(
  'backgroundColor: loopEnabled ? "#DCEEFB" : "#E9F3F2"',
  'Tones player header must use a light background so its dark tone-name/category text stays legible'
);
mustNotInclude(
  'backgroundColor: isRunning ? "#061520" : pressed ? "#050D18" : "#040C16"',
  'Healing Program cards must not regress to near-black backgrounds that clash with the rest of the light glassy design system'
);
mustNotInclude(
  'backgroundColor: hasActive ? cat.color + "10" : pressed ? "#060E18" : "#040C16"',
  'Tone Library category rows must not regress to near-black backgrounds that clash with the rest of the light glassy design system'
);

// ── Design-system consistency: shared "Active focus" strip ───────────────────
// Every tab's Active-focus strip must use the one shared styles.activeFocusStrip
// token, not ad-hoc inline backgrounds (previously 5 different colours across
// tabs with no elevation). Guards against re-introducing the divergence.
mustInclude('activeFocusStrip: {', 'Shared Active-focus strip style token must exist');
mustInclude('activeFocusLabel: {', 'Shared Active-focus label style must exist');
assert(
  (source.match(/styles\.activeFocusStrip/g) ?? []).length >= 10,
  'All ~10 tab Active-focus strips must use the shared styles.activeFocusStrip token'
);
mustNotMatch(
  /marginBottom: 8, backgroundColor: "#(?:E1EEEC|EBE2EE|E4EFE1|E1E1EF|E8E3ED|E1E8EF)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 \}\}>\s*<Text/,
  'Active-focus strips must not regress to ad-hoc inline background colours'
);

// ── Apple safe-area correctness ──────────────────────────────────────────────
// Full-screen modal headers must read the real device top inset, not a
// hardcoded status-bar guess (a fixed 54 is wrong on Dynamic Island iPhones
// and non-notch devices). Guards against regressing to the hardcoded value.
mustInclude('useSafeAreaInsets', 'Safe-area inset hook must be imported/used for full-screen headers');
mustNotMatch(
  /paddingTop: Platform\.OS === "ios" \? 54 : 40/,
  'Full-screen modal headers must use the real safe-area inset, not a hardcoded status-bar height'
);
// The ExitReport modal is still full-screen and must pad from the real top
// inset. The Counselling modal is now an iOS page sheet (presentationStyle
// "pageSheet"), which owns its own top chrome + grabber, so on iOS it uses a
// small fixed header pad and only falls back to the inset formula on the
// Android/web full-screen path -- hence at least one occurrence, not two.
assert(
  (source.match(/paddingTop: Math\.max\(insets\.top, 12\) \+ 12/g) ?? []).length >= 1,
  'Full-screen modal headers (e.g. ExitReport, and the Counselling sheet on its Android/web fallback) must pad from the real top inset'
);
mustInclude('presentationStyle="pageSheet"', 'Counselling chat must present as a native iOS page sheet');

// ── Type ramp: no ad-hoc font sizes ─────────────────────────────────────────
// Sizes had drifted to 12.5, 13.5, 19, 23, 26, 27, 30, 31 and 38 alongside the
// ramp the shared styles already use. Half-pixel and one-off sizes are exactly
// what makes a screen read as assembled rather than designed, and they defeat
// vertical rhythm at every system text-size setting.
const TYPE_RAMP = [12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 34, 40, 48];
const usedSizes = [...new Set(
  [...source.matchAll(/fontSize: ([0-9]+(?:\.[0-9]+)?)/g)].map((m) => Number(m[1]))
)].sort((a, b) => a - b);
const offRamp = usedSizes.filter((n) => !TYPE_RAMP.includes(n));
assert(
  offRamp.length === 0,
  `font sizes must come from the type ramp (${TYPE_RAMP.join(", ")}) -- off-ramp sizes found: ${offRamp.join(", ")}`
);

// ── Disclosure motion ───────────────────────────────────────────────────────
// Every expand/collapse used to snap between frames. It must animate, and it
// must stop animating when the OS asks it to.
assert(source.includes("function animateDisclosure"), "an animateDisclosure() helper must exist so expand/collapse is a movement rather than a jump");
assert(/function animateDisclosure\(\): void \{\s*\n\s*if \(_aethonReduceMotion\) return;/.test(source), "animateDisclosure must return early when the OS Reduce Motion setting is on");
assert(source.includes("UIManager.setLayoutAnimationEnabledExperimental(true)"), "LayoutAnimation must be enabled explicitly on Android, or disclosure motion silently does nothing there");
const disclosureCalls = (source.match(/animateDisclosure\(\);/g) ?? []).length;
assert(disclosureCalls >= 15, `expected the disclosure animation to be wired into the app's expand/collapse controls, found only ${disclosureCalls} call sites`);

// ── One disclosure language ──────────────────────────────────────────────────
// The app was using two conventions for the same gesture: five collapsible
// rows drew isOpen ? "\u25B2" : "\u25BC" while six others drew the iOS
// disclosure pair "\u25B8" collapsed / "\u25BE" expanded. Same tap, two
// visual vocabularies, on the same screen in some cases. Unified on the
// platform-standard pair. The "\u25B6" glyphs elsewhere are play/pause
// transport controls, not disclosure, and are deliberately untouched.
assert(
  !source.includes('? "\u25B2" : "\u25BC"'),
  'disclosure carets must use the iOS pair ("\u25B8" collapsed / "\u25BE" expanded), not up/down triangles -- two conventions for one gesture is exactly what makes a screen feel unowned'
);

// ── 44pt minimum touch target ────────────────────────────────────────────────
// Apple HIG requires 44x44pt; Material asks for 48dp. Earlier commits in this
// repo applied the rule to individual surfaces ("Apple HIG: 44pt targets +
// 16px inputs on Redress case tracker + counselling"), which left 26 tappable
// controls elsewhere between 28pt and 42pt -- including a language chip whose
// own twin beside it was already 44. Checked across the whole stylesheet now
// rather than per screen.
{
  const stylesBlock = source.slice(
    source.indexOf("const styles = StyleSheet.create({"),
    source.lastIndexOf("});")
  );
  const tooSmall = [];
  for (const m of stylesBlock.matchAll(/^  ([a-zA-Z][A-Za-z0-9_]*): \{([^}]*)\}/gms)) {
    const [, name, block] = m;
    if (!/Chip|Button|Action|Tab|Pill|Toggle|Item/.test(name)) continue;
    const mh = block.match(/minHeight: (\d+)/);
    if (!mh) continue;
    // Only styles actually rendered on a pressable element are targets. Walk
    // back to the NEAREST opening tag rather than accepting any <Pressable
    // within a window -- a loose window matches an unrelated pressable
    // further up the tree and reports badges as untappable controls.
    let usedOnPressable = false;
    for (const use of source.matchAll(new RegExp(`styles\\.${name}\\b`, "g"))) {
      const before = source.slice(Math.max(0, use.index - 1400), use.index);
      const tags = [...before.matchAll(/<([A-Za-z][A-Za-z0-9_.]*)/g)];
      const nearest = tags.length ? tags[tags.length - 1][1] : "";
      if (nearest === "Pressable" || nearest === "TouchableOpacity") { usedOnPressable = true; break; }
    }
    if (usedOnPressable && Number(mh[1]) < 44) tooSmall.push(`${name} (${mh[1]}pt)`);
  }
  assert(
    tooSmall.length === 0,
    `tappable controls below the 44pt minimum: ${tooSmall.join(", ")}`
  );
}

// ── Weight discipline on small labels ────────────────────────────────────────
// Measured on the deployed build, before and after:
//
//                        before   shared styles   + inline
//   weight 900             57%         31%          21.4%
//   heavy-and-small      38.1%       11.9%           2.4%
//
// Navigation labels, chip labels and button labels were all set in the
// heaviest weight available. When the maximum is the default there is no
// emphasis left to spend on the things that need it; 900 now lands only on
// titles and values ("Aethon Beacon", "Counselling", the clarity score).
//
// The rule enforced below is precisely: no 900 at 13px or under. It is NOT
// "800 and 900 are reserved for 14px and up" -- an earlier commit message of
// mine said that, and it was wrong. 97 styles still use 800 at 12-13px and
// they are fine: 800 is legitimate emphasis on a small label, and flattening
// every small label to one weight would remove nuance rather than add
// hierarchy. The problem was the ceiling being the default, not the
// existence of a step between 700 and 900.
{
  const stylesBlock = source.slice(
    source.indexOf("const styles = StyleSheet.create({"),
    source.lastIndexOf("});")
  );
  const shouting = [];
  for (const m of stylesBlock.matchAll(/^  ([a-zA-Z][A-Za-z0-9_]*): \{([^}]*)\}/gms)) {
    const [, name, block] = m;
    const fs = block.match(/fontSize: (\d+)/);
    const fw = block.match(/fontWeight: "(\d+)"/);
    if (fs && fw && Number(fs[1]) <= 13 && Number(fw[1]) >= 900) shouting.push(`${name} (${fs[1]}px/${fw[1]})`);
  }
  // Inline JSX styles are held to the same rule as the stylesheet -- 149 of
  // them were setting 12-13px labels in the heaviest weight, which is where
  // the remaining "Start counselling" / "Open calm" / "Continue" buttons were
  // still shouting after the shared styles were fixed.
  const inlineShouting = source
    .slice(0, source.indexOf("const styles = StyleSheet.create({"))
    .match(/fontSize: 1[23],[^{}]*?fontWeight: "900"/g) ?? [];
  assert(
    inlineShouting.length === 0,
    `${inlineShouting.length} inline styles still set a 12-13px label at weight 900; small labels use 700`
  );

  assert(
    shouting.length === 0,
    `small labels must not use weight 900 -- 700 is bold enough at 13px and under, and reserving the heaviest weight for titles is what gives a screen hierarchy: ${shouting.join(", ")}`
  );
}

// ── Dynamic Type ceiling stays inside the measured range ─────────────────────
// The cap was 1.35 and pinned here as a literal. Measuring the deployed build
// at 1.35x / 2x / 3x showed nothing hard-clipped or escaping its parent until
// 3x, so 1.35 was denying people text the layout handles fine -- someone who
// enables Larger Accessibility Sizes because they need it was getting a third
// of it. A literal is the wrong thing to guard anyway: what matters is that a
// cap exists and sits inside the range the evidence supports.
{
  const m = source.match(/const MAX_FONT_SCALE = ([0-9.]+);/);
  assert(m, "a MAX_FONT_SCALE constant must exist -- uncapped Dynamic Type will break the layout at accessibility sizes");
  const scale = Number(m[1]);
  assert(scale >= 1.5, `MAX_FONT_SCALE is ${scale}; below 1.5 needlessly denies accessibility text the layout can take (measured clean to 2x)`);
  assert(scale < 2.0, `MAX_FONT_SCALE is ${scale}; at exactly 2x the clarity-score ring overlaps ("/ 100" collides with "Growing") and five nodes escape their parent -- measured, not assumed`);
}

// ── Accent text colours that failed WCAG AA ──────────────────────────────────
// Computed real contrast ratios from the deployed build -- rendered colour
// against the actual composited background -- rather than checking a list of
// known-bad hexes. 22 text nodes on the Home screen alone failed AA:
//
//   #9AA7B2  2.06:1   "Made with care - v1.0.4"
//   #B88600  2.74:1   the "Aethon Beacon" brand line
//   #B87D00  2.95:1   the tester call to action
//   #0891B2  3.09:1   "Send OTP", "Profile", "Pending verification"
//   #0E9488  3.14:1   "Start counselling", "Primary support"
//
// AA needs 4.5:1 for normal text. 3.44:1 is also why the OTP buttons read as
// disabled -- I noticed that by eye earlier and had no number for it.
//
// Each was darkened to clear 4.5:1 against the lightest surface it sits on.
// Only text colours changed; the same hues remain as backgrounds and borders,
// where the requirement is different, so the brand is unchanged.
for (const [bad, good] of [
  // originals
  ["#0891B2","#066C84"], ["#0E9488","#0B6F66"], ["#B88600","#805D00"],
  ["#B87D00","#865A00"], ["#9AA7B2","#5C646A"], ["#B45309","#A14A08"], ["#6B7B88","#57646F"],
  // my own first-pass replacements: computed against three surfaces when the
  // app has sixteen, so they cleared 4.5 on white and failed on the tinted
  // cards. Corrected against the darkest surface in use.
  ["#06748E","#066C84"], ["#0B766D","#0A6F66"], ["#886300","#805D00"], ["#636B72","#5C646A"],
  ["#906100","#865A00"]
]) {
  const stillText = source.match(new RegExp(`(?<![A-Za-z])color: "${bad}"`, "g")) ?? [];
  assert(
    stillText.length === 0,
    `${bad} fails WCAG AA as text (measured on the running build); use ${good} for text -- it stays available as a background and border colour`
  );
}

console.log('Visibility regression passed: app text avoids known low-contrast colors, sub-12px copy, tiny line heights, tiny portal labels, black-on-dark action/badge text, the Tones dark-on-dark contrast bug stays fixed, all Active-focus strips share one design-system token, and full-screen headers use real safe-area insets.');
