import "./global.css";

import { ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ThemeProvider, useTheme } from "./src/ThemeProvider";
import { ThemeSwitcher } from "./src/ThemeSwitcher";
import { pxToNumber, token } from "./src/veneer-themes";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        {/* NativeWind v5-preview doesn't auto-wire react-native-safe-area-context's
            SafeAreaView, so its `className` (incl. flex-1) is ignored — without an
            inline flex:1 the layout collapses to zero height and renders blank. */}
        <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-surface">
          <Showcase />
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Showcase() {
  const { theme } = useTheme();
  // Root-bridge tokens (no Tailwind utility) → read off the map, applied inline.
  const borderWidth = pxToNumber(token(theme, "border-width-default"));
  const cardShadow = token(theme, "shadow-card");

  return (
    <ScrollView className="flex-1">
      <View className="gap-4 p-5">
        <Text className="text-3xl font-bold text-text">My Veneer app</Text>
        <Text className="text-base text-text-muted">
          Pick a theme — color, corner radius, border weight and shadow re-skin live.
          Everything below is driven by Veneer tokens, same classes as the web.
        </Text>

        <ThemeSwitcher />

        <View
          className="gap-3 rounded-lg border-border bg-surface-raised p-5"
          style={{ borderWidth, boxShadow: cardShadow }}
        >
          <Text className="text-xl font-bold text-text">Card</Text>
          <Text className="text-sm text-text-muted">
            bg-surface-raised · border-border · rounded-lg
          </Text>

          <View className="rounded-md bg-surface-sunken p-3">
            <Text className="text-sm text-text">A sunken well (bg-surface-sunken).</Text>
          </View>

          <View className="rounded-md bg-primary px-4 py-3">
            <Text className="text-center text-base font-semibold text-text-on-primary">
              Primary
            </Text>
          </View>

          <View className="rounded-md bg-accent px-4 py-3">
            <Text className="text-center text-base font-semibold text-text">Accent</Text>
          </View>
        </View>

        <Text className="text-xs text-text-muted">
          Build your screens from token utilities (bg-surface, text-text, rounded-md, …).
          See AGENTS.md for the rules. `npm run gen:tokens` refreshes the token data.
        </Text>
      </View>
    </ScrollView>
  );
}
