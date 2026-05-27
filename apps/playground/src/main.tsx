import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled font set — themes may only *name* these (the url() blacklist means a
// theme can never load its own font). Keep in sync with ALLOWED_FONT_FAMILIES.
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/fraunces'
import '@fontsource/archivo-black'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@veneer/theme'
import { APP_THEMES, APP_DEFAULT_THEME_ID } from './themes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider themes={APP_THEMES} defaultThemeId={APP_DEFAULT_THEME_ID}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
