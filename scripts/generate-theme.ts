/**
 * Generates everything downstream of TOKEN_SCHEMA so nothing drifts:
 *   - packages/theme/tokens.generated.css  (@theme + :root defaults; shipped as
 *                                            @offthegully/veneerui/tokens.css)
 *   - packages/theme/theme-v1.json          (published JSON Schema for $schema
 *                                            autocomplete; shipped as
 *                                            @offthegully/veneerui/theme-v1.json)
 *   - docs/schema-reference.md              (human reference, grouped by category)
 *
 * Run: `npm run gen:theme`. CI re-runs it and fails if the working tree changed,
 * which guarantees the artifacts always match the schema.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION, type TokenDef } from '../packages/theme/src/types.ts';
import { TOKEN_SCHEMA, FONTS, CUSTOM_COLOR_RE } from '../packages/theme/src/schema.ts';

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
        // Open custom-color namespace (color-x-*). Same regex the validator uses
        // (imported from schema.ts) so the editor can't green-light a name the
        // validator would reject. additionalProperties:false + patternProperties
        // accepts keys matching `properties` OR this pattern, and rejects the rest.
        patternProperties: {
          [CUSTOM_COLOR_RE.source]: {
            type: 'string',
            description: 'Custom app-defined color (any valid CSS color; themeable as var(--color-x-*))',
          },
        },
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
    '> **Custom colors.** Beyond this closed list, a theme may define app-specific ' +
      'colors under the open **`color-x-<slug>`** namespace (e.g. `color-x-gold`) — ' +
      'any valid CSS color (no `var()`), up to 64 per theme. They are fully themeable ' +
      '(`var(--color-x-gold)`, `bg-(--color-x-gold)`) and have no built-in default, so ' +
      'declare them in your app\'s base theme. See ' +
      '[authoring-guide.md](./authoring-guide.md#4-custom-colors-beyond-the-schema-palette).',
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

// ── escape-hatches.generated.md ──────────────────────────────────────────────
// The tokens with NO working Tailwind utility — either bridge:'root' (no v4
// namespace) or a shadow/text-shadow whose named utility bakes geometry at build
// time so a runtime theme swap can't update it. These must be consumed through a
// var() escape hatch or theming silently breaks. The set is DERIVED from the
// schema (bridge + type), and `assertEscapeCoverage` fails the build if a new
// root/shadow token isn't classified — so the table can never go stale.
const needsEscapeHatch = (t: TokenDef): boolean =>
  t.bridge === 'root' || t.type === 'shadow' || t.type === 'textShadow';

interface EscapeGroup {
  label: string;
  /** Representative token shown in the example (asserted to exist). */
  rep: string;
  /** The obvious-but-broken class an agent reaches for. */
  wrong: string;
  /** The themeable form to use instead. */
  right: string;
  /** Which schema tokens this group covers. */
  match: (t: TokenDef) => boolean;
  why?: string;
}

const ESCAPE_GROUPS: EscapeGroup[] = [
  { label: 'box-shadow', rep: 'shadow-md', wrong: '`shadow-md`, `shadow-card`', right: '`[box-shadow:var(--shadow-md)]`', match: (t) => t.type === 'shadow', why: "Tailwind v4 bakes the named `shadow-*` geometry at build time (only the color is a runtime var), so re-theming wouldn't update it." },
  { label: 'text-shadow', rep: 'text-shadow-glow', wrong: '`text-shadow-glow`', right: '`[text-shadow:var(--text-shadow-glow)]`', match: (t) => t.type === 'textShadow', why: 'Same build-time bake as box-shadow.' },
  { label: 'border-width', rep: 'border-width-default', wrong: '`border`, `border-2`', right: '`[border-width:var(--border-width-default)]`', match: (t) => t.name.startsWith('border-width-'), why: 'No Tailwind width utility maps to the token; pair with `border-border` for the color.' },
  { label: 'duration', rep: 'duration-default', wrong: '`duration-200`', right: '`duration-[calc(var(--duration-default)*1ms)]`', match: (t) => t.name.startsWith('duration-'), why: 'Durations are unitless numbers in ms, hence the `*1ms` in the calc.' },
  { label: 'gradient', rep: 'gradient-primary', wrong: '—', right: '`bg-(image:--gradient-primary)`', match: (t) => t.type === 'gradient', why: 'Gradient text: `bg-clip-text text-transparent bg-(image:--gradient-text)`.' },
  { label: 'opacity', rep: 'opacity-disabled', wrong: '`opacity-50`', right: '`opacity-(--opacity-disabled)`', match: (t) => t.name.startsWith('opacity-') },
  { label: 'focus ring', rep: 'focus-ring-width', wrong: '`outline-2`, `ring-2`, `outline-offset-2`', right: '`focus-visible:[outline-style:solid] focus-visible:[outline-width:var(--focus-ring-width)] focus-visible:[outline-offset:var(--focus-ring-offset)] focus-visible:outline-focus-ring`', match: (t) => t.name.startsWith('focus-ring-'), why: 'Focus geometry has no Tailwind theme namespace; outline has no preflight `solid` default, so set the style explicitly and pair with `outline-focus-ring` for the color.' },
  { label: 'icon stroke', rep: 'icon-stroke-width', wrong: '—', right: '`[stroke-width:var(--icon-stroke-width)]`', match: (t) => t.name === 'icon-stroke-width', why: 'CSS `stroke-width` overrides the SVG presentation attribute, so the icon re-weights at runtime.' },
];

