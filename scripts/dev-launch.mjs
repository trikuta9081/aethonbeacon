import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";

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
    // Fall through to a local timestamp when git metadata is unavailable.
  }

  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
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

function start(label, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: { ...env, ...extraEnv }
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`${label} exited due to ${signal}`);
    } else {
      console.log(`${label} exited with code ${code}`);
    }
    process.exitCode = code ?? 0;
  });

  return child;
}

console.log("Starting Aethon Beacon local launch stack...");
const nodeBinary = process.execPath;
const codexPnpmBinary = "/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm";
const pnpmBinary = fs.existsSync(codexPnpmBinary) ? codexPnpmBinary : "pnpm";

const verificationServer = start("verification-server", nodeBinary, ["scripts/verification-server.mjs"], {
  VERIFICATION_SERVER_PORT: process.env.VERIFICATION_SERVER_PORT ?? "8788"
});

const expoWebPort = process.env.EXPO_WEB_PORT ?? "4175";
const expo = start("expo-web", pnpmBinary, [
  "exec",
  "expo",
  "start",
  "--web",
  "--localhost",
  "--port",
  expoWebPort
]);

function shutdown() {
  verificationServer.kill("SIGINT");
  expo.kill("SIGINT");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
