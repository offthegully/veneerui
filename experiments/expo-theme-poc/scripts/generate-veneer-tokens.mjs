/*
  generate-veneer-tokens — the anti-drift codegen for the Expo POC.

  PROBLEM it solves: a port that hand-copies hex values from Veneer becomes a
  silent third copy of the theme data. Edit a builtin theme upstream and this app
  drifts with no error. (Veneer already fights the same hazard between its builtin
  and gallery theme copies.)

  FIX: derive everything mechanically from the SAME source of truth Veneer ships,
  reading exactly what a real downstream consumer would:

    1. packages/theme/tokens.generated.css   — the published `@offthegully/veneerui/
       tokens.css`. Its `@theme {}` block IS the theme-bridge tokens (+ their
       defaults); its `:root {}` block IS the root-bridge tokens. This file is
       itself generated from schema.ts and CI-checked, so it cannot drift.
    2. packages/theme/theme-v1.json           — the published JSON Schema. Each
       token's `type` (color/length/shadow/…) is recorded here; we use it to
       decide which tokens are simple scalars safe to feed the runtime provider.
    3. packages/theme/src/builtin/*.json      — each theme's authored token
       OVERRIDES (the same shape a gallery contributor writes).

  Resolution mirrors Veneer's tokenValue() exactly: `override ?? default`.

  OUTPUTS (both marked do-not-edit; run `npm run gen:tokens` to refresh):
    - global.css                      — Tailwind/NativeWind entry: the two imports
                                        + the verbatim @theme/:root token blocks.
                                        This is the real tokens.css, consumed as-is.
    - src/veneer-themes.generated.ts  — TOKEN_BRIDGE map, THEME_META, and every
                                        builtin theme fully resolved to a flat map.

  Pure Node (fs/path/url) — no deps, no TS toolchain — so the POC stays
  self-contained. Run from the app dir: `node scripts/generate-veneer-tokens.mjs`.
*/
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, ".."); // experiments/expo-theme-poc
const repoRoot = join(app, "..", ".."); // veneerui repo root
const themePkg = join(repoRoot, "packages", "theme");

const TOKENS_CSS = join(themePkg, "tokens.generated.css");
const THEME_SCHEMA_JSON = join(themePkg, "theme-v1.json");
const BUILTIN_DIR = join(themePkg, "src", "builtin");

// ── 1. Parse the published tokens.css into [{ name, default, bridge }] ───────────
// @theme {} → bridge 'theme' (generates a utility); :root {} → bridge 'root'.
function parseTokensCss(css) {
  const tokens = [];
  let block = null; // 'theme' | 'root' | null
  for (const raw of css.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("@theme") && line.includes("{")) { block = "theme"; continue; }
    if (line.startsWith(":root") && line.includes("{")) { block = "root"; continue; }
    if (line === "}") { block = null; continue; }
    if (!block) continue;
    // A value may hold commas, parens, var(), color-mix(), quotes — but never a
    // newline or a bare `}`, so one declaration per line parses cleanly.
    const m = line.match(/^--([a-zA-Z0-9-]+):\s*(.+);$/);
    if (m) tokens.push({ name: m[1], default: m[2].trim(), bridge: block });
  }
  if (!tokens.length) throw new Error(`No tokens parsed from ${TOKENS_CSS}`);
  return tokens;
}

