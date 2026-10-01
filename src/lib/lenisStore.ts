import type Lenis from "lenis";

/**
 * Tiny module-level handle so components outside <Hero /> (e.g. the Navbar)
 * can drive the single Lenis instance for anchor navigation / scroll locking.
 */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Smooth-scroll to a "#hash" target (or top). Falls back to native scrolling. */
export function scrollToHash(hash: string): boolean {
  const el = hash === "#" || hash === "#top" ? null : document.querySelector(hash);
  if (hash !== "#" && hash !== "#top" && !el) return false;

  const lenis = instance;
  if (lenis) {
    if (el) lenis.scrollTo(el as HTMLElement, { duration: 1.6 });
    else lenis.scrollTo(0, { duration: 1.6 });
  } else if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return true;
}
