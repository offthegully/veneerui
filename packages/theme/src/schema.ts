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
  def('color-success', 'color', 'Colors', 'theme', '#16a34a', 'Positive / success status'),
  def('color-warning', 'color', 'Colors', 'theme', '#d97706', 'Caution / warning status'),
  def('color-danger', 'color', 'Colors', 'theme', '#dc2626', 'Destructive / error status'),
  def('color-info', 'color', 'Colors', 'theme', '#0ea5e9', 'Informational status'),
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
  def('color-text-muted', 'color', 'Text', 'theme', '#6b7280', 'Secondary text'),
  def('color-text-subtle', 'color', 'Text', 'theme', '#9ca3af', 'Tertiary / placeholder text'),
  def('color-text-inverse', 'color', 'Text', 'theme', '#f9fafb', 'Text on inverse surfaces'),
  def('color-text-on-primary', 'color', 'Text', 'theme', '#ffffff', 'Text rendered on primary fills'),

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
 * Font families a theme is allowed to name. The `url()` blacklist means a theme
 * can never *load* a font, so it may only reference what the app bundles (loaded
 * in main.tsx) plus CSS generic keywords. Compared case-insensitively.
 */
const BUNDLED_FONT_FAMILIES = [
  'Inter Variable', 'Inter',
  'Source Serif 4 Variable', 'Source Serif 4',
  'JetBrains Mono Variable', 'JetBrains Mono',
  'Fraunces Variable', 'Fraunces',
  'Archivo Black',
];

const GENERIC_FONT_KEYWORDS = [
  'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji',
];

export const ALLOWED_FONT_FAMILIES: ReadonlySet<string> = new Set(
  [...BUNDLED_FONT_FAMILIES, ...GENERIC_FONT_KEYWORDS].map((f) => f.toLowerCase()),
);
