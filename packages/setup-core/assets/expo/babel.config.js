// NativeWind v5 is babel-free: no `nativewind/babel` preset and no
// `jsxImportSource`. babel-preset-expo also wires react-native-worklets
// (Reanimated v4) for us on this SDK.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
