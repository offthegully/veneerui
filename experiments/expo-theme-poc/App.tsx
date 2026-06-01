import "./global.css";

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { VariableContextProvider } from "nativewind";

import {
  DEMO_THEME_IDS,
  ThemeName,
  toCssVars,
  token,
  pxToNumber,
  themeLabel,
} from "./src/veneer-themes";

export default function App() {
  const [name, setName] = useState<ThemeName>("default-light");

  // Theme-bridge tokens (colors, radius) ride NativeWind className utilities and are
  // swapped by overriding their CSS variables through VariableContextProvider.
  // Root-bridge tokens (border width, shadow) have no Tailwind utility namespace, so
  // they're read off the token map and applied inline — Veneer's var() escape hatch.
  const borderWidth = pxToNumber(token(name, "border-width-default"));
  const cardShadow = token(name, "shadow-card");

  const cycleTheme = () => {
    const i = DEMO_THEME_IDS.indexOf(name);
    setName(DEMO_THEME_IDS[(i + 1) % DEMO_THEME_IDS.length]);
  };

  return (
    <SafeAreaProvider>
      <VariableContextProvider value={toCssVars(name)}>
        <StatusBar style="auto" />
        <SafeAreaView className="flex-1 bg-surface">
          <ScrollView className="flex-1">
            <View className="gap-4 p-5">
              <Text className="text-3xl font-bold text-text">Veneer × Expo</Text>
              <Text className="text-base text-text-muted">
                One component tree. The styling below is the Veneer “{themeLabel(name)}”
                token map, swapped at runtime through NativeWind’s
                VariableContextProvider — same semantic classes as the web.
              </Text>

              <View
                className="gap-3 rounded-lg border-border bg-surface-raised p-5"
                style={{ borderWidth, boxShadow: cardShadow }}
              >
                <Text className="text-xl font-bold text-text">Project card</Text>
                <Text className="text-sm text-text-muted">
                  bg-surface-raised · border-border · rounded-lg
                </Text>

                <View className="rounded-md bg-surface-sunken p-3">
                  <Text className="text-sm text-text">A sunken well (bg-surface-sunken).</Text>
                </View>

                <Pressable
                  className="rounded-md bg-primary px-4 py-3 active:opacity-80"
                  onPress={cycleTheme}
                >
                  <Text className="text-center text-base font-semibold text-text-on-primary">
                    Primary action — tap to cycle theme
                  </Text>
                </Pressable>

                <View className="rounded-md bg-accent px-4 py-3">
                  <Text className="text-center text-base font-semibold text-text">
                    Accent chip (bg-accent)
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {DEMO_THEME_IDS.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setName(t)}
                    className={
                      "rounded-md border-border px-4 py-3 " +
                      (name === t ? "bg-primary" : "bg-surface-sunken")
                    }
                    style={{ borderWidth }}
                  >
                    <Text
                      className={
                        "text-center font-semibold " +
                        (name === t ? "text-text-on-primary" : "text-text")
                      }
                    >
                      {themeLabel(t)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-xs text-text-muted">
                Tap to watch color, corner radius, border weight and shadow re-skin live.
                All 13 Veneer builtin themes are generated; the switcher shows five.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </VariableContextProvider>
    </SafeAreaProvider>
  );
}
