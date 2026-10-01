export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Deterministic PRNG so layouts are stable across resizes and SSR/CSR. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedFamily = "";
/** Resolve the Unbounded family string next/font injected, for canvas use. */
export function displayFontFamily(): string {
  if (cachedFamily) return cachedFamily;
  if (typeof document === "undefined") return "sans-serif";
  const read = (el: Element) => getComputedStyle(el).getPropertyValue("--font-unbounded").trim();
  const v = read(document.body) || read(document.documentElement);
  if (v) cachedFamily = v;
  return v || "sans-serif";
}

/**
 * Page-transition state for a story scene: `enter` (0→1) while it slides over
 * the previous scene, `exit` (0→1) while the next one slides over it.
 */
export function applyTransition(
  inner: HTMLElement | null,
  enter: number,
  exit: number,
  axis: "y" | "x" = "y"
) {
  if (inner) {
    // content rides a little ahead of the curtain edge (parallax) so the scene is never empty
    const rise = -(1 - enter) * 24; // vh
    const scale = 1 + 0.05 * smooth(exit) - 0.03 * (1 - smooth(enter));
    inner.style.opacity = String(1 - 0.65 * smooth(exit));
    inner.style.transform =
      axis === "y"
        ? `translate3d(0,${rise}vh,0) scale(${scale})`
        : `translate3d(${rise}vw,0,0) scale(${scale})`;
  }
}
