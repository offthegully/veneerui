// NativeWind v5 wires Tailwind through PostCSS (postcss.config.mjs); the Metro
// integration no longer takes an `input` option the way v4 did.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config);
