/**
 * Generates everything downstream of TOKEN_SCHEMA so nothing drifts:
 *   - packages/theme/tokens.generated.css  (@theme + :root defaults; shipped as
 *                                            @offthegully/veneerui/tokens.css)
 *   - packages/theme/theme-v1.json          (published JSON Schema for $schema
 *                                            autocomplete; shipped as
 *                                            @offthegully/veneerui/theme-v1.json)
 *   - docs/schema-reference.md              (human reference, grouped by category)
 *   - packages/lint-core/reserved-tokens.generated.js
 *                                           (the token names doctor warns about
 *                                            when a shadcn @theme block shadows them)
 *
 * Run: `npm run gen:theme`. CI re-runs it and fails if the working tree changed,
 * which guarantees the artifacts always match the schema.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION } from '../packages/theme/src/types.ts';
import { TOKEN_SCHEMA, FONTS } from '../packages/theme/src/schema.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const write = (rel: string, contents: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
  console.log(`  wrote ${rel}`);
};

const BANNER =
  '/* AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. */';

// ── tokens.generated.css ───────────────────────────────────────────────────
function buildCss(): string {
  const themeTokens = TOKEN_SCHEMA.filter((t) => t.bridge === 'theme');
  const rootTokens = TOKEN_SCHEMA.filter((t) => t.bridge === 'root');
  const line = (t: { name: string; default: string }) => `  --${t.name}: ${t.default};`;

  return [
    BANNER,
    '',
    '/* Namespaced tokens: emit :root variables AND generate Tailwind utilities. */',
    '@theme {',
    themeTokens.map(line).join('\n'),
    '}',
    '',
    '/* Non-namespaced tokens: variables only (no Tailwind utility namespace exists). */',
    ':root {',
    rootTokens.map(line).join('\n'),
    '}',
    '',
  ].join('\n');
}

// ── theme-v1.json (JSON Schema) ──────────────────────────────────────────────
function buildJsonSchema(): string {
  const tokenProps: Record<string, unknown> = {};
  const requiredTokens: string[] = [];
  for (const t of TOKEN_SCHEMA) {
    tokenProps[t.name] = {
      type: 'string',
      description: `${t.description} (${t.type}, default: ${t.default})`,
    };
    if (t.required) requiredTokens.push(t.name);
  }

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://veneerui.dev/schemas/theme-v1.json',
    title: 'Veneer Theme',
    description: `Theme document targeting TOKEN_SCHEMA generation ${SCHEMA_VERSION}.`,
    type: 'object',
    required: ['name', 'version', 'schemaVersion', 'tokens'],
    properties: {
      $schema: { type: 'string' },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      author: {
        oneOf: [
          { type: 'string' },
          { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
        ],
      },
      version: { type: 'string' },
      schemaVersion: { const: SCHEMA_VERSION },
      tags: { type: 'array', items: { type: 'string' } },
      license: { type: 'string' },
      tokens: {
        type: 'object',
        additionalProperties: false,
        required: requiredTokens,
        properties: tokenProps,
      },
    },
  };
  return JSON.stringify(schema, null, 2) + '\n';
}

// ── schema-reference.md ──────────────────────────────────────────────────────
function buildReference(): string {
  const categories = [...new Set(TOKEN_SCHEMA.map((t) => t.category))];
  const out: string[] = [
    '<!-- AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. -->',
    '',
    '# Theme Token Reference',
    '',
    `Schema generation **${SCHEMA_VERSION}** · **${TOKEN_SCHEMA.length}** tokens. ` +
      'Set any of these in a theme\'s `tokens` object; omitted tokens fall back to the default.',
    '',
  ];
  for (const category of categories) {
    out.push(`## ${category}`, '', '| Token | Type | Default | Required | Description |', '|---|---|---|---|---|');
    for (const t of TOKEN_SCHEMA.filter((tk) => tk.category === category)) {
      out.push(
        `| \`${t.name}\` | ${t.type} | \`${t.default}\` | ${t.required ? 'yes' : ''} | ${t.description} |`,
      );
    }
    out.push('');
  }
  return out.join('\n');
}

