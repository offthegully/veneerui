import "./global.css";

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { VariableContextProvider } from "nativewind";

import { THEMES, ThemeName, toCssVars, pxToNumber } from "./src/veneer-themes";

export default function App() {
  const [name, setName] = useState<ThemeName>("light");
  const theme = THEMES[name];

  // theme-bridge tokens (colors, radius) ride the CSS-variable cascade via the
  // provider; root-bridge tokens (border width, shadow) are read off the map and
  // applied with inline style — the RN equivalent of Veneer's var() escape hatch.
  const borderWidth = pxToNumber(theme["border-width-default"]);
  const cardShadow = theme["shadow-card"];

  return (
    <SafeAreaProvider>
      <VariableContextProvider value={toCssVars(theme)}>
        <StatusBar style="auto" />
        <SafeAreaView className="flex-1 bg-surface">
          <ScrollView className="flex-1">
            <View className="gap-4 p-5">
              <Text className="text-3xl font-bold text-text">Veneer × Expo</Text>
              <Text className="text-base text-text-muted">
                One component tree. The styling below is the Veneer “{name}” token
                map, swapped at runtime through NativeWind’s VariableContextProvider —
                no rebuild, no re-import.
              </Text>

              {/* Themeable card: colors + radius via className (theme bridge),
                  border width + shadow via inline style (root bridge). */}
              <View
                className="gap-3 rounded-lg border-border bg-surface-raised p-5"
                style={{ borderWidth, boxShadow: cardShadow }}
              >
                <Text className="text-xl font-bold text-text">Project card</Text>
                <Text className="text-sm text-text-muted">
                  bg-surface-raised · border-border · rounded-lg
                </Text>

                <View className="rounded-md bg-surface-sunken p-3">
                  <Text className="text-sm text-text">
                    A sunken well (bg-surface-sunken).
                  </Text>
                </View>

                <Pressable
                  className="rounded-md bg-primary px-4 py-3 active:opacity-80"
                  onPress={() => setName(name === "light" ? "brutalist" : "light")}
                >
                  <Text className="text-center text-base font-semibold text-text-on-primary">
                    Primary action — tap to toggle theme
                  </Text>
                </Pressable>

                <View className="rounded-md bg-accent px-4 py-3">
                  <Text className="text-center text-base font-semibold text-text">
                    Accent chip (bg-accent)
                  </Text>
                </View>
              </View>

              {/* Explicit theme switcher. */}
              <View className="flex-row gap-3">
                {(["light", "brutalist"] as ThemeName[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setName(t)}
                    className={
                      "flex-1 rounded-md border-border px-4 py-3 " +
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
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-xs text-text-muted">
                Toggle to watch color, corner radius, border weight and shadow
                re-skin live. Shadows/gradients/blur are the known React Native
                gap — see README.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </VariableContextProvider>
    </SafeAreaProvider>
  );
}
