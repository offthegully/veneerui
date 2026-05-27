/**
 * ThemeShowcase — a demo surface that exercises a wide slice of the token set
 * (color, surface, border-width, radius, shadow, typography, spacing, motion) so
 * switching themes is visibly more than a palette swap. It also serves as a
 * living example of the Phase 2 adoption contract: every visual value comes from
 * a semantic token utility, never a hardcoded color.
 *
 * Motion note: transition-duration has no Tailwind namespace and the duration
 * tokens are unitless numbers, so interactive elements consume them via
 * `duration-[calc(var(--duration-default)*1ms)]`.
 */
import { useTheme, tokenValue } from '@veneer/theme';

const motion = 'transition-colors duration-[calc(var(--duration-default)*1ms)] ease-default';

const PALETTE = [
  'color-primary',
  'color-accent',
  'color-success',
  'color-warning',
  'color-danger',
  'color-info',
] as const;

function Button({ children, variant = 'primary' }: { children: string; variant?: 'primary' | 'accent' | 'outline' | 'danger' }) {
  const base = `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium [box-shadow:var(--shadow-sm)] ${motion}`;
  const styles: Record<string, string> = {
    primary: 'bg-primary text-text-on-primary hover:bg-primary-hover',
    accent: 'bg-accent text-text-on-primary hover:bg-accent-hover',
    danger: 'bg-danger text-text-on-primary hover:opacity-90',
    outline: 'border-border bg-surface text-text hover:bg-surface-sunken [border-width:var(--border-width-default)]',
  };
  return <button type="button" className={`${base} ${styles[variant]}`}>{children}</button>;
}

export function ThemeShowcase() {
  const { current } = useTheme();

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-tight font-bold tracking-tight text-text">
          The quick brown fox
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-text-muted">
          This panel is rendered entirely from theme tokens. Switch the theme in the top-right and
          watch color, type, spacing, corners, borders, shadows, glow, gradients, and motion all
          change together — no component code re-renders, only CSS variables.
        </p>
        <p className="text-sm text-text-subtle">
          Active theme: <span className="font-medium text-text">{current.name}</span>
        </p>
      </section>

      {/* Buttons */}
      <section className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="danger">Danger</Button>
        <button
          type="button"
          disabled
          className={`inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-on-primary opacity-(--opacity-disabled)`}
        >
          Disabled
        </button>
      </section>

      {/* Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="flex flex-col gap-2 rounded-lg border-border bg-surface-raised p-5 [box-shadow:var(--shadow-card)] [border-width:var(--border-width-default)]">
          <h2 className="text-base font-bold text-text">Raised card</h2>
          <p className="text-sm text-text-muted">Uses surface-raised, the card shadow, and the themed border width.</p>
        </article>
        <article className="flex flex-col gap-2 rounded-lg border-border bg-surface-raised p-5 [box-shadow:var(--shadow-lg)] [border-width:var(--border-width-default)]">
          <h2 className="text-base font-bold text-text">Elevated</h2>
          <p className="text-sm text-text-muted">Higher elevation via shadow-lg — note brutalist's hard offset.</p>
        </article>
        <article className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-5">
          <h2 className="text-base font-bold text-text">Sunken well</h2>
          <code className="rounded-sm bg-surface px-2 py-1 font-mono text-xs text-text">font-mono · {tokenValue(current, 'radius-md')}</code>
        </article>
      </section>

      {/* Gradients */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-end rounded-lg p-5 text-text-on-primary [box-shadow:var(--shadow-md)] bg-[image:var(--gradient-primary)]">
          <span className="font-display text-xl font-bold">Primary</span>
        </div>
        <div className="flex items-end rounded-lg p-5 text-text-on-primary [box-shadow:var(--shadow-md)] bg-[image:var(--gradient-accent)]">
          <span className="font-display text-xl font-bold">Accent</span>
        </div>
        <div className="flex items-end rounded-lg border-border p-5 text-text [box-shadow:var(--shadow-md)] bg-[image:var(--gradient-surface)] [border-width:var(--border-width-thin)]">
          <span className="font-display text-xl font-bold">Surface</span>
        </div>
      </section>

      {/* Display & effects — gradient-clipped text, neon glow, frosted glass */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-7xl leading-tight font-black tracking-tighter bg-clip-text text-transparent bg-[image:var(--gradient-text)] pr-[0.12em]">
          Gradient
        </h2>
        <p className="font-display text-4xl font-extrabold text-text [text-shadow:var(--text-shadow-glow)]">Neon glow heading</p>
        <div className="relative overflow-hidden rounded-lg p-6 bg-[image:var(--gradient-primary)]">
          <div className="rounded-md border-border bg-surface-overlay/60 p-4 backdrop-blur-2xl drop-shadow-lg [border-width:var(--border-width-thin)]">
            <p className="text-sm font-medium text-text">
              Frosted glass — <code className="font-mono">backdrop-blur-2xl</code> over a gradient, lifted by{' '}
              <code className="font-mono">drop-shadow-lg</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Status pills */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-success px-3 py-1 text-xs font-medium text-text-on-primary">Success</span>
        <span className="rounded-full bg-warning px-3 py-1 text-xs font-medium text-text-on-primary">Warning</span>
        <span className="rounded-full bg-danger px-3 py-1 text-xs font-medium text-text-on-primary">Danger</span>
        <span className="rounded-full bg-info px-3 py-1 text-xs font-medium text-text-on-primary">Info</span>
      </section>

      {/* Palette */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text-muted">Palette</h2>
        <div className="flex flex-wrap gap-3">
          {PALETTE.map((name) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <span
                className="size-12 rounded-md border-border [border-width:var(--border-width-thin)]"
                style={{ background: tokenValue(current, name) }}
              />
              <span className="text-xs text-text-subtle">{name.replace('color-', '')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Type scale */}
      <section className="flex flex-col gap-1 border-border pt-2 [border-top-width:var(--border-width-default)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Type scale</p>
        <p className="font-display text-8xl font-black tracking-tighter text-text">Aa</p>
        <p className="font-display text-4xl font-bold text-text">Display 4xl</p>
        <p className="text-2xl font-medium text-text">Heading 2xl</p>
        <p className="text-base text-text">Body base — the default reading size.</p>
        <p className="text-base font-thin text-text-muted">Thin body — fashion/editorial weight.</p>
        <p className="text-sm text-text-muted">Small muted — secondary information.</p>
      </section>
    </div>
  );
}
