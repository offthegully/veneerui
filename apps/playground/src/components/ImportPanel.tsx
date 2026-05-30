/**
 * ImportPanel — the "Manage themes" modal. Two ways in, one outcome:
 *   - drop / pick a `theme.json` file  → source: 'custom'
 *   - paste a raw URL (e.g. raw.githubusercontent.com) and fetch → source: 'imported'
 *
 * On a successful validate it doesn't save — it starts a *preview* (applies the
 * theme live) and closes, so you judge the theme on the real UI. The persistent
 * PreviewBanner then offers "Save to library" / "Stop preview". Validation
 * errors keep the modal open with a readable list; nothing reaches the DOM until
 * it's valid.
 */
import { useEffect, useId, useRef, useState } from 'react';
import {
  useTheme,
  browserCheckValue,
  parseAndValidate,
  fetchTheme,
  isFetchableUrl,
  type ImportOutcome,
} from '@offthegully/veneerui';

/**
 * Mounted only while open (see ThemeSwitcher), so initial state is the reset —
 * no effect needed to clear fields between opens.
 */
export function ImportPanel({ onClose }: { onClose: () => void }) {
  const { previewTheme } = useTheme();
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<ImportOutcome['errors']>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /** Apply a successful outcome as a preview and close; surface errors otherwise. */
  const handle = (outcome: ImportOutcome) => {
    if (outcome.ok && outcome.theme) {
      setErrors([]);
      previewTheme(outcome.theme);
      onClose();
    } else {
      setErrors(outcome.errors);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    handle(parseAndValidate(await file.text(), browserCheckValue, { source: 'custom' }));
  };

  const onFetch = async () => {
    setBusy(true);
    setErrors([]);
    try {
      handle(await fetchTheme(url.trim(), browserCheckValue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay-backdrop p-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-border bg-surface-overlay p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-text">
              Import a theme
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Drop a <code className="font-mono text-xs">theme.json</code>, or paste a raw gallery
              URL. You&apos;ll preview it live before saving.
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

        {/* File drop zone */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void onFile(e.dataTransfer.files[0]);
          }}
          className={`flex w-full flex-col items-center gap-2 rounded-lg border-border bg-surface-sunken px-6 py-10 text-center transition-colors [border-width:var(--border-width-default)] ${
            dragOver ? 'bg-primary-subtle' : 'hover:bg-surface-raised'
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-8 text-text-subtle" aria-hidden="true">
            <path d="M12 16V4m0 0L7 9m5-5l5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-text">Drop theme.json here, or click to browse</span>
          <span className="text-xs text-text-subtle">Validated locally — nothing is uploaded</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = ''; // allow re-picking the same file
          }}
        />

        {/* URL fetch */}
        <div className="mt-4">
          <label htmlFor={`${titleId}-url`} className="mb-1.5 block text-xs font-medium text-text-muted">
            …or import from a raw URL
          </label>
          <div className="flex gap-2">
            <input
              id={`${titleId}-url`}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isFetchableUrl(url.trim())) void onFetch();
              }}
              placeholder="https://raw.githubusercontent.com/…/theme.json"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void onFetch()}
              disabled={busy || !isFetchableUrl(url.trim())}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-(--opacity-disabled)"
            >
              {busy ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-4 rounded-md border border-danger bg-surface px-3 py-2 text-sm text-danger">
            <p className="font-medium">Couldn't import this theme:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
              {errors.slice(0, 8).map((e, i) => (
                <li key={i}>
                  {e.path ? <code className="font-mono">{e.path}</code> : null} {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
