/**
 * TOKEN_SCHEMA — the single source of truth for the theme system.
 *
 * Every value a theme is allowed to set lives here. The same list drives:
 *   - the `@theme` / `:root` CSS (scripts/generate-theme.ts → tokens.generated.css)
 *   - the published JSON Schema (theme-v1.json) for `$schema` autocomplete
 *   - the schema-reference docs
 *   - runtime validation (validate.ts)
 *
 * Token `name` is the CSS custom-property name without the leading `--`.
 *
 * `bridge` records how the token reaches components, and this is calibrated to
 * Tailwind v4's real `@theme` namespaces:
 *   - 'theme' tokens sit in a v4 namespace, so declaring them generates a utility
 *     (e.g. --color-primary → bg-primary, --radius-md → rounded-md, --blur-md →
 *     blur-md AND backdrop-blur-md, --ease-snappy → ease-snappy).
 *   - 'root' tokens have no v4 namespace, so they're plain custom properties
 *     consumed via var() or arbitrary-property utilities, e.g.
 *     duration-(--duration-default), border-[length:var(--border-width-thick)].
 */
import type { TokenDef, TokenType, TokenBridge } from './types';

const def = (
  name: string,
  type: TokenType,
  category: string,
  bridge: TokenBridge,
  dflt: string,
  description: string,
  required = false,
): TokenDef => ({ name, type, category, bridge, default: dflt, description, required });