// ── 1b. Pull each token's `type` from the published JSON Schema ──────────────────
// Generated descriptions end with "(<type>, default: …)" — the one reliable place
// the value-kind is published outside the TS schema.
function parseTokenTypes(schemaJson) {
  const props = JSON.parse(schemaJson).properties?.tokens?.properties ?? {};
  const types = {};
  const KIND = /\((color|length|shadow|fontFamily|number|easing|gradient|textShadow|dropShadow), default:/;
  for (const [name, def] of Object.entries(props)) {
    const m = String(def.description ?? "").match(KIND);
    if (m) types[name] = m[1];
  }
  return types;
}

// ── 2. Read the builtin theme JSON (authored overrides only) ─────────────────────
function readBuiltinThemes() {
  return readdirSync(BUILTIN_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort() // deterministic output → CI can diff-check for drift
    .map((file) => {
      const src = JSON.parse(readFileSync(join(BUILTIN_DIR, file), "utf8"));
      return {
        id: basename(file, ".json"), // filename === Veneer's stable theme id
        name: src.name,
        description: src.description,
        tags: src.tags,
        tokens: src.tokens ?? {},
      };
    });
}

const schema = parseTokensCss(readFileSync(TOKENS_CSS, "utf8"));
const tokenTypes = parseTokenTypes(readFileSync(THEME_SCHEMA_JSON, "utf8"));
const themes = readBuiltinThemes();

// Resolve a whole theme: every schema token, override ?? default (== tokenValue()).
const resolve = (overrides) =>
  schema.map((t) => [t.name, overrides[t.name] ?? t.default]);

// ── 3a. global.css — the two NativeWind imports + the real token blocks ──────────
// NativeWind v5 dynamic-theme rule: a token must be declared in BOTH @theme (so the
// utility is generated) AND :root (so it has a *runtime* default the provider can
// override). If a theme-bridge token is only in @theme, NativeWind inlines its value
// statically and the runtime swap can't reach it. So :root carries EVERY token; @theme
// carries the theme-bridge subset. (Veneer's web tokens.css can split them because the
// browser's @theme also emits a :root var — NativeWind's compiler does not.)
function buildGlobalCss() {
  const themeTokens = schema.filter((t) => t.bridge === "theme");
  const line = (t) => `  --${t.name}: ${t.default};`;
  return [
    // Use the granular Tailwind v4 imports with explicit layers — NOT the bundled
    // `@import "tailwindcss"`. With the bundle, NativeWind inlines the @theme color
    // values and the generated bg-*/text-* utilities lose their var() reference, so
    // the runtime swap can't reach them. The layered form makes NativeWind emit
    // `.bg-primary { background-color: var(--color-primary) }`, which the provider
    // then overrides. (Verified by render: with the bundle, bg-primary is transparent/
    // static; with these imports it resolves the var and swaps live.)
    `@import "tailwindcss/theme.css" layer(theme);`,
    `@import "tailwindcss/preflight.css" layer(base);`,
    `@import "tailwindcss/utilities.css";`,
    `@import "nativewind/theme";`,
    ``,
    `/* AUTO-GENERATED by scripts/generate-veneer-tokens.mjs — do not edit.`,
    `   Token defaults come from @offthegully/veneerui tokens.css`,
    `   (packages/theme/tokens.generated.css). Run \`npm run gen:tokens\` to refresh. */`,
    ``,
    `/* @theme → generates the semantic utilities (bg-primary, text-text, rounded-md, …). */`,
    `@theme {`,
    themeTokens.map(line).join("\n"),
    `}`,
    ``,
    `/* :root → runtime defaults for EVERY token, so <VariableContextProvider> can`,
    `   override them. Theme-bridge tokens are intentionally repeated here (see note above). */`,
    `:root {`,
    schema.map(line).join("\n"),
    `}`,
    ``,
  ].join("\n");
}

// ── 3b. veneer-themes.generated.ts — bridge map + every resolved theme ───────────
function buildThemesTs() {
  const metaTokenEntries = schema
    .map((t) => {
      const meta = { bridge: t.bridge, type: tokenTypes[t.name] ?? "length" };
      return `  ${JSON.stringify(t.name)}: ${JSON.stringify(meta)},`;
    })
    .join("\n");

  const metaEntries = themes
    .map((t) => {
      const meta = { id: t.id, name: t.name };
      if (t.description) meta.description = t.description;
      if (t.tags) meta.tags = t.tags;
      return `  ${JSON.stringify(t.id)}: ${JSON.stringify(meta)},`;
    })
    .join("\n");

  const tokenEntries = themes
    .map((t) => {
      const body = resolve(t.tokens)
        .map(([name, value]) => `    ${JSON.stringify(name)}: ${JSON.stringify(value)},`)
        .join("\n");
      return `  ${JSON.stringify(t.id)}: {\n${body}\n  },`;
    })
    .join("\n");

  return [
    `// AUTO-GENERATED by scripts/generate-veneer-tokens.mjs — do not edit.`,
    `// Source of truth: @offthegully/veneerui tokens.css + packages/theme builtin/*.json.`,
    `// Every value below is resolved as Veneer's tokenValue() does: override ?? schema default.`,
    `// Run \`npm run gen:tokens\` to refresh.`,
    ``,
    `/** Per-token metadata. \`bridge\`: 'theme' generates a utility, 'root' is var()-only.`,
    ` *  \`type\`: the value-kind (color/length/shadow/…), used to pick the scalar tokens`,
    ` *  that are safe to hand the runtime variable provider. */`,
    `export const TOKEN_META = {`,
    metaTokenEntries,
    `} as const;`,
    ``,
    `export type TokenName = keyof typeof TOKEN_META;`,
    `export type TokenType = (typeof TOKEN_META)[TokenName]["type"];`,
    ``,
    `export interface ThemeMeta {`,
    `  id: string;`,
    `  name: string;`,
    `  description?: string;`,
    `  tags?: string[];`,
    `}`,
    ``,
    `export const THEME_META: Record<string, ThemeMeta> = {`,
    metaEntries,
    `};`,
    ``,
    `/** Every builtin Veneer theme, each fully resolved to a flat token → value map. */`,
    `export const THEME_TOKENS = {`,
    tokenEntries,
    `} satisfies Record<string, Record<TokenName, string>>;`,
    ``,
    `export type ThemeId = keyof typeof THEME_TOKENS;`,
    ``,
  ].join("\n");
}

writeFileSync(join(app, "global.css"), buildGlobalCss());
writeFileSync(join(app, "src", "veneer-themes.generated.ts"), buildThemesTs());

console.log(
  `gen:tokens — ${schema.length} tokens × ${themes.length} themes ` +
    `(${themes.map((t) => t.id).join(", ")})`,
);
console.log("  wrote global.css");
console.log("  wrote src/veneer-themes.generated.ts");
