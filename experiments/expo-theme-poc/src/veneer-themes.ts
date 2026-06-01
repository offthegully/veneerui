/*
  Thin, hand-written surface over the GENERATED Veneer token data.

  The token VALUES live in ./veneer-themes.generated.ts and are produced by
  `npm run gen:tokens` from Veneer's published source of truth (tokens.css +
  builtin/*.json). Do not hand-edit values here or there — change the upstream
  theme and re-generate. This file only adds the React-Native helpers and curates
  which themes the demo screen offers.
*/
import {
  THEME_TOKENS,
  THEME_META,
  TOKEN_META,
  type TokenName,
  type ThemeId,
} from "./veneer-themes.generated";

export { THEME_TOKENS, THEME_META };
export type { TokenName, ThemeId };
export type TokenMap = Record<TokenName, string>;

/**
 * Themes whose look survives React Native's lack of blur / gradients / layered
 * shadows. The effect-heavy themes (glassmorphic, neumorphic, neon-arcade) are
 * still generated — they're all in THEME_TOKENS — they're just left out of the
 * switcher because they'd degrade. The axes shown here (color, radius, border
 * width, hard shadow) are exactly the ones that port cleanly.
 */
export const DEMO_THEME_IDS = [
  "default-light",
  "default-dark",
  "brutalist",
  "high-contrast",
  "terminal",
] as const satisfies readonly ThemeId[];

export type ThemeName = (typeof DEMO_THEME_IDS)[number];

/** Human label for a theme id (e.g. "default-light" → "Light"). */
export const themeLabel = (id: ThemeId): string => THEME_META[id]?.name ?? id;

// The provider only needs the tokens a className utility resolves via var(): the
// simple scalar, theme-bridge tokens (color / length / number). Filtering by type
// deterministically drops the values RN can't take live anyway — gradients,
// layered/glow shadows (nested var()), easings, font stacks — which the screen
// instead reads straight off the map (see `token()` below), exactly as Veneer
// consumes its root-bridge tokens via var() on the web.
const SCALAR_TYPES = new Set(["color", "length", "number"]);
const PROVIDER_TOKENS = (Object.keys(TOKEN_META) as TokenName[]).filter((n) => {
  const meta = TOKEN_META[n];
  return meta.bridge === "theme" && SCALAR_TYPES.has(meta.type);
});

/**
 * RN analogue of Veneer's applyTheme(): turn a theme into the `--token` record
 * NativeWind's <VariableContextProvider> swaps in. Instead of writing the vars
 * onto document.documentElement, we hand the whole map to a React provider.
 */
export function toCssVars(id: ThemeId): Record<`--${string}`, string> {
  const tokens = THEME_TOKENS[id];
  const out: Record<string, string> = {};
  for (const name of PROVIDER_TOKENS) out[`--${name}`] = tokens[name];
  return out as Record<`--${string}`, string>;
}

/** One resolved token value for a theme — the root-bridge escape hatch (the RN
 *  equivalent of reading `var(--token)`, used for border width / shadow inline). */
export const token = (id: ThemeId, name: TokenName): string => THEME_TOKENS[id][name];

/** Parse a `"3px"` length into the number RN style props want. */
export function pxToNumber(value: string): number {
  return parseFloat(value) || 0;
}

/**
 * A theme resolved into ready-to-apply React Native inline-style values.
 *
 * WHY this exists instead of just using className utilities: in the NativeWind v5
 * *preview* we tested (Expo SDK 56), the generated color utilities (bg-*, text-*,
 * border-*) do NOT resolve their CSS variable at runtime — verified by rendering on
 * web, where bg-primary computes to transparent even though <VariableContextProvider>
 * sets --color-primary on the root. Only layout utilities and inline styles work.
 *
 * So the portable, engine-independent way to drive Veneer tokens in RN today is a
 * plain JS theme object applied through `style={…}` — which re-skins on the normal
 * React re-render when the active theme changes. That's what `palette()` returns.
 * (Token DATA still comes straight from Veneer via the codegen — see THEME_TOKENS.)
 */
export function palette(id: ThemeId) {
  const t = (n: TokenName) => THEME_TOKENS[id][n];
  return {
    surface: t("color-surface"),
    surfaceRaised: t("color-surface-raised"),
    surfaceSunken: t("color-surface-sunken"),
    primary: t("color-primary"),
    accent: t("color-accent"),
    text: t("color-text"),
    textMuted: t("color-text-muted"),
    textOnPrimary: t("color-text-on-primary"),
    border: t("color-border"),
    radiusMd: pxToNumber(t("radius-md")),
    radiusLg: pxToNumber(t("radius-lg")),
    borderWidth: pxToNumber(t("border-width-default")),
    shadow: t("shadow-card"),
  };
}

export type Palette = ReturnType<typeof palette>;
