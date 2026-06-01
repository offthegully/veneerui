/*
  Thin, hand-written surface over the GENERATED Veneer token data.

  The token VALUES live in ./veneer-themes.generated.ts and are produced by
  `npm run gen:tokens` from the Veneer package you installed. Don't hand-edit values
  here or there — upgrade Veneer (or edit a theme upstream) and re-generate. This file
  only adds the React-Native helpers and curates which themes the switcher offers.
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
 * shadows. The effect-heavy themes (glassmorphic, neumorphic, neon-arcade) are still
 * generated — they're all in THEME_TOKENS — they're just left out of the switcher
 * because they'd degrade. Add/remove ids here to change what the switcher shows.
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

// The provider carries the tokens a className utility resolves via var() at runtime:
// the theme-bridge tokens. Filtering by type to simple scalars (color/length/number)
// keeps the payload to what utilities actually read — gradients, layered/glow shadows
// (nested var()), easings and font stacks are left out (read the few you need off the
// map via `token()`).
const SCALAR_TYPES = new Set(["color", "length", "number"]);
const PROVIDER_TOKENS = (Object.keys(TOKEN_META) as TokenName[]).filter((n) => {
  const meta = TOKEN_META[n];
  return meta.bridge === "theme" && SCALAR_TYPES.has(meta.type);
});

/**
 * RN analogue of Veneer's applyTheme(): turn a theme into the `--token` record
 * NativeWind's <VariableContextProvider> swaps in. The className color and radius
 * utilities (`bg-primary`, `rounded-md`, …) re-resolve and the tree re-skins.
 */
export function toCssVars(id: ThemeId): Record<`--${string}`, string> {
  const tokens = THEME_TOKENS[id];
  const out: Record<string, string> = {};
  for (const name of PROVIDER_TOKENS) out[`--${name}`] = tokens[name];
  return out as Record<`--${string}`, string>;
}

/** One resolved token value for a theme — the root-bridge escape hatch (the RN
 *  equivalent of reading `var(--token)`, used for border width / shadow inline,
 *  since those tokens have no Tailwind utility namespace). */
export const token = (id: ThemeId, name: TokenName): string => THEME_TOKENS[id][name];

/** Parse a `"3px"` length into the number RN style props want. */
export function pxToNumber(value: string): number {
  return parseFloat(value) || 0;
}
