// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Alias expo-audio to a no-op stub on web to prevent "Cannot find native module 'ExpoAudio'" crash.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "expo-audio") {
    return {
      filePath: path.resolve(__dirname, "expo-audio-web-stub.js"),
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Metro's default terser output escapes every non-ASCII character as \uXXXX.
// This app ships large Hindi, Telugu, Tamil and Urdu copy, so that escaping
// inflated the web bundle by roughly 2 MB. scripts/static-server.mjs serves
// JavaScript as "application/javascript; charset=utf-8", so the literal
// characters are safe to emit and the bundle stays ~40% smaller.
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  output: {
    ...(config.transformer.minifierConfig?.output ?? {}),
    ascii_only: false,
  },
};

module.exports = config;
