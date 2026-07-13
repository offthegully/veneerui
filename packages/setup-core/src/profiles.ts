/**
 * The framework registry — the single source of truth for *what differs between
 * frameworks*, so adding one is editing data (a profile) rather than threading a
 * new `=== 'next'` branch through detect / init / scaffold / setup-plan / add.
 *
 * The key idea is that "framework" is really two orthogonal axes that the old
 * vite/next split conflated:
 *
 *   A. **Tailwind pipeline** — how `tokens.css` enters the build
 *      (`vite-plugin` via `@tailwindcss/vite`, or Next's `builtin` support).
 *   B. **Anti-flash placement** — where the pre-paint script must live. A SPA with
 *      a real `index.html` lets the `veneer()` Vite plugin inject it
 *      (`vite-index-html`); an SSR framework renders its document from a root
 *      component, so the script goes in that `<head>` instead (`head-script`).
 *
 * The trap the registry removes: every modern React meta-framework (React Router
 * 7, TanStack Start, Astro) is Vite-based (axis A = `vite-plugin`) **but** SSR
 * with no `index.html` (axis B = `head-script`). Treating "Vite" as implying
 * "index.html anti-flash" silently no-ops their flash prevention. Here the two
 * are independent fields, so an SSR-on-Vite framework is just another profile.
 *
 * This module is a leaf — it imports nothing from the rest of setup-core — so the
 * orchestrators (detect/init/scaffold/…) can all depend on it without cycles.
 */

/** Frameworks the web wiring engine knows. (Expo is a separate native path.) */
export type FrameworkId = 'vite' | 'next' | 'react-router' | 'tanstack-start';

/** Axis A — how Tailwind v4 (and so `tokens.css`) reaches the build. */
export type TailwindPipeline = 'vite-plugin' | 'builtin';

/** Axis B — where the synchronous anti-flash script must be placed. */
export type AntiFlashPlacement = 'vite-index-html' | 'head-script';

/**
 * Which `init` wiring routine applies. Distinct from the axes above because the
 * *shape* of the edit differs: `vite-spa` patches the Vite config + `src/main`;
 * `next-app` needs a `'use client'` providers boundary + the `/next` adapter;
 * `ssr-root` wraps `{children}` and inlines `getAntiFlashScript()` in the root
 * document's `<head>` — the generic SSR shape that RR7, TanStack Start, and
 * Astro layouts all share.
 */
export type WiringKind = 'vite-spa' | 'next-app' | 'ssr-root';

export interface ScaffoldProfile {
  /** The `create-<tool>` initializer (`npm create <tool>`). */
  createTool: string;
  /** The template already ships Tailwind v4 — skip our Tailwind install + setup. */
  bringsTailwind: boolean;
  /** The create tool installs deps itself (so we needn't install to pull the tree). */
  autoInstalls: boolean;
  /** Where the token-driven starter page is written, its fn name, and its import base. */
  starter: { file: string; fnName: string; importFrom: string };
  /**
   * Extra dev deps to install for this scaffold beyond the runtime + the
   * eslint-plugin. Templates that ship no ESLint (React Router; create-vite v8
   * ships oxlint instead) add `eslint` + `typescript-eslint` here so the
   * veneer/* themeability gate is runnable out of the box.
   */
  extraDevDeps?: string[];
}

export interface FrameworkProfile {
  id: FrameworkId;
  /** Shown in the `create-veneerui` framework prompt. */
  label: string;
  hint: string;
  /**
   * Any of these dependency names present ⇒ this framework. Registry order is
   * match precedence: more specific frameworks (which often *also* depend on
   * Vite) must come before the generic `vite` SPA profile.
   */
  detectDeps: string[];
  /**
   * ALL of these must also be present for the profile to match — the guard for
   * profiles whose `detectDeps` are shared tooling (Vue and vitest-only repos
   * also depend on `vite`; requiring `react` keeps them out).
   */
  requireDeps?: string[];
  tailwind: TailwindPipeline;
  antiFlash: AntiFlashPlacement;
  wiring: WiringKind;
  /** Copied client components need a `'use client'` directive (RSC frameworks only). */
  needsUseClient: boolean;
  /** Where `init` looks for the Tailwind stylesheet (the token `@import` target). */
  cssCandidates: string[];
  /** Where `init` looks for the entry/root file the provider + anti-flash land in. */
  entryCandidates: string[];
  /** Override for where `add` copies components (else `src/components` | `components`). */
  componentsDir?: string;
  /** Present when `create-veneerui` can scaffold this framework fresh. */
  scaffold?: ScaffoldProfile;
}

const VITE_CSS = [
  'src/index.css',
  'src/main.css',
  'src/app.css',
  'src/styles/index.css',
  'src/styles/globals.css',
];
const VITE_ENTRY = ['src/main.tsx', 'src/main.jsx', 'src/index.tsx'];

