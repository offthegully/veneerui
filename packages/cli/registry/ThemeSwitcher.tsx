/**
 * ThemeSwitcher — compact dropdown listing the enabled themes with preview
 * swatches and a checkmark on the current one. Selecting calls setCurrent, which
 * applies the theme instantly. The library/gallery links are placeholders until
 * Phase 3/4 land those screens.
 *
 * Styled entirely with semantic token utilities (bg-surface-*, text-text-*,
 * border-border, rounded-md, shadow-lg, …) so it re-skins with every theme —
 * it's the first component to follow the Phase 2 adoption contract.
 */
import { useEffect, useRef, useState } from 'react';
import { useTheme, tokenValue, type Theme } from '@veneer/theme';
import { ImportPanel } from './ImportPanel';

function Swatches({ theme }: { theme: Theme }) {
  const surface = tokenValue(theme, 'color-surface');
  const primary = tokenValue(theme, 'color-primary');
  const text = tokenValue(theme, 'color-text');
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border"
      style={{ background: surface }}
    >
      <span className="size-3 rounded-full" style={{ background: primary }} />
      <span className="ml-0.5 size-1.5 rounded-full" style={{ background: text }} />
    </span>
  );
}

export function ThemeSwitcher() {
  const { enabledThemes, currentId, current, setCurrent } = useTheme();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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
        className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-text shadow-sm transition-colors hover:bg-surface-sunken"
      >
        <Swatches theme={current} />
        <span>{current.name}</span>
        <svg viewBox="0 0 20 20" className="size-4 text-text-muted" aria-hidden="true">
          <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-surface-overlay shadow-lg"
        >
          <ul className="max-h-80 overflow-auto p-1">
            {enabledThemes.map((theme) => {
              const selected = theme.id === currentId;
              return (
                <li key={theme.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(theme.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-sunken ${
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
                    {selected && (
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
            {/* Gallery browse arrives in Phase 4. */}
            <button type="button" className="hover:text-text" title="Coming in Phase 4" disabled>
              Browse gallery
            </button>
          </div>
        </div>
      )}

      {importOpen && <ImportPanel onClose={() => setImportOpen(false)} />}
    </div>
  );
}
