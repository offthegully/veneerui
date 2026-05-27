/**
 * Generates everything downstream of TOKEN_SCHEMA so nothing drifts:
 *   - src/theme/tokens.generated.css  (@theme + :root defaults)
 *   - public/schemas/theme-v1.json    (published JSON Schema for $schema autocomplete)
 *   - docs/schema-reference.md         (human reference, grouped by category)
 *
 * Run: `npm run gen:theme`. CI re-runs it and fails if the working tree changed,
 * which guarantees the artifacts always match the schema.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION } from '../src/theme/types.ts';
import { TOKEN_SCHEMA } from '../src/theme/schema.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const write = (rel: string, contents: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
  console.log(`  wrote ${rel}`);
};

const BANNER = '/* AUTO-GENERATED from src/theme/schema.ts by scripts/generate-theme.ts — do not edit. */';

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
    $id: 'https://veneer.app/schemas/theme-v1.json',
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
    '<!-- AUTO-GENERATED from src/theme/schema.ts by scripts/generate-theme.ts — do not edit. -->',
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

console.log('Generating theme artifacts from TOKEN_SCHEMA…');
write('src/theme/tokens.generated.css', buildCss());
write('public/schemas/theme-v1.json', buildJsonSchema());
write('docs/schema-reference.md', buildReference());
console.log(`Done — ${TOKEN_SCHEMA.length} tokens.`);
