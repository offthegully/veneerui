import { useState } from 'react'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { ThemeShowcase } from './components/ThemeShowcase'
import { LandingPreview } from './components/LandingPreview'
import { ProjectOverview } from './components/ProjectOverview'
import { ThemeTokens } from './components/ThemeTokens'
import { PreviewBanner } from './components/PreviewBanner'
import { FloatingControls } from './components/FloatingControls'

export type View = 'overview' | 'landing' | 'components' | 'tokens'

const TABS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'landing', label: 'SaaS demo' },
  { id: 'components', label: 'Components' },
  { id: 'tokens', label: 'What changed' },
]

export default function App() {
  const [view, setView] = useState<View>('overview')

  return (
    <div className="min-h-svh bg-surface font-sans text-text">
      {/* Banner + header pin together as one block so the switcher stays reachable
          while scrolling. One sticky wrapper (rather than two competing
          `sticky top-0` layers) keeps the preview banner above the bar. */}
      <div className="sticky top-0 z-40 bg-surface">
        <PreviewBanner />
        <header className="flex items-center justify-between border-border px-6 py-4 [border-bottom-width:var(--border-width-default)]">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold tracking-tight text-text">Veneer</span>
            <span className="text-sm text-text-muted">theme runtime</span>
          </div>
          <ThemeSwitcher />
        </header>
      </div>

      {/* View switcher — segmented control, token-styled so it re-skins too. */}
      <div className="flex justify-center border-border px-6 py-3 [border-bottom-width:var(--border-width-thin)]">
        <div className="inline-flex gap-1 rounded-lg bg-surface-sunken p-1">
          {TABS.map((tab) => {
            const active = view === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                aria-pressed={active}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-[calc(var(--duration-default)*1ms)] ease-default ${
                  active
                    ? 'bg-surface-raised text-text [box-shadow:var(--shadow-sm)]'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Overview and the SaaS demo are full-bleed; the others sit in a centered
          reading column. */}
      {view === 'overview' ? (
        <main>
          <ProjectOverview onExplore={setView} />
        </main>
      ) : view === 'landing' ? (
        <main>
          <LandingPreview />
        </main>
      ) : (
        <main className="mx-auto max-w-4xl px-6 py-12">
          {view === 'components' ? <ThemeShowcase /> : <ThemeTokens />}
        </main>
      )}

      <FloatingControls />
    </div>
  )
}
