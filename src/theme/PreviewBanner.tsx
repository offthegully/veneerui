/**
 * PreviewBanner — a persistent strip pinned to the top of the app while an
 * imported theme is being previewed (applied live but not yet saved). It's the
 * only always-visible signal that "what you're looking at isn't saved yet," and
 * the place to commit or back out.
 *
 * Token-styled like everything else, so the banner itself re-skins under the
 * previewed theme — you're seeing exactly what saving would give you.
 */
import { useTheme } from './theme-context';

export function PreviewBanner() {
  const { preview, commitPreview, cancelPreview } = useTheme();
  if (!preview) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-border bg-surface-inverse px-6 py-3 text-text-inverse [border-bottom-width:var(--border-width-default)]"
    >
      <span className="flex-1 text-sm">
        <span className="font-medium">Previewing untested theme:</span>{' '}
        <span className="font-bold">{preview.name}</span>
        <span className="opacity-80"> by {preview.author.name}</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={commitPreview}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-text-on-primary transition-colors hover:bg-primary-hover"
        >
          Save to library
        </button>
        <button
          type="button"
          onClick={cancelPreview}
          className="rounded-md border border-text-inverse/40 px-3 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:border-text-inverse"
        >
          Stop preview
        </button>
      </div>
    </div>
  );
}
