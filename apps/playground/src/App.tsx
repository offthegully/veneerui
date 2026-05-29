import { useEffect, useState } from 'react'
import { useTheme } from '@offthegully/veneerui'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { ThemeShowcase } from './components/ThemeShowcase'
import { ProjectOverview } from './components/ProjectOverview'
import { ThemeTokens } from './components/ThemeTokens'
import { PreviewBanner } from './components/PreviewBanner'
import { FloatingControls } from './components/FloatingControls'

export type View = 'overview' | 'components' | 'tokens'

// const TABS: { id: View; label: string }[] = [
//   { id: 'overview', label: 'Overview' },
//   { id: 'components', label: 'Components' },
//   { id: 'tokens', label: 'What changed' },
// ]

/** True when the active theme's surface color is perceptually dark. */
function useSurfaceIsDark() {
  const { current } = useTheme()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-surface')
      .trim()
    // Parse r/g/b from any valid CSS color string rendered by the browser.
    const tmp = document.createElement('div')
    tmp.style.color = raw
    document.body.appendChild(tmp)
    const resolved = getComputedStyle(tmp).color
    document.body.removeChild(tmp)
    const m = resolved.match(/[\d.]+/g)
    if (m && m.length >= 3) {
      const [r, g, b] = m.map(Number)
      // Relative luminance (WCAG formula), dark if below 0.18
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      setIsDark(lum < 0.18)
    }
  }, [current])

  return isDark
}

export default function App() {
  const [view] = useState<View>('overview')
  const surfaceIsDark = useSurfaceIsDark()

  return (
    <div className="min-h-svh bg-surface font-sans text-text">
      {/* Banner + header pin together as one block so the switcher stays reachable
          while scrolling. One sticky wrapper (rather than two competing
          `sticky top-0` layers) keeps the preview banner above the bar. */}
      <div className="sticky top-0 z-40 bg-surface">
        <PreviewBanner />
        <header className="flex items-center justify-between border-border px-6 py-4 [border-bottom-width:var(--border-width-default)]">
          <div className="flex items-center">
            {surfaceIsDark ? (
              <img
                src="/veneer-lockup-horizontal-dark.png"
                srcSet="/veneer-lockup-horizontal-dark-2x.png 2x"
                alt="Veneer"
                className="h-7"
                draggable={false}
              />
            ) : (
              <img
                src="/veneer-lockup-horizontal-light.png"
                srcSet="/veneer-lockup-horizontal-light-2x.png 2x"
                alt="Veneer"
                className="h-7"
                draggable={false}
              />
            )}
          </div>
          <ThemeSwitcher />
        </header>
      </div>

      {/* View switcher — segmented control, token-styled so it re-skins too. */}
      {/*<div className="flex justify-center border-border px-6 py-3 [border-bottom-width:var(--border-width-thin)]">
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
      </div>*/}

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
