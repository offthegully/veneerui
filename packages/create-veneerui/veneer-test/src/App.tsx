import { ThemeSwitcher } from './components/ThemeSwitcher'

export default function App() {
  return (
    <div className="min-h-screen bg-surface text-text">
      <header className="flex items-center justify-between gap-4 border-border bg-surface-raised px-6 py-4 [border-width:var(--border-width-default)]">
        <h1 className="font-display text-xl font-bold">My Veneer app</h1>
        <ThemeSwitcher />
      </header>
      <main className="mx-auto max-w-3xl p-6">
        <article className="rounded-lg border-border bg-surface-raised p-6 [border-width:var(--border-width-default)] [box-shadow:var(--shadow-card)]">
          <h2 className="text-lg font-bold">Themeable by default</h2>
          <p className="mt-2 text-text-muted">
            Every value here comes from a theme token. Switch the theme above and watch
            color, type, radius, border, and shadow change together — no re-render.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-on-primary hover:bg-primary-hover">Primary</button>
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-on-primary hover:bg-accent-hover">Accent</button>
          </div>
        </article>
      </main>
    </div>
  )
}
