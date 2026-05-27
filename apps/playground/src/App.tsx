import { ThemeSwitcher } from './components/ThemeSwitcher'
import { ThemeShowcase } from './components/ThemeShowcase'
import { PreviewBanner } from './components/PreviewBanner'

export default function App() {
  return (
    <div className="min-h-svh bg-surface font-sans text-text">
      <PreviewBanner />
      <header className="flex items-center justify-between border-border px-6 py-4 [border-bottom-width:var(--border-width-default)]">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-text">Veneer</span>
          <span className="text-sm text-text-muted">theme runtime</span>
        </div>
        <ThemeSwitcher />
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <ThemeShowcase />
      </main>
    </div>
  )
}
