/**
 * `@veneer/theme/next` — the Next.js (App Router) anti-flash adapter.
 *
 * Render `<AntiFlashScript />` inside the `<head>` of `app/layout.tsx`. It emits
 * the same synchronous pre-paint script the Vite plugin injects, so a returning
 * user's saved theme is applied before first paint and there's no hydration
 * mismatch (the script writes to the DOM, not to React's tree).
 *
 *   // app/layout.tsx
 *   import { AntiFlashScript } from '@veneer/theme/next'
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
 */
import { getAntiFlashScript } from './anti-flash';

export function AntiFlashScript() {
  return <script dangerouslySetInnerHTML={{ __html: getAntiFlashScript() }} />;
}
