/**
 * ProjectOverview — the Veneer landing page and default view. Every visual value
 * flows from semantic tokens, so the page re-skins live as you switch themes. The
 * closing CTAs hand off into the playground surfaces.
 *
 * No hardcoded colors — the conformance test enforces this. Full-bleed: App
 * renders it without the centered container.
 */
import { useState } from 'react';
import { useTheme } from '@offthegully/veneerui';
import { GalleryPanel } from './GalleryPanel';

const motion = 'transition-colors duration-[calc(var(--duration-default)*1ms)] ease-default';

// Buttons/CTAs: a theme-timed lift on hover and a snappy scale-down on press, so
// the feel of every interaction tracks the active theme's motion tokens.
const interactive =
  'transition-[transform,box-shadow,background-color,border-color,color] ' +
  'duration-[calc(var(--duration-default)*1ms)] ease-default ' +
  'hover:-translate-y-px active:translate-y-0 active:scale-[0.98] ' +
  'active:duration-[calc(var(--duration-fast)*1ms)] active:ease-snappy ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Cards: a subtle lift with border emphasis on hover; `group` lets the icon nudge.
const card =
  'group transition-[transform,box-shadow,border-color] ' +
  'duration-[calc(var(--duration-default)*1ms)] ease-default ' +
  'hover:-translate-y-0.5 hover:border-border-strong';

const GITHUB_URL = 'https://github.com/offthegully/veneer';

/** GitHub mark, drawn in currentColor so it inherits the surrounding token color. */
const GITHUB_PATH =
  'M12 1.5A10.5 10.5 0 0 0 8.68 22c.52.1.71-.23.71-.5v-1.96c-2.92.64-3.54-1.25-3.54-1.25-.48-1.21-1.17-1.53-1.17-1.53-.95-.65.07-.64.07-.64 1.06.07 1.61 1.09 1.61 1.09.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.67-1.4-2.33-.27-4.78-1.17-4.78-5.18 0-1.15.41-2.08 1.08-2.82-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.88 1.07a9.9 9.9 0 0 1 5.24 0c2-1.35 2.88-1.07 2.88-1.07.57 1.45.21 2.52.1 2.79.67.74 1.08 1.67 1.08 2.82 0 4.02-2.46 4.9-4.8 5.16.38.33.71.97.71 1.96v2.9c0 .28.19.61.72.5A10.5 10.5 0 0 0 12 1.5z';

const FEATURES = [
  {
    title: 'Tokens, not overrides',
    body: 'Color, type, spacing, borders, radii, shadows, blur, and motion all flow from one fixed token set. A theme overrides some of them; the whole product follows.',
    path: 'M4 7h16M4 12h16M4 17h10',
  },
  {
    title: 'Instant switching',
    body: 'Applying a theme writes CSS custom properties to the root element — one DOM write, no rebuild, no reload, no React re-render.',
    path: 'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
  },
  {
    title: 'Themes are inert data',
    body: 'A theme is plain JSON — no CSS, no scripts. Validation forbids url(), @import and javascript:, and fonts may only name a bundled allowlist, so themes are safe to load from anywhere.',
    path: 'M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4z',
  },
  {
    title: 'Framework-agnostic',
    body: 'Drop it into an existing Vite or Next app on Tailwind v4. It is a runtime you add, not a scaffolder you adopt.',
    path: 'M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7zM4 13h7v7H4z',
  },
  {
    title: 'No server, no account',
    body: 'Your theme library lives in the browser. Import, author, and export are entirely client-side — nothing is uploaded.',
    path: 'M3 12h18M12 3v18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4',
  },
  {
    title: 'A real gallery',
    body: 'Ship a dozen ready-made themes spanning whole design languages — editorial, brutalist, glass, terminal — or start from one and author your own.',
    path: 'M4 5h7v7H4zM13 5h7v4h-7zM13 12h7v7h-7zM4 15h7v4H4z',
  },
];

const DOCS_BASE = 'https://github.com/offthegully/veneerui/blob/main/docs';

const DOCS = [
  { title: 'Authoring guide', blurb: 'Pick a coherent palette and surface ladder.', href: `${DOCS_BASE}/authoring-guide.md` },
  { title: 'Vite integration', blurb: 'Add Veneer to a Vite + React + Tailwind v4 app.', href: `${DOCS_BASE}/integration-vite.md` },
  { title: 'Next integration', blurb: 'Wire it into a Next App Router project.', href: `${DOCS_BASE}/integration-next.md` },
  { title: 'Token reference', blurb: 'Every token you can set, with defaults.', href: `${DOCS_BASE}/schema-reference.md` },
];

function VeneerMark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  if (size === 'sm') {
    return <img src="/veneer-mark-32.png" alt="" className={`rounded ${className ?? ''}`} aria-hidden="true" draggable={false} />;
  }
  return <img src="/veneer-appicon-180.png" alt="" className={`rounded-md ${className ?? ''}`} aria-hidden="true" draggable={false} />;
}