// ── reserved-tokens.generated.js ─────────────────────────────────────────────
// The bare token names (no leading `--`) Veneer owns. Emitted as plain JS so the
// zero-dep CLI bundles it and eslint-plugin-veneer can require it without a build
// step. `veneerui doctor` warns when a project's @theme block redefines any of
// these (the common shadcn coexistence trap).
function buildReservedTokens(): string {
  const names = TOKEN_SCHEMA.map((t) => t.name);
  return [
    '// AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit.',
    'export const RESERVED_TOKEN_NAMES = Object.freeze([',
    ...names.map((n) => `  ${JSON.stringify(n)},`),
    ']);',
    '',
  ].join('\n');
}

// ── font-packages.generated.js ───────────────────────────────────────────────
// The installable fonts (family → Fontsource package + import recipe). Emitted
// as plain JS so the zero-dep CLI bundles it for `veneerui add fonts`. Self-hosted
// faces (no pkg, e.g. MS Sans Serif) are omitted — they can't be `add`ed.
function buildFontPackages(): string {
  const installable = FONTS.filter((f) => f.pkg).map((f) => ({
    family: f.family,
    pkg: f.pkg,
    imports: f.imports ?? [],
    ...(f.note ? { note: f.note } : {}),
  }));
  return [
    '// AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit.',
    `export const FONT_PACKAGES = Object.freeze(${JSON.stringify(installable, null, 2)});`,
    '',
  ].join('\n');
}

// ── docs/fonts.md ────────────────────────────────────────────────────────────
function buildFontsDoc(): string {
  const row = (f: (typeof FONTS)[number]) => {
    const name = [f.family, ...(f.aliases ?? [])].map((n) => `\`${n}\``).join(', ');
    const install = f.pkg ? `\`npm i ${f.pkg}\`` : '— (self-hosted)';
    const imp = (f.imports ?? []).map((i) => `\`${i}\``).join('<br>') || (f.note ?? '—');
    return `| ${name} | ${install} | ${imp} |`;
  };
  return [
    '<!-- AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. -->',
    '',
    '# Fonts',
    '',
    'A theme can only **name** a font; it can never load one (the validator blocks',
    '`url()`, so a theme is inert data). That means **the app is responsible for',
    'loading every family its themes name** — and the family string in the theme',
    "must match a loaded font *exactly*. This is the one genuinely fiddly part of",
    'adoption, so the rules are spelled out below.',
    '',
    '## The one that bites everyone: `font-sans`',
    '',
    "Body text must be driven by the **`font-sans` token** (the `font-sans` utility,",
    'or letting it inherit). If you force a font the framework supplies — e.g.',
    "Next's `next/font` via `<body className={geist.className}>` — that hard-coded",
    'family wins over the token and **silently defeats all font theming**. Drop the',
    'framework font class from `<body>` and let `font-sans` flow through.',
    '',
    'Veneer\'s own default `font-sans` is `\'Inter Variable\'`; if you never load Inter',
    "(see below) even the built-in themes fall back to system-ui. Run `veneerui add",
    'fonts` to load the full bundled set.',
    '',
    '## Bundled families ↔ Fontsource packages',
    '',
    'Themes may only name the families below (case-insensitive) plus the CSS generic',
    'keywords. The reliable way to load each is its [Fontsource](https://fontsource.org)',
    'package — the family name a theme uses must match Fontsource\'s, which is why the',
    'mapping is exact:',
    '',
    '| Family (+ aliases) | Install | Import |',
    '|---|---|---|',
    ...FONTS.map(row),
    '',
    '`veneerui add fonts` prints the install command and import lines for the whole',
    'set. Import the specifiers in your app entry (Vite: `src/main.tsx`; Next: the',
    'root `layout.tsx` or your global CSS via `@import`). Variable packages ship one',
    'file; static ones (IBM Plex Mono) need a line per weight.',
    '',
  ].join('\n');
}

console.log('Generating theme artifacts from TOKEN_SCHEMA…');
write('packages/theme/tokens.generated.css', buildCss());
write('packages/theme/theme-v1.json', buildJsonSchema());
write('docs/schema-reference.md', buildReference());
write('packages/lint-core/reserved-tokens.generated.js', buildReservedTokens());
write('packages/lint-core/font-packages.generated.js', buildFontPackages());
write('docs/fonts.md', buildFontsDoc());
console.log(`Done — ${TOKEN_SCHEMA.length} tokens, ${FONTS.length} fonts.`);
