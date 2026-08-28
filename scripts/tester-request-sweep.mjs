#!/usr/bin/env node
/**
 * tester-request-sweep.mjs
 *
 * Reads the NAYIQ tester-request log (NDJSON, one JSON object per line,
 * appended to by scripts/static-server.mjs) and emits two paste-ready artifacts
 * for the Play Console Email list flow, plus a summary to stdout.
 *
 * Why this exists:
 *   Google's Android Publisher API cannot mutate Play Console "Email lists,"
 *   so newly-submitted Android tester Gmails can't be auto-added the way
 *   TestFlight is on iOS. Until the Alpha track's audience is switched back
 *   to a Google Group, the owner must paste new Gmails into a Play Console
 *   email list by hand. This script produces the paste block once a day.
 *
 * Usage:
 *   node scripts/tester-request-sweep.mjs [--log <path>] [--out <dir>] [--since <ISO date>]
 *
 * Defaults:
 *   --log   /tmp/aethon-tester-requests.ndjson  (env: TESTER_REQUESTS_LOG_PATH)
 *   --out   ./outputs
 *   --since (no filter; include everything)
 *
 * Output files:
 *   <out>/android-testers-to-add.txt   one Gmail per line
 *   <out>/android-testers-to-add.csv   single column, header "Email address"
 *   <out>/tester-sweep-summary.json    machine-readable counts
 *
 * Exit codes:
 *   0 on success (even if 0 new Gmails)
 *   1 on I/O or parse failure
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

function parseArgs(argv) {
  const args = {
    log: process.env.TESTER_REQUESTS_LOG_PATH?.trim() || "/tmp/aethon-tester-requests.ndjson",
    out: join(repoRoot, "outputs"),
    since: null
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--log" && value) { args.log = value; i += 1; continue; }
    if (flag === "--out" && value) { args.out = value; i += 1; continue; }
    if (flag === "--since" && value) { args.since = new Date(value); i += 1; continue; }
    if (flag === "--help" || flag === "-h") {
      process.stdout.write(`Usage: node scripts/tester-request-sweep.mjs [--log <path>] [--out <dir>] [--since <ISO date>]\n`);
      process.exit(0);
    }
  }
  if (args.since && Number.isNaN(args.since.getTime())) {
    process.stderr.write(`--since could not be parsed as a date\n`);
    process.exit(1);
  }
  return args;
}

function normalizeEmail(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function isAndroidPlatform(platform) {
  if (typeof platform !== "string") return false;
  const p = platform.toLowerCase();
  return p.includes("android") || p.includes("play");
}

async function readLog(path) {
  try {
    await stat(path);
  } catch {
    return { text: "", missing: true };
  }
  return { text: await readFile(path, "utf8"), missing: false };
}

async function main() {
  const args = parseArgs(process.argv);
  const { text, missing } = await readLog(args.log);

  const seen = new Map(); // email -> first-seen entry
  let totalLines = 0;
  let androidLines = 0;
  let skippedInvalid = 0;
  let skippedBySince = 0;

  if (!missing && text) {
    for (const rawLine of text.split(/\r?\n/)) {
      if (!rawLine.trim()) continue;
      totalLines += 1;
      let entry;
      try {
        entry = JSON.parse(rawLine);
      } catch {
        skippedInvalid += 1;
        continue;
      }
      if (!isAndroidPlatform(entry.platform)) continue;
      androidLines += 1;

      if (args.since) {
        const receivedAt = new Date(entry.receivedAt || entry.timestamp || entry.time || 0);
        if (Number.isNaN(receivedAt.getTime()) || receivedAt < args.since) {
          skippedBySince += 1;
          continue;
        }
      }

      const email = normalizeEmail(entry.email);
      if (!email) { skippedInvalid += 1; continue; }
      if (!seen.has(email)) seen.set(email, entry);
    }
  }

  const emails = [...seen.keys()].sort();
  await mkdir(args.out, { recursive: true });

  const txtPath = join(args.out, "android-testers-to-add.txt");
  const csvPath = join(args.out, "android-testers-to-add.csv");
  const summaryPath = join(args.out, "tester-sweep-summary.json");

  await writeFile(txtPath, emails.join("\n") + (emails.length ? "\n" : ""), "utf8");
  await writeFile(
    csvPath,
    "Email address\n" + emails.map((e) => `${e}\n`).join(""),
    "utf8"
  );
  const summary = {
    generatedAt: new Date().toISOString(),
    logPath: args.log,
    logMissing: missing,
    since: args.since ? args.since.toISOString() : null,
    totals: {
      linesRead: totalLines,
      androidLines,
      uniqueAndroidEmails: emails.length,
      skippedInvalid,
      skippedBySince
    },
    outputs: { txt: txtPath, csv: csvPath }
  };
  await writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  process.stdout.write(
    `tester-sweep: ${emails.length} unique Android Gmail(s) from ${androidLines} Android request(s) ` +
    `(${totalLines} total lines, ${skippedInvalid} invalid, ${skippedBySince} filtered by --since)\n`
  );
  process.stdout.write(`  txt: ${txtPath}\n`);
  process.stdout.write(`  csv: ${csvPath}\n`);
  process.stdout.write(`  summary: ${summaryPath}\n`);
  if (missing) {
    process.stdout.write(
      `\nNote: ${args.log} does not exist yet. Either no submissions have arrived, ` +
      `or the server is writing the log to a different path. Set TESTER_REQUESTS_LOG_PATH ` +
      `or pass --log to point at the correct file.\n`
    );
  } else if (!emails.length) {
    process.stdout.write(
      `\nNo Android Gmails to add today. If you expected some, check the platform field ` +
      `in the raw log and confirm form submissions are still reaching /api/tester-request.\n`
    );
  } else {
    process.stdout.write(
      `\nNext step: open Play Console → NAYIQ → Testing → Closed testing → Alpha → ` +
      `Testers → NAYIQ Android Testers → Edit list, and paste the contents of ` +
      `${txtPath} into the "Email addresses" box. Save. Then send the opt-in link to any ` +
      `new addresses.\n`
    );
  }
}

main().catch((error) => {
  process.stderr.write(`tester-sweep failed: ${error?.stack || error?.message || String(error)}\n`);
  process.exit(1);
});
