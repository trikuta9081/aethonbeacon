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
  'color: "#24384A", fontSize: 12',
  'color: "#1F3F35", fontSize: 12',
  'borderWidth: 1.5, borderColor: accent',
  'fontSize: 13, fontWeight: "900"',
  'minWidth: 104',
  'minWidth: 112',
  'backgroundColor: "#FFFFFF", borderRadius: 9',
  'color: "#3F4B5F", fontSize: 12',
  'communityBadgeTextVerified: {\n    color: "#FFFFFF"',
  'adminStatusPillTextActive: {\n    color: "#FFFFFF"',
  'color: "#F8FAFC", fontSize: 14, fontWeight: "900" }}>{prog.name}',
  'color: "#EAF2F8", fontSize: 12, lineHeight: 16, fontWeight: "700" }}>{prog.purpose}',
  'homeToneChipLabel: {\n    color: "#0D1F22"',
  'homeToneFeaturedUse: {\n    color: "#24384A"',
  'homeVisionIntroCard',
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
].forEach((marker) => mustInclude(marker, `Expected mobile overflow guard missing: ${marker}`));

console.log('Visibility regression passed: app text avoids known low-contrast colors, sub-12px copy, tiny line heights, tiny portal labels, and black-on-dark action/badge text.');
