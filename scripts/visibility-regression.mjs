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
  'fontSize: 13, fontWeight: "900"',
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
  'homeToneChipLabel: {\n    color: "#0D1F22"',
  'homeToneFeaturedUse: {\n    color: "#111827"',
  `onboardingSheet: {
    width: "94%",
    maxWidth: 680,`,
  `homeSafetyStrip: {\n    maxWidth: "100%",\n    overflow: "hidden",\n    marginTop: 0,`,
].forEach((marker) => mustInclude(marker));


[
  'const APP_TEXT_WRAP_GUARD = {',
  'function Text({ style, ...props }: TextProps)',
  `topTabLabel: {
    minWidth: 0,
    flexShrink: 1,`,
  `homeToneQuickStrip: {
    flexDirection: "row",
    flexWrap: "wrap",`,
  `tonePresetRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap"`,
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
].forEach((marker) => mustInclude(marker, `Expected mobile overflow guard missing: ${marker}`));

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

console.log('Visibility regression passed: app text avoids known low-contrast colors, sub-12px copy, tiny line heights, tiny portal labels, black-on-dark action/badge text, the Tones dark-on-dark contrast bug stays fixed, and all Active-focus strips share one design-system token.');
