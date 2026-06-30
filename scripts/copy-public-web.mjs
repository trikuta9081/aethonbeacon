import { cp, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("public");
const target = resolve("dist");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(source))) {
  console.log("No public web assets to copy.");
  process.exit(0);
}

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Copied public web assets from ${source} to ${target}`);
