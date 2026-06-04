/**
 * ThemeSwitcher — compact dropdown listing the enabled themes with preview
 * swatches and a checkmark on the current one. Selecting calls setCurrent, which
 * applies the theme instantly. The library/gallery links are placeholders until
 * Phase 3/4 land those screens.
 *
 * Styled entirely with semantic token utilities (bg-surface-*, text-text-*,
 * border-border, rounded-md, shadow-lg, …) so it re-skins with every theme —
 * it's the first component to follow the Phase 2 adoption contract.
 *
 * SSR-safe: the trigger renders theme *identity* (the current name, its
 * colour swatches, the shuffle badge), all of which come from client-only state
 * (localStorage / a per-load shuffle roll). It gates them on `useTheme().hydrated`
 * so the server and first client render emit an identical, theme-neutral trigger
 * — then reveals the real theme after mount. Without the gate, an SSR host hits a
 * React hydration mismatch on first paint. (On a Next project, `veneerui add`
 * prepends the required `'use client'` directive when it copies this in.)
 */
import { useEffect, useRef, useState } from 'react';
import { useTheme, tokenValue, type Theme } from '@offthegully/veneerui';
import { ImportPanel } from './ImportPanel';
import { GalleryPanel } from './GalleryPanel';

function Swatches({ theme }: { theme: Theme }) {
  const surface = tokenValue(theme, 'color-surface');
  const primary = tokenValue(theme, 'color-primary');
  const text = tokenValue(theme, 'color-text');
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full [border-width:var(--border-width-default)] border-border"
      style={{ background: surface }}
    >
      <span className="size-3 rounded-full" style={{ background: primary }} />
      <span className="ml-0.5 size-1.5 rounded-full" style={{ background: text }} />
    </span>
  );
}

/**
 * The pre-hydration trigger swatch. Same shape as <Swatches>, but driven by
 * token *utilities* (bg-surface/bg-primary/bg-text) instead of a specific theme's
 * inline colour values — so its markup is identical on the server and the first
 * client render. The CSS variables behind those utilities are applied to the DOM
 * by the anti-flash script, not React, so they never participate in hydration.
 */
function PlaceholderSwatch() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full [border-width:var(--border-width-default)] border-border bg-surface"
    >
      <span className="size-3 rounded-full bg-primary" />
      <span className="ml-0.5 size-1.5 rounded-full bg-text" />
    </span>
  );
}

/**
 * `header` (default): square-ish button, dropdown opens downward — for the bar at
 * the top. `floating`: a rounded pill with stronger elevation whose dropdown opens
 * *upward*, for the control fixed to the bottom-right corner.
 */
type SwitcherVariant = 'header' | 'floating';

export function ThemeSwitcher({ variant = 'header' }: { variant?: SwitcherVariant } = {}) {
  const { enabledThemes, currentId, current, pinned, hydrated, setCurrent, shuffle } = useTheme();
  const floating = variant === 'floating';
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (id: string) => {
    setCurrent(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 [border-width:var(--border-width-default)] border-border bg-surface-raised px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover ${
          floating ? 'rounded-full [box-shadow:var(--shadow-lg)]' : 'rounded-md [box-shadow:var(--shadow-sm)]'
        }`}
      >
        {/* Identity (swatches / name / shuffle badge) is client-only state; hold a
            theme-neutral trigger until mount so the server and first client render
            match, then reveal the real theme. See the file header. */}
        {hydrated ? <Swatches theme={current} /> : <PlaceholderSwatch />}
        <span>{hydrated ? current.name : 'Theme'}</span>
        {/* When unpinned the theme re-rolls each visit — flag it so "it changed" reads
            as intentional, not a bug. Pick one from the list to lock it in. */}
        {hydrated && !pinned && (
          <span aria-label="Shuffling — pick a theme to keep it" title="Shuffling — pick a theme to keep it">
            🎲
          </span>
        )}
        <svg viewBox="0 0 20 20" className="size-4 text-text-muted" aria-hidden="true">
          <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 z-50 w-64 overflow-hidden rounded-lg [border-width:var(--border-width-default)] border-border bg-surface-overlay [box-shadow:var(--shadow-lg)] ${
            floating ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          <ul className="max-h-80 overflow-auto p-1">
            {/* Shuffle: re-roll now and stay unpinned, so it keeps changing each
                visit. Highlighted while active; selecting any theme below pins it. */}
            <li>
              <button
                type="button"
                onClick={() => shuffle()}
                aria-pressed={!pinned}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                  !pinned ? 'bg-surface-sunken' : ''
                }`}
              >
                <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center text-base">
                  🎲
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text">Shuffle</span>
                  <span className="block truncate text-xs text-text-muted">
                    {pinned ? 'Surprise me each visit' : 'Random each visit · pick one to keep'}
                  </span>
                </span>
                {!pinned && (
                  <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-primary" aria-hidden="true">
                    <path d="M5 10l3.5 3.5L15 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
            <li aria-hidden="true">
              <div className="my-1 border-t border-border" />
            </li>
            {enabledThemes.map((theme) => {
              const selected = theme.id === currentId;
              return (
                <li key={theme.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(theme.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                      selected ? 'bg-surface-sunken' : ''
                    }`}
                  >
                    <Swatches theme={theme} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-text">{theme.name}</span>
                      {theme.description && (
                        <span className="block truncate text-xs text-text-muted">{theme.description}</span>
                      )}
                    </span>
                    {/* Check only when pinned: an unpinned current theme is the live
                        shuffle pick, not a saved choice — the 🎲 row carries the check. */}
                    {selected && pinned && (
                      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-primary" aria-hidden="true">
                        <path d="M5 10l3.5 3.5L15 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-text-muted">
            <button
              type="button"
              className="font-medium hover:text-text"
              onClick={() => {
                setImportOpen(true);
                setOpen(false);
              }}
            >
              Manage themes
            </button>
            <button
              type="button"
              className="font-medium hover:text-text"
              onClick={() => {
                setGalleryOpen(true);
                setOpen(false);
              }}
            >
              Browse gallery
            </button>
          </div>
        </div>
      )}

      {importOpen && <ImportPanel onClose={() => setImportOpen(false)} />}
      {galleryOpen && <GalleryPanel onClose={() => setGalleryOpen(false)} />}
    </div>
  );
}
