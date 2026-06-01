import "./global.css";

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { DEMO_THEME_IDS, ThemeName, palette, themeLabel } from "./src/veneer-themes";

export default function App() {
  const [name, setName] = useState<ThemeName>("default-light");
  const p = palette(name);

  // Layout (flex / spacing) rides NativeWind className utilities — those work.
  // Every THEMED value (color, radius, border, shadow) is applied via inline style
  // from the resolved Veneer token map, so the whole tree re-skins on the normal
  // React re-render when `name` changes. See src/veneer-themes.ts for why the
  // className color utilities are NOT used for theming here.
  const cycleTheme = () => {
    const i = DEMO_THEME_IDS.indexOf(name);
    setName(DEMO_THEME_IDS[(i + 1) % DEMO_THEME_IDS.length]);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView className="flex-1" style={{ backgroundColor: p.surface }}>
        <ScrollView className="flex-1">
          <View className="gap-4 p-5">
            <Text className="text-3xl font-bold" style={{ color: p.text }}>
              Veneer × Expo
            </Text>
            <Text className="text-base" style={{ color: p.textMuted }}>
              One component tree. The styling below is the Veneer “{themeLabel(name)}”
              token map — generated from the same source Veneer ships and applied as
              React Native inline styles, re-skinning live on a normal re-render.
            </Text>

            {/* Themeable card. */}
            <View
              className="gap-3 p-5"
              style={{
                backgroundColor: p.surfaceRaised,
                borderColor: p.border,
                borderWidth: p.borderWidth,
                borderRadius: p.radiusLg,
                boxShadow: p.shadow,
              }}
            >
              <Text className="text-xl font-bold" style={{ color: p.text }}>
                Project card
              </Text>
              <Text className="text-sm" style={{ color: p.textMuted }}>
                surface-raised · border · radius-lg · shadow-card
              </Text>

              <View
                className="p-3"
                style={{ backgroundColor: p.surfaceSunken, borderRadius: p.radiusMd }}
              >
                <Text className="text-sm" style={{ color: p.text }}>
                  A sunken well (surface-sunken).
                </Text>
              </View>

              <Pressable
                className="px-4 py-3 active:opacity-80"
                style={{ backgroundColor: p.primary, borderRadius: p.radiusMd }}
                onPress={cycleTheme}
              >
                <Text
                  className="text-center text-base font-semibold"
                  style={{ color: p.textOnPrimary }}
                >
                  Primary action — tap to cycle theme
                </Text>
              </Pressable>

              <View
                className="px-4 py-3"
                style={{ backgroundColor: p.accent, borderRadius: p.radiusMd }}
              >
                <Text className="text-center text-base font-semibold" style={{ color: p.text }}>
                  Accent chip
                </Text>
              </View>
            </View>

            {/* Explicit theme switcher over the RN-friendly demo set. */}
            <View className="flex-row flex-wrap gap-3">
              {DEMO_THEME_IDS.map((t) => {
                const tp = palette(t);
                const active = name === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setName(t)}
                    className="px-4 py-3"
                    style={{
                      backgroundColor: active ? tp.primary : p.surfaceSunken,
                      borderColor: p.border,
                      borderWidth: p.borderWidth,
                      borderRadius: p.radiusMd,
                    }}
                  >
                    <Text
                      className="text-center font-semibold"
                      style={{ color: active ? tp.textOnPrimary : p.text }}
                    >
                      {themeLabel(t)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-xs" style={{ color: p.textMuted }}>
              Tap to watch color, corner radius, border weight and shadow re-skin live.
              All 13 Veneer builtin themes are generated into the data layer; the
              switcher shows the five that survive RN’s lack of blur/gradient/layered
              shadow — see README.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
