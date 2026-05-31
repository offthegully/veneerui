import { useState } from 'react'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { ThemeShowcase } from './components/ThemeShowcase'
import { ProjectOverview } from './components/ProjectOverview'
import { ThemeTokens } from './components/ThemeTokens'
import { PreviewBanner } from './components/PreviewBanner'
import { FloatingControls } from './components/FloatingControls'

export type View = 'overview' | 'components' | 'tokens'

export default function App() {
  const [view] = useState<View>('overview')

  return (
    <div className="min-h-svh bg-surface font-sans text-text">
      {/* Banner + header pin together as one block so the switcher stays reachable
          while scrolling. One sticky wrapper (rather than two competing
          `sticky top-0` layers) keeps the preview banner above the bar. */}
      <div className="sticky top-0 z-40 bg-surface">
        <PreviewBanner />
        <header className="flex items-center justify-between border-border px-6 py-4 [border-bottom-width:var(--border-width-default)]">
          <div className="flex items-center gap-2">
            <img src="/veneer-mark-32.png" alt="" className="size-7 rounded" aria-hidden="true" draggable={false} />
            <span className="font-display text-lg font-bold tracking-tight text-text">veneer<span className="text-primary">ui</span></span>
          </div>
          <ThemeSwitcher />
        </header>
      </div>

      {view === 'overview' ? (
        <main>
          <ProjectOverview />
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
