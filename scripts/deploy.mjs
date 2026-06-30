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
    // Fall through to a timestamp when git metadata is unavailable.
  }

  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function usage() {
  console.log("Usage: node scripts/deploy.mjs <tester|production|testify> <android|ios|web>");
}

const [target = "", platform = ""] = process.argv.slice(2).map((value) => value.trim().toLowerCase());

if (!target || !platform) {
  usage();
  process.exit(1);
}

const buildProfiles = {
  tester: "preview",
  production: "production",
  testify: "production"
};

const profile = buildProfiles[target];
if (!profile) {
  usage();
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

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("exit", (code, signal) => {
      if (signal) {
        console.log(`${command} exited due to ${signal}`);
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

async function main() {
  if (platform === "web") {
    const code = await run(process.execPath, ["scripts/with-build-id.mjs", "pnpm", "run", "export:web"]);
    process.exit(code);
    return;
  }

  if (platform !== "android" && platform !== "ios") {
    usage();
    process.exit(1);
  }

  const easArgs = ["eas-cli", "build", "--platform", platform, "--profile", profile];
  if (target === "testify" && platform === "ios") {
    easArgs.push("--auto-submit");
  }

  const code = await run("pnpm", ["dlx", ...easArgs]);
  process.exit(code);
}

void main();