export function ProjectOverview() {
  const { current } = useTheme();
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    // Page background is the theme's surface gradient (a subtle wash for most
    // themes, a vivid field for glass), matching LandingPreview so the two read
    // as one site.
    <div className="bg-(image:--gradient-surface) text-text">
      {/* Hero */}
      <header className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1 text-xs font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary veneer-live-dot" />
          Open source · MIT
        </span>
        <div className="mt-7 flex items-center justify-center gap-3">
          <VeneerMark className="size-11" />
          <span className="font-display text-5xl font-black tracking-tighter">Veneer</span>
        </div>
        {/* text-balance evens out the wrap so wide/heavy display faces (Archivo
            Black, Orbitron, mono) don't fall into lopsided 5–6 line stacks on
            mobile; the non-breaking space keeps "CSS v4" together so "v4" never
            orphans onto its own line. */}
        <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-5xl leading-tight font-black tracking-tighter sm:text-6xl">
          A user-extensible theming system for{' '}
          {/* pr/-mr pair: background-clip:text plus the negative tracking trims the
              last glyph's edge; padding gives the clip room, the negative margin
              cancels the width change so the centered line doesn't shift. */}
          <span className="bg-clip-text text-transparent bg-(image:--gradient-text) pr-[0.12em] mr-[-0.12em]">
            Tailwind CSS&nbsp;v4
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          The entire visual surface — color, type, spacing, borders, radii, shadows, blur, and
          motion — comes from a fixed set of design tokens. A <span className="font-medium text-text">theme</span> is
          a small JSON file that overrides some of them. Switching is instant, and themes are inert
          data, so they're safe to load from anywhere.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-text-on-primary [box-shadow:var(--shadow-sm)] hover:bg-primary-hover hover:[box-shadow:var(--shadow-md)] ${interactive}`}
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path d={GITHUB_PATH} fill="currentColor" />
            </svg>
            View on GitHub
          </a>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className={`inline-flex items-center justify-center rounded-md border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text [box-shadow:var(--shadow-sm)] [border-width:var(--border-width-default)] hover:bg-surface-sunken hover:[box-shadow:var(--shadow-md)] ${interactive}`}
          >
            Browse the themes
          </button>
        </div>
      </header>

      {/* "This is live" callout — the page itself is the demo. */}
      <section className="border-border [border-top-width:var(--border-width-thin)] [border-bottom-width:var(--border-width-thin)] bg-surface-sunken">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-base leading-relaxed text-text">
            <span className="mr-2 inline-block size-2 rounded-full bg-primary veneer-live-dot align-middle" />
            You're viewing the <span className="font-semibold text-primary">{current.name}</span> theme.
            This whole page is rendered from it — switch themes with the picker in the top-right or
            bottom-right corner and watch every pixel follow. Nothing reloads.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">What makes it different</h2>
          <p className="mt-3 text-base text-text-muted">
            A theming runtime built around two ideas: one token set drives everything, and themes
            are data you can trust.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className={`flex flex-col gap-3 rounded-xl border-border bg-surface-raised p-6 backdrop-blur-md [box-shadow:var(--shadow-card)] [border-width:var(--border-width-default)] hover:[box-shadow:var(--shadow-lg)] ${card}`}
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-transform duration-[calc(var(--duration-default)*1ms)] ease-default group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path d={f.path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="text-lg font-bold text-text">{f.title}</h3>
              <p className="text-sm leading-relaxed text-text-muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Open source band */}
      <section className="bg-surface-sunken">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-16 bg-(image:--gradient-primary) [box-shadow:var(--shadow-xl)]">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-text-on-primary">
                Open source, themes welcome
              </h2>
              {/* Full-strength on-primary (no opacity knock-down): at 90% this body
                  copy dipped to low contrast on the lighter end of several themes'
                  primary gradients. The heading above already runs at full strength. */}
              <p className="mt-4 text-base leading-relaxed text-text-on-primary">
                Veneer is MIT-licensed and developed in the open. The gallery is a growing set of
                community themes — each one is a plain JSON file and a starting template for your
                own. Read the code, file an issue, or contribute a theme.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-text [box-shadow:var(--shadow-md)] hover:bg-surface-raised hover:[box-shadow:var(--shadow-lg)] sm:w-auto ${interactive}`}
                >
                  <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
                    <path d={GITHUB_PATH} fill="currentColor" />
                  </svg>
                  {/* The URL's pixel width tracks the active theme font (mono/serif themes
                      run far wider than sans), so break-all lets it wrap centered instead
                      of overflowing the button on narrow screens. */}
                  <span className="break-all text-center">github.com/offthegully/veneer</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Docs */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Documentation</h2>
          <p className="mt-3 text-base text-text-muted">
            The guides live in the repo — click any card to read them on GitHub.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {DOCS.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              target="_blank"
              rel="noreferrer"
              className={`flex items-start justify-between gap-4 rounded-xl border-border bg-surface-raised p-6 [border-width:var(--border-width-default)] ${card}`}
            >
              <div>
                <h3 className="text-lg font-bold text-text">{doc.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{doc.blurb}</p>
              </div>
              <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </div>
      </section>

      {/* Closing CTA — hand off into the playground surfaces */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className={`flex flex-col items-center gap-6 rounded-2xl border-border bg-surface-raised px-6 py-14 text-center backdrop-blur-md [box-shadow:var(--shadow-lg)] [border-width:var(--border-width-default)] hover:[box-shadow:var(--shadow-xl)] ${card}`}>
          <h2 className="max-w-2xl font-display text-3xl sm:text-4xl font-black tracking-tight text-text">
            See it on real screens
          </h2>
          <p className="max-w-lg text-base text-text-muted">
            The playground renders the same theme across a component showcase and a token
            inspector. Pick one and switch themes around it.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border [border-top-width:var(--border-width-default)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <VeneerMark className="size-6" size="sm" />
            <span className="font-display font-bold text-text">Veneer</span>
            <span className="text-text-subtle">· MIT licensed</span>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 hover:text-text ${motion}`}
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path d={GITHUB_PATH} fill="currentColor" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>

      {galleryOpen && <GalleryPanel onClose={() => setGalleryOpen(false)} />}
    </div>
  );
}
