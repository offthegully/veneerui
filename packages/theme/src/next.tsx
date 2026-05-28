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
 *
 * Pass `shuffleUntilPinned` (a pool of themes) to instead show a random one on
 * every load until the visitor pins one — see `getAntiFlashScript`, and pair it
 * with `<ThemeProvider shuffleIds={...}>`.
 */
import type { Theme } from './types';
import { getAntiFlashScript, type ShuffleTheme } from './anti-flash';

export function AntiFlashScript({
  defaultTheme,
  shuffleUntilPinned,
}: { defaultTheme?: Theme; shuffleUntilPinned?: ShuffleTheme[] } = {}) {
  const pool = shuffleUntilPinned?.map((t) => ({ id: t.id, tokens: t.tokens }));
  return (
    <script dangerouslySetInnerHTML={{ __html: getAntiFlashScript(defaultTheme?.tokens, pool) }} />
  );
}
