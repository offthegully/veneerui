/**
 * `@offthegully/veneerui/next` — the Next.js (App Router) anti-flash adapter.
 *
 * Render `<AntiFlashScript />` inside the `<head>` of `app/layout.tsx`. It emits
 * the same synchronous pre-paint script the Vite plugin injects, so a returning
 * user's saved theme is applied before first paint and there's no hydration
 * mismatch (the script writes to the DOM, not to React's tree).
 *
 *   // app/layout.tsx
 *   import { AntiFlashScript } from '@offthegully/veneerui/next'
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html lang="en">
 *         <head><AntiFlashScript /></head>
 *         <body>{children}</body>
 *       </html>
 *     )
 *   }
 *
 * This is a server component on purpose (no hooks, no client state), so the
 * script is in the very first HTML the server streams. The ThemeProvider, which
 * is a client component, wraps `children` separately.
 *
 * Pass `defaultTheme` to also kill the cold-load flash on a first-ever visit —
 * use the same theme you pass to `<ThemeProvider defaultThemeId>`.
 */
import type { Theme } from './types';
import { getAntiFlashScript } from './anti-flash';

export function AntiFlashScript({ defaultTheme }: { defaultTheme?: Theme } = {}) {
  return <script dangerouslySetInnerHTML={{ __html: getAntiFlashScript(defaultTheme?.tokens) }} />;
}
