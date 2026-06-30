import { execSync, spawn } from "node:child_process";
import path from "node:path";

function resolveBuildId() {
  const envValue = process.env.EXPO_PUBLIC_BUILD_ID?.trim();
  if (envValue) return envValue;

  try {
    const gitSha = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    })
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "");
    if (gitSha.length > 0) return gitSha;
  } catch {
    // Fall back to a timestamp when git metadata is unavailable.
  }

  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/with-build-id.mjs <command> [args...]");
  process.exit(1);
}

const nodeBinDir = path.dirname(process.execPath);
const env = {
  ...process.env,
  PATH: `${nodeBinDir}:${process.env.PATH ?? ""}`,
  EXPO_PUBLIC_BUILD_ID: resolveBuildId(),
  EXPO_PUBLIC_VERIFICATION_API_BASE_URL:
    process.env.EXPO_PUBLIC_VERIFICATION_API_BASE_URL ?? "http://127.0.0.1:8788",
  LOCAL_VERIFICATION_DEBUG: process.env.LOCAL_VERIFICATION_DEBUG ?? "1"
};

const child = spawn(command, args, {
  stdio: "inherit",
  env
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.log(`${command} exited due to ${signal}`);
    process.exit(1);
    return;
  }

  process.exit(code ?? 0);
});
