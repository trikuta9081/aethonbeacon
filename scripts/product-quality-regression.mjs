import fs from "node:fs";

const source = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const quality = fs.readFileSync(new URL("../product-quality.ts", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

[
  "PRIMARY_PRODUCT_DESTINATIONS",
  "VEDIC_CALCULATION_STANDARD",
  "classifyCounsellingSafety",
  "COUNSELLING_SAFETY_COPY",
  "REDRESS_CONTENT_STANDARD",
  "LocalProductMetric",
  "ETHICAL_ACCESS_MODEL",
  "BETA_DEVICE_MATRIX"
].forEach((marker) => assert(quality.includes(marker), `Missing product-quality control: ${marker}`));

assert(source.includes('"today",\n      "aihelp",\n      "vedic",\n      "tones",\n      "community",\n      "redress"'), "Primary navigation is not simplified.");
assert(!source.includes('"today",\n      "aihelp",\n      "guide",\n      "redress",\n      "search"'), "Legacy crowded primary navigation remains.");

console.log("Product quality regression passed: focused navigation, calculation transparency, counselling safeguards, redress governance, local metrics, ethical access, and beta coverage standards are present.");
