import { Pressable, Text, View } from "react-native";

import { useTheme } from "./ThemeProvider";
import { pxToNumber, themeLabel, token } from "./veneer-themes";

/**
 * A row of theme buttons. Colors and corner radius come from className utilities
 * (swapped by the provider); border width is a root-bridge token with no Tailwind
 * utility, so it's read off the token map and applied inline — Veneer's var() escape
 * hatch, in RN form.
 */
export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const borderWidth = pxToNumber(token(theme, "border-width-default"));

  return (
    <View className="flex-row flex-wrap gap-2">
      {themes.map((id) => {
        const active = id === theme;
        return (
          <Pressable
            key={id}
            onPress={() => setTheme(id)}
            className={
              "rounded-md border-border px-3 py-2 " +
              (active ? "bg-primary" : "bg-surface-sunken")
            }
            style={{ borderWidth }}
          >
            <Text
              className={
                "text-sm font-semibold " + (active ? "text-text-on-primary" : "text-text")
              }
            >
              {themeLabel(id)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
