const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.transformer.minifierConfig = { mangle: false, compress: false };
module.exports = config;
