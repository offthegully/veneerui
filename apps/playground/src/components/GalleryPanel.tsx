/**
 * GalleryPanel — the "Browse gallery" modal. A visual grid of every app theme
 * (the package defaults plus the whole gallery), each rendered as a live mini-
 * preview in its *own* tokens, so you choose by look rather than by name.
 *
 * Unlike ImportPanel, these themes are already shipped and validated, so picking
 * one just switches to it (no preview/save dance). It enables the theme if a
 * returning visitor had disabled it, then makes it current.
 *
 * Per-card previews use inline `tokenValue(theme, …)` because Tailwind utilities
 * resolve against the *active* theme's CSS variables — to paint each card in its
 * own palette we read that theme's values directly. The modal chrome itself uses
 * ordinary token utilities, so the panel re-skins with the active theme.
 */
import { useEffect, useId } from 'react';
import { useTheme, tokenValue, type Theme } from '@veneer/theme';

/** A small mock UI painted entirely from one theme's own resolved tokens. */
function ThemePreview({ theme }: { theme: Theme }) {
  const v = (name: string) => tokenValue(theme, name);
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-2 p-4"
      style={{
        background: v('color-surface'),
        borderRadius: v('radius-lg'),
        boxShadow: v('shadow-card'),
        borderColor: v('color-border'),
        borderWidth: v('border-width-default'),
        borderStyle: 'solid',
      }}
    >
      <span
        className="text-lg leading-tight font-bold"
        style={{ color: v('color-text'), fontFamily: v('font-display') }}
      >
        The quick brown fox
      </span>
      <span className="text-xs" style={{ color: v('color-text-muted'), fontFamily: v('font-sans') }}>
        Body copy in this theme's type and palette.
      </span>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="px-3 py-1 text-xs font-medium"
          style={{
            background: v('color-primary'),
            color: v('color-text-on-primary'),
            borderRadius: v('radius-md'),
            boxShadow: v('shadow-sm'),
          }}
        >
          Primary
        </span>
        <span
          className="px-3 py-1 text-xs font-medium"
          style={{
            color: v('color-text'),
            borderRadius: v('radius-md'),
            borderColor: v('color-border'),
            borderWidth: v('border-width-thin'),
            borderStyle: 'solid',
          }}
        >
          Outline
        </span>
        <span className="ml-auto flex items-center gap-1">
          {['color-accent', 'color-success', 'color-danger'].map((name) => (
            <span
              key={name}
              className="size-3 rounded-full"
              style={{ background: v(name) }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export function GalleryPanel({ onClose }: { onClose: () => void }) {
  const { themes, currentId, enabledIds, setEnabled, setCurrent } = useTheme();
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Enable (a no-op if already in the switcher) and select. Both are functional
  // updaters on the same library, and React applies queued updaters in order, so
  // setCurrent sees the just-enabled id — no need to defer the switch.
  const apply = (id: string) => {
    setEnabled(id, true);
    setCurrent(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay-backdrop p-4 pt-[8vh]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-xl border border-border bg-surface-overlay p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-text">
              Browse gallery
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {themes.length} ready-to-use themes. Click one to apply it live — pick by look, not
              by name.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => {
            const isCurrent = theme.id === currentId;
            const inSwitcher = enabledIds.includes(theme.id);
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => apply(theme.id)}
                aria-pressed={isCurrent}
                className={`group flex flex-col gap-3 rounded-lg border bg-surface-raised p-3 text-left transition-colors hover:bg-surface-sunken ${
                  isCurrent ? 'border-primary ring-2 ring-primary' : 'border-border'
                }`}
              >
                <ThemePreview theme={theme} />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium text-text">{theme.name}</span>
                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
                        Active
                      </span>
                    ) : inSwitcher ? (
                      <span className="shrink-0 text-xs text-text-subtle">In switcher</span>
                    ) : null}
                  </div>
                  {theme.description && (
                    <p className="line-clamp-2 text-xs text-text-muted">{theme.description}</p>
                  )}
                  {theme.tags && theme.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {theme.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-text-subtle"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
