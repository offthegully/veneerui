import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled font set — themes may only *name* these (the url() blacklist means a
// theme can never load its own font). Keep in sync with ALLOWED_FONT_FAMILIES.
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/fraunces'
import '@fontsource/archivo-black'
import '@fontsource-variable/orbitron'
import '@fontsource-variable/quicksand'
import '@fontsource-variable/eb-garamond' // Warm Library — body + chrome…
import '@fontsource-variable/eb-garamond/wght-italic.css' // …and it leans hard on italics
import '@fontsource/ibm-plex-mono/400.css' // Monospaced — plain-text reader (static; no variable build)
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/ibm-plex-mono/400-italic.css'
import './fonts/ms-sans-serif.css' // Windows 95 UI face (self-hosted, see src/fonts/)
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@offthegully/veneerui'
import {
  APP_THEMES,
  APP_DEFAULT_THEME_ID,
  APP_ENABLED_THEME_IDS,
  APP_FIRST_VISIT_THEME_IDS,
} from './themes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      themes={APP_THEMES}
      defaultThemeId={APP_DEFAULT_THEME_ID}
      defaultEnabledIds={APP_ENABLED_THEME_IDS}
      shuffleIds={APP_FIRST_VISIT_THEME_IDS}
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
)
