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
].forEach((marker) => mustInclude(marker));

console.log('Visibility regression passed: Help/Redress and directory cards avoid known low-contrast text, tiny portal labels, and black-on-dark call pills.');