const NEXT_CSS = ['app/globals.css', 'src/app/globals.css', 'styles/globals.css', 'app/global.css'];
const NEXT_ENTRY = ['app/layout.tsx', 'src/app/layout.tsx', 'app/layout.jsx'];

const RR_CSS = ['app/app.css', 'app/tailwind.css', 'app/styles/app.css', 'app/globals.css'];
const RR_ENTRY = ['app/root.tsx', 'app/root.jsx'];

const TANSTACK_CSS = ['src/styles/app.css', 'src/styles.css', 'src/app.css', 'app/styles/app.css'];
const TANSTACK_ENTRY = ['src/routes/__root.tsx', 'app/routes/__root.tsx'];

/**
 * The registry, in detection-precedence order (specific → generic). `next` and
 * `react-router` precede `vite` because an RR7 app *also* depends on Vite — the
 * `@react-router/dev` build plugin is what distinguishes it from a plain
 * create-vite SPA.
 */
export const FRAMEWORK_PROFILES: FrameworkProfile[] = [
  {
    id: 'next',
    label: 'Next.js (App Router)',
    hint: 'SSR-safe — fully wired',
    detectDeps: ['next'],
    tailwind: 'builtin',
    antiFlash: 'head-script',
    wiring: 'next-app',
    needsUseClient: true,
    cssCandidates: NEXT_CSS,
    entryCandidates: NEXT_ENTRY,
    scaffold: {
      createTool: 'next-app',
      bringsTailwind: true,
      autoInstalls: true,
      starter: { file: 'app/page.tsx', fnName: 'Home', importFrom: '@/components' },
    },
  },
  {
    id: 'react-router',
    label: 'React Router 7',
    hint: 'SSR (the Remix successor) — fully wired',
    // `@react-router/dev` is the framework-mode Vite plugin; `react-router` alone
    // is just the routing library (used in plain SPAs too), so don't key on it.
    detectDeps: ['@react-router/dev'],
    tailwind: 'vite-plugin',
    antiFlash: 'head-script',
    wiring: 'ssr-root',
    needsUseClient: false,
    cssCandidates: RR_CSS,
    entryCandidates: RR_ENTRY,
    componentsDir: 'app/components',
    scaffold: {
      createTool: 'react-router',
      bringsTailwind: true,
      autoInstalls: true,
      starter: { file: 'app/routes/home.tsx', fnName: 'Home', importFrom: '../components' },
      // create-react-router ships no ESLint; add a minimal linter so the gate runs.
      extraDevDeps: ['eslint', 'typescript-eslint'],
    },
  },
  {
    id: 'tanstack-start',
    label: 'TanStack Start',
    hint: 'SSR on Vite — same wiring as React Router',
    // Same SSR-on-Vite shape as React Router: a `__root.tsx` RootDocument with
    // `<html><head>…</head><body>{children}…`, so `wireSsrRoot` patches it with no
    // new code. `init`-only for now (no `scaffold`): its create CLI is still in
    // flux, so we recognize + auto-wire existing apps but don't scaffold fresh ones.
    detectDeps: ['@tanstack/react-start'],
    tailwind: 'vite-plugin',
    antiFlash: 'head-script',
    wiring: 'ssr-root',
    needsUseClient: false,
    cssCandidates: TANSTACK_CSS,
    entryCandidates: TANSTACK_ENTRY,
  },
  {
    id: 'vite',
    label: 'Vite + React',
    hint: 'fastest — fully wired',
    detectDeps: ['vite', '@vitejs/plugin-react', '@vitejs/plugin-react-swc'],
    // `vite` alone is ambiguous (Vue/Svelte apps, vitest-only repos): the wiring
    // and printed snippets are React-shaped, so a React-less match would confidently
    // patch the wrong project.
    requireDeps: ['react'],
    tailwind: 'vite-plugin',
    antiFlash: 'vite-index-html',
    wiring: 'vite-spa',
    needsUseClient: false,
    cssCandidates: VITE_CSS,
    entryCandidates: VITE_ENTRY,
    scaffold: {
      createTool: 'vite',
      bringsTailwind: false,
      autoInstalls: false,
      starter: { file: 'src/App.tsx', fnName: 'App', importFrom: './components' },
      // create-vite v8 ships oxlint, not ESLint — without these the veneer/*
      // themeability gate has no runner and can never wire.
      extraDevDeps: ['eslint', 'typescript-eslint'],
    },
  },
];

/** Look up a profile by id (or by the loose framework string). `undefined` ⇒ unknown. */
export function getProfile(id: string | undefined): FrameworkProfile | undefined {
  return FRAMEWORK_PROFILES.find((p) => p.id === id);
}