function assertEscapeCoverage(): void {
  for (const t of TOKEN_SCHEMA.filter(needsEscapeHatch)) {
    const n = ESCAPE_GROUPS.filter((g) => g.match(t)).length;
    if (n !== 1) throw new Error(`escape-hatch: token "${t.name}" matched ${n} groups (expected exactly 1) — add/adjust an ESCAPE_GROUP in generate-theme.ts`);
  }
  const overreach = TOKEN_SCHEMA.filter((t) => !needsEscapeHatch(t) && ESCAPE_GROUPS.some((g) => g.match(t)));
  if (overreach.length) throw new Error(`escape-hatch: ${overreach.map((t) => t.name).join(', ')} have working utilities but matched a group`);
  for (const g of ESCAPE_GROUPS) {
    if (!TOKEN_SCHEMA.some((t) => t.name === g.rep)) throw new Error(`escape-hatch: representative token "${g.rep}" for group "${g.label}" is not in the schema`);
  }
}

function buildEscapeHatches(): string {
  assertEscapeCoverage();
  return [
    '<!-- AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. -->',
    '',
    '# Escape-hatch tokens',
    '',
    'Most tokens are plain Tailwind utilities — just use the class (`bg-primary`,',
    '`rounded-md`, `text-5xl`, `drop-shadow-lg`). The token groups below are the',
    'exception: they have **no working utility**, so the obvious class silently breaks',
    'runtime theming. Use the `var()` form instead.',
    '',
    '| Token group | ❌ Breaks theming | ✅ Themeable form |',
    '|---|---|---|',
    ...ESCAPE_GROUPS.map((g) => `| ${g.label} | ${g.wrong} | ${g.right} |`),
    '',
    ...ESCAPE_GROUPS.filter((g) => g.why).map((g) => `- **${g.label}** — ${g.why}`),
    '',
    '`drop-shadow-*` is the exception among shadows: its utility already resolves',
    '`var(--drop-shadow-*)`, so the `drop-shadow-lg` class is fine.',
    '',
    '### Tokens in each group',
    '',
    ...ESCAPE_GROUPS.map((g) => `- **${g.label}:** ${TOKEN_SCHEMA.filter(g.match).map((t) => `\`${t.name}\``).join(', ')}`),
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
    'The **Install** column shows the npm form; `veneerui add fonts` prints the same',
    "command in your package manager's dialect (`pnpm add` / `yarn add` / `bun add`,",
    'detected from your lockfile) plus the import lines for the whole set. Import the',
    'specifiers in your app entry (Vite: `src/main.tsx`; Next: the root `layout.tsx` or',
    'your global CSS via `@import`). Variable packages ship one file; static ones',
    '(IBM Plex Mono) need a line per weight.',
    '',
  ].join('\n');
}

console.log('Generating theme artifacts from TOKEN_SCHEMA…');
write('packages/theme/tokens.generated.css', buildCss());
const jsonSchema = buildJsonSchema();
write('packages/theme/theme-v1.json', jsonSchema);
// The same schema, served by the playground (= veneerui.dev) at the `$schema`
// URL themes point to (https://veneerui.dev/schemas/theme-v1.json), for editor
// autocomplete/validation. Vite copies public/ to the dist root, so this deploys
// to /schemas/theme-v1.json. Generated from the same source, so it can't drift.
write('apps/playground/public/schemas/theme-v1.json', jsonSchema);
write('docs/schema-reference.md', buildReference());
write('docs/escape-hatches.generated.md', buildEscapeHatches());
write('packages/lint-core/font-packages.generated.js', buildFontPackages());
write('docs/fonts.md', buildFontsDoc());
console.log(`Done — ${TOKEN_SCHEMA.length} tokens, ${FONTS.length} fonts.`);
