/**
 * ThemeTokens — the "What changed" view. A focused read of the tokens that give
 * the active theme its identity: the palette, surfaces & text, type, shape &
 * depth, and motion. For each token it shows a live sample, the resolved value,
 * and whether the theme *authored* it (an override) or inherits the schema
 * default — `theme.tokens` holds only the authored overrides, so that flag is
 * literally "what this theme changes."
 *
 * Samples are painted with inline `tokenValue(current, …)` because they must
 * reflect the *currently applied* theme's resolved values (the same values the
 * page around them already shows); the chrome uses ordinary token utilities.
 */
import { useTheme, tokenValue, type Theme } from '@veneer/theme';

type Kind = 'color' | 'font' | 'radius' | 'border' | 'shadow' | 'motion';

interface Group {
  title: string;
  blurb: string;
  rows: { name: string; kind: Kind; label?: string }[];
}

const GROUPS: Group[] = [
  {
    title: 'Palette',
    blurb: 'The semantic colors components reach for by role.',
    rows: [
      { name: 'color-primary', kind: 'color' },
      { name: 'color-accent', kind: 'color' },
      { name: 'color-success', kind: 'color' },
      { name: 'color-warning', kind: 'color' },
      { name: 'color-danger', kind: 'color' },
      { name: 'color-info', kind: 'color' },
    ],
  },
  {
    title: 'Surfaces & text',
    blurb: 'The background hierarchy and the text that sits on it.',
    rows: [
      { name: 'color-surface', kind: 'color' },
      { name: 'color-surface-raised', kind: 'color' },
      { name: 'color-surface-sunken', kind: 'color' },
      { name: 'color-text', kind: 'color' },
      { name: 'color-text-muted', kind: 'color' },
      { name: 'color-border', kind: 'color' },
    ],
  },
  {
    title: 'Typography',
    blurb: 'The type families that set the voice.',
    rows: [
      { name: 'font-display', kind: 'font', label: 'Display' },
      { name: 'font-sans', kind: 'font', label: 'Body' },
    ],
  },
  {
    title: 'Shape & depth',
    blurb: 'Structure, not just color — corners, borders, and shadow shape.',
    rows: [
      { name: 'radius-md', kind: 'radius' },
      { name: 'border-width-default', kind: 'border' },
      { name: 'shadow-card', kind: 'shadow' },
    ],
  },
  {
    title: 'Motion',
    blurb: 'How transitions feel.',
    rows: [
      { name: 'duration-default', kind: 'motion' },
      { name: 'ease-default', kind: 'motion' },
    ],
  },
];

function Sample({ theme, name, kind, label }: { theme: Theme; name: string; kind: Kind; label?: string }) {
  const v = (n: string) => tokenValue(theme, n);
  const base = 'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md';

  switch (kind) {
    case 'color':
      return (
        <span
          className={`${base} border border-border`}
          style={{ background: v(name) }}
        />
      );
    case 'font':
      return (
        <span
          className={base}
          style={{ fontFamily: v(name), color: v('color-text'), fontWeight: 700, fontSize: '20px' }}
        >
          {label?.[0] ?? 'A'}a
        </span>
      );
    case 'radius':
      return (
        <span
          className={`${base} bg-surface-sunken`}
          style={{ borderRadius: v(name), borderColor: v('color-border'), borderWidth: v('border-width-default'), borderStyle: 'solid' }}
        />
      );
    case 'border':
      return (
        <span
          className={`${base} bg-surface-sunken`}
          style={{ borderColor: v('color-text'), borderWidth: v(name), borderStyle: 'solid' }}
        />
      );
    case 'shadow':
      return (
        <span className={base}>
          <span className="size-7 rounded-md bg-surface-raised" style={{ boxShadow: v(name) }} />
        </span>
      );
    case 'motion':
      return <span className={`${base} bg-surface-sunken font-mono text-base text-text-subtle`}>~</span>;
  }
}

function Row({ theme, name, kind, label }: { theme: Theme; name: string; kind: Kind; label?: string }) {
  const overridden = name in theme.tokens;
  return (
    <div className="flex items-center gap-4 rounded-lg border-border bg-surface-raised p-3 [border-width:var(--border-width-thin)]">
      <Sample theme={theme} name={name} kind={kind} label={label} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm text-text">{name}</code>
          {overridden ? (
            <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-medium text-primary">
              Override
            </span>
          ) : (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-text-subtle">
              Default
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-text-muted">{tokenValue(theme, name)}</p>
      </div>
    </div>
  );
}

export function ThemeTokens() {
  const { current } = useTheme();
  const overrideCount = Object.keys(current.tokens).length;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-text">
          What {current.name} changes
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-text-muted">
          A theme is a set of token overrides; anything it doesn't set falls back to the schema
          default. {current.name} authors{' '}
          <span className="font-medium text-text">{overrideCount} token{overrideCount === 1 ? '' : 's'}</span>.
          The key ones are below — <span className="text-primary">Override</span> means this theme
          set it, <span className="text-text">Default</span> means it inherited it.
        </p>
      </section>

      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-subtle">{group.title}</h2>
            <p className="mt-1 text-sm text-text-muted">{group.blurb}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.rows.map((row) => (
              <Row key={row.name} theme={current} name={row.name} kind={row.kind} label={row.label} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
