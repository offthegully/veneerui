import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { VariableContextProvider } from "nativewind";

import { DEMO_THEME_IDS, type ThemeName, toCssVars } from "./veneer-themes";

interface ThemeContextValue {
  /** The active theme id. */
  theme: ThemeName;
  /** Switch the active theme — re-skins the whole tree. */
  setTheme: (id: ThemeName) => void;
  /** The themes offered by the switcher (curated in veneer-themes.ts). */
  themes: readonly ThemeName[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Wrap your app once. It drives Veneer's theme variables through NativeWind's
 * VariableContextProvider, so every `bg-primary` / `text-text` / `rounded-md` utility
 * below re-skins when `setTheme` is called — no rebuild, the same classes as the web.
 */
export function ThemeProvider({
  children,
  initialTheme = "default-light",
}: {
  children: ReactNode;
  initialTheme?: ThemeName;
}) {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, themes: DEMO_THEME_IDS }),
    [theme],
  );
  return (
    <ThemeContext.Provider value={value}>
      <VariableContextProvider value={toCssVars(theme)}>{children}</VariableContextProvider>
    </ThemeContext.Provider>
  );
}

/** Read/set the active theme. Must be used under <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
