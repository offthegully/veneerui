/**
 * LandingPreview — a generic SaaS marketing page used as a "real website" the
 * active theme re-skins end to end. It deliberately spans the token surface: nav,
 * hero with gradient headline, logo cloud, feature cards, pricing tiers, a
 * testimonial, an FAQ, a CTA band, and a footer.
 *
 * Like the rest of the playground it expresses every visual value through a
 * semantic token utility (color, surface, type, radius, border-width, shadow,
 * gradient, motion) — no hardcoded colors — so switching the theme repaints the
 * whole page with zero component re-renders. Full-bleed: App renders this without
 * the centered container, so each band manages its own max-width.
 */
import { useTheme } from '@veneer/theme';

const motion = 'transition-colors duration-[calc(var(--duration-default)*1ms)] ease-default';

const FEATURES = [
  {
    title: 'Tokens, not overrides',
    body: 'Every color, font, radius, and shadow flows from one schema. Re-skin the whole product by swapping a theme.',
    path: 'M4 7h16M4 12h16M4 17h10',
  },
  {
    title: 'Instant theming',
    body: 'Switching themes mutates CSS variables on the root — no rebuild, no reload, no component re-render.',
    path: 'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
  },
  {
    title: 'Safe by default',
    body: "Themes can only name bundled fonts and reference tokens, so an imported theme can't smuggle in assets.",
    path: 'M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4z',
  },
  {
    title: 'Authoring friendly',
    body: 'Start from a gallery theme, edit a JSON file, drop it in. Validation runs locally before anything applies.',
    path: 'M4 20h16M6 16l8-8 4 4-8 8H6v-4z',
  },
  {
    title: 'Structure, not just color',
    body: 'Border widths, corner radii, and shadow shapes are real theme axes — a brutalist theme looks brutalist.',
    path: 'M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7zM4 13h7v7H4z',
  },
  {
    title: 'No lock-in',
    body: 'Your library lives in the browser. Export a theme as plain JSON and take it anywhere Veneer runs.',
    path: 'M12 16V4m0 0L7 9m5-5l5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2',
  },
];

const LOGOS = ['Northwind', 'Acme', 'Globex', 'Initech', 'Umbra', 'Soylent'];

const TIERS = [
  {
    name: 'Hobby',
    price: '$0',
    cadence: '/mo',
    blurb: 'For side projects and kicking the tires.',
    features: ['1 project', 'Community themes', 'Local library', 'Email support'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Studio',
    price: '$24',
    cadence: '/mo',
    blurb: 'For teams shipping themeable products.',
    features: ['Unlimited projects', 'Private gallery', 'Token versioning', 'Priority support'],
    cta: 'Start trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    blurb: 'For orgs with brand systems and SSO.',
    features: ['SSO & SCIM', 'Audit logs', 'Design-token API', 'Dedicated support'],
    cta: 'Contact sales',
    featured: false,
  },
];

const FAQS = [
  {
    q: 'Do I need to rebuild to change themes?',
    a: 'No. Themes are applied by setting CSS custom properties on the document root at runtime, so a switch is instant and nothing re-renders.',
  },
  {
    q: 'Where are my themes stored?',
    a: 'In your browser. There is no account and nothing is uploaded — your library is local, and you can export any theme as JSON.',
  },
  {
    q: 'Can a theme break my app?',
    a: 'Themes can only set known tokens to validated values and may only name bundled fonts, so the blast radius is the design surface, not your code.',
  },
];

function CTAButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href="#"
        className={`inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-text-on-primary [box-shadow:var(--shadow-sm)] hover:bg-primary-hover ${motion}`}
      >
        Get started
      </a>
      <a
        href="#"
        className={`inline-flex items-center justify-center rounded-md border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text [border-width:var(--border-width-default)] hover:bg-surface-sunken ${motion}`}
      >
        Live demo
      </a>
    </div>
  );
}

