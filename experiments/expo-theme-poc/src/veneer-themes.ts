/*
  Two Veneer themes, ported as plain data.

  Values are lifted verbatim from the Veneer repo's builtin themes
  (packages/theme/src/builtin/{default-light,brutalist}.json) merged over the
  schema defaults (packages/theme/src/schema.ts) — exactly how Veneer's
  tokenValue() resolves a theme on the web: `theme.tokens[name] ?? default`.

  This is the portable half of Veneer: the token map is pure JSON. The web
  runtime (DOM mutation, localStorage, anti-flash) is NOT used here — NativeWind's
  VariableContextProvider replaces it (see App.tsx).
*/

export type TokenName =
  | "color-primary"
  | "color-primary-hover"
  | "color-accent"
  | "color-surface"
  | "color-surface-raised"
  | "color-surface-sunken"
  | "color-text"
  | "color-text-muted"
  | "color-text-on-primary"
  | "color-border"
  | "color-focus-ring"
  | "radius-md"
  | "radius-lg"
  | "border-width-default"
  | "shadow-card";

export type TokenMap = Record<TokenName, string>;

/** Veneer `default-light` (the fallback theme — these are the schema defaults). */
export const lightTheme: TokenMap = {
  "color-primary": "#3b82f6",
  "color-primary-hover": "#2563eb",
  "color-accent": "#06b6d4",
  "color-surface": "#ffffff",
  "color-surface-raised": "#f9fafb",
  "color-surface-sunken": "#f3f4f6",
  "color-text": "#111827",
  "color-text-muted": "#4b5563",
  "color-text-on-primary": "#ffffff",
  "color-border": "#e5e7eb",
  "color-focus-ring": "#3b82f6",
  "radius-md": "8px",
  "radius-lg": "12px",
  "border-width-default": "1px",
  "shadow-card": "0px 2px 8px rgba(0,0,0,0.12)",
};

/** Veneer `brutalist` — sharp corners, heavy black borders, hard offset shadow. */
export const brutalistTheme: TokenMap = {
  "color-primary": "#ff4d00",
  "color-primary-hover": "#e64500",
  "color-accent": "#00e5ff",
  "color-surface": "#fefce8",
  "color-surface-raised": "#ffffff",
  "color-surface-sunken": "#f7f3d0",
  "color-text": "#000000",
  "color-text-muted": "#1a1a1a",
  "color-text-on-primary": "#000000",
  "color-border": "#000000",
  "color-focus-ring": "#000000",
  "radius-md": "0px",
  "radius-lg": "0px",
  "border-width-default": "3px",
  "shadow-card": "4px 4px 0px 0px #000000",
};

export const THEMES = { light: lightTheme, brutalist: brutalistTheme };
export type ThemeName = keyof typeof THEMES;

/**
 * Convert a Veneer token map into the `--token` CSS-variable record that
 * NativeWind's VariableContextProvider expects. This is the RN analogue of
 * Veneer's applyTheme() — instead of writing vars onto document.documentElement,
 * we hand the whole map to a React provider.
 */
export function toCssVars(tokens: TokenMap): Record<`--${string}`, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(tokens)) {
    out[`--${name}`] = value;
  }
  return out as Record<`--${string}`, string>;
}

/** Parse a `"3px"` length into the number RN style props want. */
export function pxToNumber(value: string): number {
  return parseFloat(value) || 0;
}
