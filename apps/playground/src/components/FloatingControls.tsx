/**
 * FloatingControls — the always-reachable cluster fixed to the bottom-right
 * corner so you can re-skin (and jump back to the top) no matter how far you've
 * scrolled. It pairs a floating ThemeSwitcher with a "back to top" button that
 * only appears once there's somewhere to scroll back to.
 *
 * Token-styled like everything else, so it re-skins with the active theme. Sits
 * at z-40 — below the import/gallery modals (z-50), which should cover it.
 */
import { useEffect, useState } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';

/** Show the back-to-top button only after the user has scrolled a screenful. */
function useScrolledPastViewport(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}

export function FloatingControls() {
  const scrolled = useScrolledPastViewport();

  const scrollToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll back to top"
        className={`flex size-10 items-center justify-center rounded-full border border-border bg-surface-raised text-text shadow-lg transition-all hover:bg-surface-sunken ${
          scrolled ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
          <path d="M10 15V5m0 0l-4 4m4-4l4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ThemeSwitcher variant="floating" />
    </div>
  );
}