export function LandingPreview() {
  const { current } = useTheme();

  return (
    // Page background is the theme's surface gradient (a subtle surface→sunken
    // wash for most themes, a vivid color field for glass), so the translucent,
    // backdrop-blurred panels below have something to frost. Opaque themes are
    // unaffected — backdrop-blur does nothing behind a solid fill.
    <div className="bg-(image:--gradient-surface) text-text">
      {/* Nav — non-sticky to avoid stacking against the app header/banner. */}
      <nav className="border-border [border-bottom-width:var(--border-width-default)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary text-text-on-primary">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path d="M4 4h7v7H4zM13 13h7v7h-7z" fill="currentColor" />
              </svg>
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Veneer</span>
          </div>
          <div className="hidden items-center gap-7 text-sm text-text-muted sm:flex">
            <a href="#" className={`hover:text-text ${motion}`}>Product</a>
            <a href="#" className={`hover:text-text ${motion}`}>Pricing</a>
            <a href="#" className={`hover:text-text ${motion}`}>Docs</a>
            <a href="#" className={`hover:text-text ${motion}`}>Gallery</a>
          </div>
          <a
            href="#"
            className={`inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-on-primary [box-shadow:var(--shadow-sm)] hover:bg-primary-hover ${motion}`}
          >
            Sign up
          </a>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1 text-xs font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          Now themeable end to end
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-6xl leading-tight font-black tracking-tighter">
          Ship one product,{' '}
          {/* pr/-mr pair: background-clip:text + the headline's negative tracking
              trims the last glyph's trailing space and clips its right edge. The
              padding gives the clip region room; the negative margin cancels the
              width change so the centered line doesn't shift. */}
          <span className="bg-clip-text text-transparent bg-(image:--gradient-text) pr-[0.12em] mr-[-0.12em]">
            infinite skins
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-text-muted">
          Veneer turns your design system into themes anyone can swap. This entire page is rendered
          from the <span className="font-medium text-text">{current.name}</span> theme — change it
          in the top-right and watch every pixel follow.
        </p>
        <div className="mt-8 flex justify-center">
          <CTAButtons />
        </div>
        <p className="mt-4 text-sm text-text-subtle">No credit card · Open-source core · Export anytime</p>
      </header>

      {/* Logo cloud */}
      <section className="border-border [border-top-width:var(--border-width-thin)] [border-bottom-width:var(--border-width-thin)]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-text-subtle">
            Trusted by teams at
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {LOGOS.map((logo) => (
              <span key={logo} className="font-display text-xl font-bold text-text-subtle">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight">Everything theme, nothing hardcoded</h2>
          <p className="mt-3 text-base text-text-muted">
            A small set of semantic tokens drives the whole UI, so a single switch restyles color,
            type, spacing, corners, borders, and motion together.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="flex flex-col gap-3 rounded-xl border-border bg-surface-raised p-6 backdrop-blur-md [box-shadow:var(--shadow-card)] [border-width:var(--border-width-default)]"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
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

      {/* Showcase band — gradient with frosted card */}
      <section className="bg-surface-sunken">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="relative overflow-hidden rounded-2xl p-10 sm:p-16 bg-(image:--gradient-primary) [box-shadow:var(--shadow-xl)]">
            <div className="max-w-xl">
              <h2 className="font-display text-4xl font-black tracking-tight text-text-on-primary">
                See it before you save it
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-on-primary opacity-90">
                Import any theme and preview it live across your real screens. Keep what works, drop
                what doesn't — your visitors never see a half-built skin.
              </p>
              <div className="mt-8">
                <a
                  href="#"
                  className={`inline-flex items-center justify-center rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-text [box-shadow:var(--shadow-md)] hover:bg-surface-raised ${motion}`}
                >
                  Browse the gallery
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight">Simple, themeable pricing</h2>
          <p className="mt-3 text-base text-text-muted">Start free. Upgrade when your team does.</p>
        </div>
        <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col gap-5 rounded-2xl p-7 backdrop-blur-md [border-width:var(--border-width-default)] ${
                tier.featured
                  ? 'border-primary bg-surface-raised [box-shadow:var(--shadow-xl)]'
                  : 'border-border bg-surface-raised [box-shadow:var(--shadow-card)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text">{tier.name}</h3>
                {tier.featured && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-text-on-primary">
                    Popular
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-5xl font-black tracking-tight text-text">{tier.price}</span>
                <span className="text-sm text-text-muted">{tier.cadence}</span>
              </div>
              <p className="text-sm text-text-muted">{tier.blurb}</p>
              <ul className="flex flex-col gap-2.5">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-text">
                    <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-primary" aria-hidden="true">
                      <path d="M5 10l3.5 3.5L15 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`mt-auto inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold [box-shadow:var(--shadow-sm)] ${motion} ${
                  tier.featured
                    ? 'bg-primary text-text-on-primary hover:bg-primary-hover'
                    : 'border-border bg-surface text-text [border-width:var(--border-width-default)] hover:bg-surface-sunken'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-surface-sunken">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <svg viewBox="0 0 24 24" className="mx-auto size-8 text-accent" aria-hidden="true">
            <path d="M7 7h4v4c0 3-2 5-5 5V14c1.5 0 2-1 2-2H7V7zm8 0h4v4c0 3-2 5-5 5V14c1.5 0 2-1 2-2h-1V7z" fill="currentColor" />
          </svg>
          <blockquote className="mt-6 font-display text-3xl leading-snug font-bold tracking-tight text-text">
            "We re-skinned our entire dashboard for a new brand in an afternoon. No PRs touching
            components — just a theme."
          </blockquote>
          <figcaption className="mt-6 text-sm text-text-muted">
            <span className="font-semibold text-text">Dana Okafor</span> · Head of Design, Northwind
          </figcaption>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center font-display text-4xl font-bold tracking-tight">Questions, answered</h2>
        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border-border bg-surface-raised p-5 backdrop-blur-md [border-width:var(--border-width-default)]"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-text marker:content-['']">
                {item.q}
                <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-text-muted transition-transform group-open:rotate-180" aria-hidden="true">
                  <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-col items-center gap-6 rounded-2xl border-border bg-surface-raised px-6 py-14 text-center backdrop-blur-md [box-shadow:var(--shadow-lg)] [border-width:var(--border-width-default)]">
          <h2 className="max-w-2xl font-display text-4xl font-black tracking-tight text-text">
            Try a theme on this exact page
          </h2>
          <p className="max-w-lg text-base text-text-muted">
            Open the switcher in the top-right, or hit Browse gallery, and watch this landing page
            transform around you.
          </p>
          <CTAButtons />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border [border-top-width:var(--border-width-default)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary text-text-on-primary">
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
                <path d="M4 4h7v7H4zM13 13h7v7h-7z" fill="currentColor" />
              </svg>
            </span>
            <span className="font-display font-bold text-text">Veneer</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#" className={`hover:text-text ${motion}`}>Privacy</a>
            <a href="#" className={`hover:text-text ${motion}`}>Terms</a>
            <a href="#" className={`hover:text-text ${motion}`}>Status</a>
            <a href="#" className={`hover:text-text ${motion}`}>Contact</a>
          </div>
          <span className="text-text-subtle">© 2026 Veneer, Inc.</span>
        </div>
      </footer>
    </div>
  );
}