export const TOKEN_SCHEMA: TokenDef[] = [
  // ── Colors ─────────────────────────────────────────────────────────────────
  def('color-primary', 'color', 'Colors', 'theme', '#3b82f6', 'Main brand color', true),
  def('color-primary-hover', 'color', 'Colors', 'theme', '#2563eb', 'Hover state of primary'),
  def('color-primary-active', 'color', 'Colors', 'theme', '#1d4ed8', 'Pressed state of primary'),
  def('color-primary-subtle', 'color', 'Colors', 'theme', '#dbeafe', 'Tinted background derived from primary'),
  def('color-accent', 'color', 'Colors', 'theme', '#06b6d4', 'Secondary emphasis color'),
  def('color-accent-hover', 'color', 'Colors', 'theme', '#0891b2', 'Hover state of accent'),
  def('color-accent-active', 'color', 'Colors', 'theme', '#0e7490', 'Pressed state of accent'),
  // Status colors mirror primary/accent: a base plus hover/active states and a
  // -subtle tint for low-emphasis backgrounds (badges, alert banners). Defaults
  // are palette steps of the base hue; a theme that re-hues a status should re-set
  // its states too (just like primary).
  def('color-success', 'color', 'Colors', 'theme', '#16a34a', 'Positive / success status'),
  def('color-success-hover', 'color', 'Colors', 'theme', '#15803d', 'Hover state of success'),
  def('color-success-active', 'color', 'Colors', 'theme', '#166534', 'Pressed state of success'),
  def('color-success-subtle', 'color', 'Colors', 'theme', '#dcfce7', 'Tinted background derived from success'),
  def('color-warning', 'color', 'Colors', 'theme', '#d97706', 'Caution / warning status'),
  def('color-warning-hover', 'color', 'Colors', 'theme', '#b45309', 'Hover state of warning'),
  def('color-warning-active', 'color', 'Colors', 'theme', '#92400e', 'Pressed state of warning'),
  def('color-warning-subtle', 'color', 'Colors', 'theme', '#fef3c7', 'Tinted background derived from warning'),
  def('color-danger', 'color', 'Colors', 'theme', '#dc2626', 'Destructive / error status'),
  def('color-danger-hover', 'color', 'Colors', 'theme', '#b91c1c', 'Hover state of danger'),
  def('color-danger-active', 'color', 'Colors', 'theme', '#991b1b', 'Pressed state of danger'),
  def('color-danger-subtle', 'color', 'Colors', 'theme', '#fee2e2', 'Tinted background derived from danger'),
  def('color-info', 'color', 'Colors', 'theme', '#0ea5e9', 'Informational status'),
  def('color-info-hover', 'color', 'Colors', 'theme', '#0284c7', 'Hover state of info'),
  def('color-info-active', 'color', 'Colors', 'theme', '#0369a1', 'Pressed state of info'),
  def('color-info-subtle', 'color', 'Colors', 'theme', '#e0f2fe', 'Tinted background derived from info'),
  def('color-focus-ring', 'color', 'Colors', 'theme', '#3b82f6', 'Focus outline / ring color'),

  // ── Surfaces ─────────────────────────────────────────────────────────────────
  def('color-surface', 'color', 'Surfaces', 'theme', '#ffffff', 'Default page background', true),
  def('color-surface-raised', 'color', 'Surfaces', 'theme', '#f9fafb', 'Raised elements like cards'),
  def('color-surface-sunken', 'color', 'Surfaces', 'theme', '#f3f4f6', 'Recessed wells / insets'),
  def('color-surface-overlay', 'color', 'Surfaces', 'theme', '#ffffff', 'Floating surfaces like menus & modals'),
  def('color-surface-inverse', 'color', 'Surfaces', 'theme', '#111827', 'Inverted surface (e.g. tooltips)'),
  def('color-overlay-backdrop', 'color', 'Surfaces', 'theme', 'rgb(0 0 0 / 0.5)', 'Scrim behind modals'),

  // ── Text ─────────────────────────────────────────────────────────────────────
  def('color-text', 'color', 'Text', 'theme', '#111827', 'Body text color', true), // required: minimally coherent theme
  def('color-text-muted', 'color', 'Text', 'theme', '#4b5563', 'Secondary text'),
  def('color-text-subtle', 'color', 'Text', 'theme', '#9ca3af', 'Tertiary / placeholder text'),
  def('color-text-inverse', 'color', 'Text', 'theme', '#f9fafb', 'Text on inverse surfaces'),
  def('color-text-on-primary', 'color', 'Text', 'theme', '#ffffff', 'Text rendered on primary fills'),
  // On-status defaults are each tuned to contrast with that status's *default* fill
  // (WCAG): the default green/amber/sky need dark text, the default red needs white.
  // A theme whose fill diverges in lightness should override the matching on-color.
  def('color-text-on-success', 'color', 'Text', 'theme', '#111827', 'Text rendered on success fills'),
  def('color-text-on-warning', 'color', 'Text', 'theme', '#111827', 'Text rendered on warning fills'),
  def('color-text-on-danger', 'color', 'Text', 'theme', '#ffffff', 'Text rendered on danger fills'),
  def('color-text-on-info', 'color', 'Text', 'theme', '#111827', 'Text rendered on info fills'),

  // ── Borders ──────────────────────────────────────────────────────────────────
  def('color-border', 'color', 'Borders', 'theme', '#e5e7eb', 'Default border color'),
  def('color-border-strong', 'color', 'Borders', 'theme', '#d1d5db', 'High-emphasis border'),
  def('color-border-subtle', 'color', 'Borders', 'theme', '#f3f4f6', 'Low-emphasis border'),
  def('border-width-thin', 'length', 'Borders', 'root', '1px', 'Hairline border width'),
  def('border-width-default', 'length', 'Borders', 'root', '1px', 'Default border width'),
  def('border-width-thick', 'length', 'Borders', 'root', '3px', 'Heavy border for brutalist/emphasis themes'),

  // ── Radii ────────────────────────────────────────────────────────────────────
  def('radius-none', 'length', 'Radii', 'theme', '0px', 'No rounding (brutalist/sharp)'),
  def('radius-xs', 'length', 'Radii', 'theme', '2px', 'Hairline rounding'),
  def('radius-sm', 'length', 'Radii', 'theme', '4px', 'Small radius'),
  def('radius-md', 'length', 'Radii', 'theme', '8px', 'Default radius for cards, buttons'),
  def('radius-lg', 'length', 'Radii', 'theme', '12px', 'Large radius'),
  def('radius-xl', 'length', 'Radii', 'theme', '16px', 'Extra-large radius'),
  def('radius-2xl', 'length', 'Radii', 'theme', '24px', 'Very large radius (neumorphic)'),
  def('radius-3xl', 'length', 'Radii', 'theme', '32px', 'Pillowy radius for soft/playful themes'),
  def('radius-full', 'length', 'Radii', 'theme', '9999px', 'Pill / fully rounded'),

  // ── Shadows ──────────────────────────────────────────────────────────────────
  // Runtime-theming note: Tailwind v4's named `shadow-*` and `text-shadow-*`
  // utilities BAKE their geometry at build time (only the color is a runtime var),
  // so re-setting --shadow-*/--text-shadow-* at runtime does NOT update them.
  // To keep these themeable, components consume them via the arbitrary-property
  // escape hatch — `[box-shadow:var(--shadow-card)]`, `[text-shadow:var(--text-shadow-glow)]`
  // — exactly like border-width/duration. `drop-shadow-*` is the exception: its
  // utility uses `var(--drop-shadow-*)`, so the named `drop-shadow-*` class is fine.
  def('shadow-2xs', 'shadow', 'Shadows', 'theme', '0 1px rgb(0 0 0 / 0.05)', 'Faintest hairline elevation'),
  def('shadow-sm', 'shadow', 'Shadows', 'theme', '0 1px 2px 0 rgb(0 0 0 / 0.05)', 'Subtle elevation'),
  def('shadow-md', 'shadow', 'Shadows', 'theme', '0 4px 6px -1px rgb(0 0 0 / 0.1)', 'Default elevation'),
  def('shadow-lg', 'shadow', 'Shadows', 'theme', '0 10px 15px -3px rgb(0 0 0 / 0.1)', 'High elevation'),
  def('shadow-xl', 'shadow', 'Shadows', 'theme', '0 20px 25px -5px rgb(0 0 0 / 0.1)', 'Highest elevation'),
  def('shadow-2xl', 'shadow', 'Shadows', 'theme', '0 25px 50px -12px rgb(0 0 0 / 0.25)', 'Dramatic floating elevation'),
  def('shadow-card', 'shadow', 'Shadows', 'theme', '0 1px 3px 0 rgb(0 0 0 / 0.1)', 'Semantic alias for card elevation'),
  def('shadow-glow', 'shadow', 'Shadows', 'theme', '0 0 20px color-mix(in srgb, var(--color-primary) 45%, transparent)', 'Glow for retro/playful themes (follows the palette)'),
  def('inset-shadow-sm', 'shadow', 'Shadows', 'theme', 'inset 0 2px 4px rgb(0 0 0 / 0.06)', 'Small inset (neumorphic)'),
  def('inset-shadow-md', 'shadow', 'Shadows', 'theme', 'inset 0 3px 6px rgb(0 0 0 / 0.09)', 'Medium inset (neumorphic)'),
  def('inset-shadow-lg', 'shadow', 'Shadows', 'theme', 'inset 0 4px 8px rgb(0 0 0 / 0.12)', 'Large inset (neumorphic)'),
  // Text shadows (Tailwind v4 --text-shadow-* → text-shadow-* utilities). Opt-in:
  // defining the token only sets what the utility resolves to; nothing is shadowed
  // globally until a component/theme applies the class.
  def('text-shadow-sm', 'textShadow', 'Shadows', 'theme', '0 1px 2px rgb(0 0 0 / 0.1)', 'Subtle text depth'),
  def('text-shadow-md', 'textShadow', 'Shadows', 'theme', '0 2px 4px rgb(0 0 0 / 0.12)', 'Default text depth'),
  def('text-shadow-lg', 'textShadow', 'Shadows', 'theme', '0 4px 8px rgb(0 0 0 / 0.15)', 'Strong text depth (display headings)'),
  def('text-shadow-glow', 'textShadow', 'Shadows', 'theme', '0 0 12px color-mix(in srgb, var(--color-primary) 55%, transparent)', 'Neon glow on text (retro/synthwave; follows the palette)'),
  // Drop shadows (Tailwind v4 --drop-shadow-* → drop-shadow-* filter utilities).
  // Alpha-aware: follows the rendered shape, unlike the box-shadow rectangle.
  def('drop-shadow-sm', 'dropShadow', 'Shadows', 'theme', '0 1px 1px rgb(0 0 0 / 0.1)', 'Subtle alpha-aware shadow'),
  def('drop-shadow-md', 'dropShadow', 'Shadows', 'theme', '0 3px 4px rgb(0 0 0 / 0.15)', 'Default alpha-aware shadow (glass/cutout)'),
  def('drop-shadow-lg', 'dropShadow', 'Shadows', 'theme', '0 8px 12px rgb(0 0 0 / 0.2)', 'Deep alpha-aware shadow'),

  // ── Typography: families ───────────────────────────────────────────────────
  def('font-sans', 'fontFamily', 'Typography', 'theme', "'Inter Variable', system-ui, sans-serif", 'Default body font stack'),
  def('font-serif', 'fontFamily', 'Typography', 'theme', "'Source Serif 4 Variable', serif", 'Serif font stack'),
  def('font-mono', 'fontFamily', 'Typography', 'theme', "'JetBrains Mono Variable', ui-monospace, monospace", 'Monospace font stack'),
  def('font-display', 'fontFamily', 'Typography', 'theme', "'Inter Variable', system-ui, sans-serif", 'Display/heading font (often more dramatic)'),

  // ── Typography: sizes ────────────────────────────────────────────────────────
  def('text-xs', 'length', 'Typography', 'theme', '12px', 'Extra-small text'),
  def('text-sm', 'length', 'Typography', 'theme', '14px', 'Small text'),
  def('text-base', 'length', 'Typography', 'theme', '16px', 'Default body text size'),
  def('text-lg', 'length', 'Typography', 'theme', '18px', 'Large text'),
  def('text-xl', 'length', 'Typography', 'theme', '20px', 'Extra-large text'),
  def('text-2xl', 'length', 'Typography', 'theme', '24px', 'Heading size'),
  def('text-3xl', 'length', 'Typography', 'theme', '30px', 'Heading size'),
  def('text-4xl', 'length', 'Typography', 'theme', '36px', 'Display size'),
  def('text-5xl', 'length', 'Typography', 'theme', '48px', 'Display size'),
  def('text-6xl', 'length', 'Typography', 'theme', '60px', 'Hero display size'),
  def('text-7xl', 'length', 'Typography', 'theme', '72px', 'Oversized display'),
  def('text-8xl', 'length', 'Typography', 'theme', '96px', 'Editorial poster size'),
  def('text-9xl', 'length', 'Typography', 'theme', '128px', 'Maximal hero size'),

  // ── Typography: weights ──────────────────────────────────────────────────────
  def('font-weight-thin', 'number', 'Typography', 'theme', '100', 'Thin weight (fashion/editorial)'),
  def('font-weight-light', 'number', 'Typography', 'theme', '300', 'Light weight'),
  def('font-weight-normal', 'number', 'Typography', 'theme', '400', 'Regular weight'),
  def('font-weight-medium', 'number', 'Typography', 'theme', '500', 'Medium weight'),
  def('font-weight-semibold', 'number', 'Typography', 'theme', '600', 'Semibold weight'),
  def('font-weight-bold', 'number', 'Typography', 'theme', '700', 'Bold weight'),
  def('font-weight-extrabold', 'number', 'Typography', 'theme', '800', 'Extra-bold weight'),
  def('font-weight-black', 'number', 'Typography', 'theme', '900', 'Black weight (brutalist/display)'),

  // ── Typography: leading & tracking ──────────────────────────────────────────
  def('leading-tight', 'number', 'Typography', 'theme', '1.25', 'Tight line-height'),
  def('leading-snug', 'number', 'Typography', 'theme', '1.375', 'Snug line-height'),
  def('leading-normal', 'number', 'Typography', 'theme', '1.5', 'Default line-height'),
  def('leading-relaxed', 'number', 'Typography', 'theme', '1.625', 'Relaxed line-height'),
  def('leading-loose', 'number', 'Typography', 'theme', '2', 'Loose line-height (airy editorial)'),
  def('tracking-tighter', 'length', 'Typography', 'theme', '-0.05em', 'Very tight letter-spacing (display)'),
  def('tracking-tight', 'length', 'Typography', 'theme', '-0.02em', 'Tight letter-spacing'),
  def('tracking-normal', 'length', 'Typography', 'theme', '0em', 'Default letter-spacing'),
  def('tracking-wide', 'length', 'Typography', 'theme', '0.05em', 'Wide letter-spacing'),
  def('tracking-wider', 'length', 'Typography', 'theme', '0.1em', 'Wider letter-spacing'),
  def('tracking-widest', 'length', 'Typography', 'theme', '0.2em', 'Widest letter-spacing (eyebrow/label)'),

  // ── Spacing ──────────────────────────────────────────────────────────────────
  // v4 derives the whole spacing scale (p-1, gap-4, ...) from this single base
  // unit, so overriding it is the lever a theme uses to express density.
  def('spacing', 'length', 'Spacing', 'theme', '0.25rem', 'Base spacing unit; the whole scale is calc(spacing * n)'),

  // ── Effects ──────────────────────────────────────────────────────────────────
  // --blur-* feeds both blur-* and backdrop-blur-* utilities.
  def('blur-xs', 'length', 'Effects', 'theme', '4px', 'Hairline blur / backdrop-blur'),
  def('blur-sm', 'length', 'Effects', 'theme', '8px', 'Small blur / backdrop-blur'),
  def('blur-md', 'length', 'Effects', 'theme', '12px', 'Medium blur / backdrop-blur (glassmorphism)'),
  def('blur-lg', 'length', 'Effects', 'theme', '16px', 'Large blur / backdrop-blur'),
  def('blur-xl', 'length', 'Effects', 'theme', '24px', 'Extra-large blur / backdrop-blur'),
  def('blur-2xl', 'length', 'Effects', 'theme', '40px', 'Frosted-glass blur / backdrop-blur'),
  // Gradients have no v4 namespace, so they're root tokens consumed via
  // bg-[image:var(--gradient-*)] (or bg-clip-text + text-transparent for gradient-text).
  // Defaults are palette-relative (var() over the color tokens) so a theme that
  // only sets colors gets gradients that already match — no per-theme gradient
  // needed. Override only for a genuinely different ramp (extra stops, angle, hue).
  def('gradient-primary', 'gradient', 'Effects', 'root', 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', 'Optional gradient for primary surfaces (follows the palette)'),
  def('gradient-accent', 'gradient', 'Effects', 'root', 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)', 'Gradient for accent/secondary surfaces (follows the palette)'),
  def('gradient-surface', 'gradient', 'Effects', 'root', 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-sunken) 100%)', 'Subtle background gradient for page/hero (follows the palette)'),
  def('gradient-text', 'gradient', 'Effects', 'root', 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', 'Gradient for clipped headline text (follows the palette)'),
  def('opacity-disabled', 'number', 'Effects', 'root', '0.5', 'Opacity for disabled elements'),
  def('opacity-overlay', 'number', 'Effects', 'root', '0.6', 'Opacity for overlay scrims'),

  // ── Motion ───────────────────────────────────────────────────────────────────
  // Durations have no v4 namespace; consume via duration-(--duration-default).
  def('duration-fast', 'number', 'Motion', 'root', '80', 'Fast transition (ms)'),
  def('duration-default', 'number', 'Motion', 'root', '200', 'Default transition (ms)'),
  def('duration-slow', 'number', 'Motion', 'root', '400', 'Slow transition (ms)'),
  def('ease-default', 'easing', 'Motion', 'theme', 'cubic-bezier(0.4, 0, 0.2, 1)', 'Default easing curve'),
  def('ease-snappy', 'easing', 'Motion', 'theme', 'cubic-bezier(0.2, 0, 0, 1)', 'Snappy easing'),
  def('ease-smooth', 'easing', 'Motion', 'theme', 'cubic-bezier(0.65, 0, 0.35, 1)', 'Smooth easing'),
  def('ease-bounce', 'easing', 'Motion', 'theme', 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', 'Playful overshoot easing'),
];

/** Fast lookups derived from the schema. */
export const TOKEN_BY_NAME: ReadonlyMap<string, TokenDef> = new Map(
  TOKEN_SCHEMA.map((t) => [t.name, t]),
);

/**
 * Custom (app-defined) colors — the one OPEN corner of an otherwise closed schema.
 *
 * `TOKEN_SCHEMA` above is a closed vocabulary; everything else is dropped. But apps
 * legitimately need colors outside it (medal gold/silver/bronze, a brand secondary,
 * a chart series). Those live under this reserved namespace so they can never
 * collide with a current or future schema token, stay fully themeable (a real
 * `--color-x-*` custom property every theme may recolor), and still pass the
 * `no-hardcoded-colors` gate when consumed as `var(--color-x-*)`.
 *
 * The `color-` prefix is required, not cosmetic: only variables under Tailwind v4's
 * `--color-*` namespace generate color utilities (`--color-x-gold` → `bg-x-gold`).
 *
 * These constants are the single source of truth shared by the validator
 * (validate.ts), the runtime apply + fallback (apply.ts), and the JSON Schema
 * generator (scripts/generate-theme.ts) so the rule can't drift between them.
 */
export const CUSTOM_COLOR_PREFIX = 'color-x-';

/**
 * A well-formed custom-color name: `color-x-` + a slug that is lowercase
 * alphanumeric/hyphen, starts and ends alphanumeric, and is length-capped (~32).
 * Anchored, so partial matches can't slip through.
 */
export const CUSTOM_COLOR_RE = /^color-x-[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/**
 * Per-theme cap on custom colors. This is an anti-DoS bound on the *untrusted*
 * import path (built-in themes bypass `validateTheme`), deliberately generous —
 * chart series and category palettes are legitimate — rather than a UX limit.
 */
export const MAX_CUSTOM_COLORS = 64;

/** True for a syntactically-valid custom-color token name (`color-x-<slug>`). */
export const isCustomColorName = (name: string): boolean => CUSTOM_COLOR_RE.test(name);

/**
 * Font families a theme is allowed to name. The `url()` blacklist means a theme
 * can never *load* a font, so it may only reference what the app bundles plus CSS
 * generic keywords. Compared case-insensitively.
 *
 * Each bundled font records HOW an app loads it — the Fontsource npm package and
 * the exact import specifier(s) — so the single hard part of adopting a theme
 * ("make 'Fraunces Variable' actually resolve") is data, not tribal knowledge.
 * `veneerui add fonts` and docs/fonts.md are both driven from this list (the CLI
 * via the generated packages/lint-core/font-packages.generated.js).
 */
export interface BundledFont {
  /** Canonical family a theme's font token names (e.g. `'Inter Variable'`). */
  family: string;
  /** Other accepted spellings (e.g. the non-variable name). */
  aliases?: string[];
  /** Fontsource npm package to install; omitted when the face is self-hosted. */
  pkg?: string;
  /** Exact import specifier(s) — JS `import '…'` or CSS `@import "…"`. */
  imports?: string[];
  /** Loading caveat worth surfacing (static weights, italics, self-hosting). */
  note?: string;
}

const BUNDLED_FONTS: BundledFont[] = [
  { family: 'Inter Variable', aliases: ['Inter'], pkg: '@fontsource-variable/inter', imports: ['@fontsource-variable/inter'] },
  { family: 'Source Serif 4 Variable', aliases: ['Source Serif 4'], pkg: '@fontsource-variable/source-serif-4', imports: ['@fontsource-variable/source-serif-4'] },
  { family: 'JetBrains Mono Variable', aliases: ['JetBrains Mono'], pkg: '@fontsource-variable/jetbrains-mono', imports: ['@fontsource-variable/jetbrains-mono'] },
  { family: 'Fraunces Variable', aliases: ['Fraunces'], pkg: '@fontsource-variable/fraunces', imports: ['@fontsource-variable/fraunces'] },
  { family: 'Archivo Black', pkg: '@fontsource/archivo-black', imports: ['@fontsource/archivo-black'], note: 'Single weight (900).' },
  { family: 'Orbitron Variable', aliases: ['Orbitron'], pkg: '@fontsource-variable/orbitron', imports: ['@fontsource-variable/orbitron'] },
  { family: 'Quicksand Variable', aliases: ['Quicksand'], pkg: '@fontsource-variable/quicksand', imports: ['@fontsource-variable/quicksand'] },
  {
    family: 'EB Garamond Variable',
    aliases: ['EB Garamond'],
    pkg: '@fontsource-variable/eb-garamond',
    imports: ['@fontsource-variable/eb-garamond', '@fontsource-variable/eb-garamond/wght-italic.css'],
    note: 'Variable; add the italic axis import if your theme uses italics.',
  },
  {
    family: 'IBM Plex Mono',
    pkg: '@fontsource/ibm-plex-mono',
    imports: [
      '@fontsource/ibm-plex-mono/400.css',
      '@fontsource/ibm-plex-mono/500.css',
      '@fontsource/ibm-plex-mono/600.css',
      '@fontsource/ibm-plex-mono/400-italic.css',
    ],
    note: 'Static (no variable build) — import each weight you use.',
  },
  { family: 'MS Sans Serif', note: 'Windows 95 theme — self-host the face; not on Fontsource.' },
];

const GENERIC_FONT_KEYWORDS = [
  'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji',
];

/** Every bundled font, with its Fontsource package + import recipe. */
export const FONTS: readonly BundledFont[] = BUNDLED_FONTS;

export const ALLOWED_FONT_FAMILIES: ReadonlySet<string> = new Set(
  [
    ...BUNDLED_FONTS.flatMap((f) => [f.family, ...(f.aliases ?? [])]),
    ...GENERIC_FONT_KEYWORDS,
  ].map((f) => f.toLowerCase()),
);
