/**
 * Canonical types for the theme system. Imported by the app, the validator,
 * and build-time scripts (schema/CSS/doc generation). Keep this DOM-free and
 * dependency-free so it runs unchanged in the browser, in Node, and in CI.
 */

/** The value kinds a token can hold. Each maps to a validation strategy. */
export type TokenType =
  | 'color' // any valid CSS color
  | 'length' // px, rem, em, %, unitless 0, etc.
  | 'shadow' // box-shadow value (may be multi-layer / inset)
  | 'fontFamily' // CSS font-family stack (restricted to the bundled set)
  | 'number' // unitless number (opacity, line-height, font-weight)
  | 'easing' // CSS timing function (cubic-bezier, linear, steps, ...)
  | 'gradient' // linear/radial/conic-gradient string
  | 'textShadow' // text-shadow value (offsets, blur, color; may be multi-layer)
  | 'dropShadow'; // drop-shadow() filter argument (offset-x offset-y blur color)

/**
 * How a token reaches components.
 *
 * - `theme`: declared inside Tailwind's `@theme` block, so it both emits a
 *   `:root` custom property AND generates utility classes (e.g. `--color-primary`
 *   → `bg-primary`). The token `name` must sit in a Tailwind v4 namespace.
 * - `root`: declared in a plain `:root` block — emitted as a custom property but
 *   with no auto-generated utility, because Tailwind v4 has no namespace for it
 *   (border widths, durations, opacities, gradients). Components consume these via
 *   `var(--token)` or arbitrary-property utilities like `duration-(--duration-default)`.
 *
 * Either way, `applyTheme()` overrides the same `--name` custom property at runtime,
 * so theming works identically for both.
 */
export type TokenBridge = 'theme' | 'root';

export interface TokenDef {
  /** CSS custom-property name WITHOUT the leading `--`, e.g. "color-primary". */
  name: string;
  type: TokenType;
  /** Human grouping for docs and the eventual editor, e.g. "Colors". */
  category: string;
  bridge: TokenBridge;
  /** Fallback used when a theme omits this token (also the `@theme`/`:root` default). */
  default: string;
  /** Shown in the generated schema reference. */
  description: string;
  /** Themes may omit non-required tokens entirely; required ones must be present. */
  required?: boolean;
  /** Marks a token hidden from new authoring docs but still applied at runtime. */
  deprecated?: boolean;
}

/** A theme document as authored / stored. `tokens` is partial; gaps fall back to defaults. */
export interface Theme {
  id: string; // uuid
  name: string;
  description?: string;
  author: { id: string; name: string };
  version: string; // semver
  schemaVersion: number; // which generation of TOKEN_SCHEMA it targets
  tags?: string[];
  license?: string;
  tokens: Record<string, string>;
  source: 'builtin' | 'imported' | 'custom';
  /** Raw URL an imported theme came from (enables the optional update check). */
  sourceUrl?: string;
  importedAt?: string;
}

/** The user's client-side collection. Persisted to localStorage; no server. */
export interface ThemeLibrary {
  themes: Theme[];
  enabledIds: string[]; // subset shown in the switcher, in display order
  currentId: string; // the one applied right now (must be enabled)
  /**
   * Whether `currentId` is a deliberate pick the visitor made (vs. an auto-shuffled
   * one). When an app opts into shuffle-until-pinned (see `getAntiFlashScript`),
   * an unpinned library re-randomizes the theme on every load; selecting one from
   * the switcher pins it. Absent/false means "not pinned" → keep shuffling.
   */
  pinned?: boolean;
}

/** Current generation of the token schema. Bump on incompatible changes only. */
export const SCHEMA_VERSION = 1;
