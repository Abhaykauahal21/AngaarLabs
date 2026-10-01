"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { HERO_SCROLL_VH } from "@/lib/heroFrames";
import HeroFrameSequence, {
  type HeroFrameSequenceHandle,
} from "./HeroFrameSequence";
import HeroFireEffect from "./HeroFireEffect";
import FireText, { type FireTextHandle } from "./FireText";
import HeroHud, { type HeroHudHandle } from "./HeroHud";
import HeroServices, { type HeroServicesHandle } from "./HeroServices";
import { setLenis } from "@/lib/lenisStore";

gsap.registerPlugin(ScrollTrigger);

// ─── Scroll indicator ──────────────────────────────────────────────────────
function ScrollIndicator({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const ctx = gsap.context(() => {
      // Hide after 8% scroll
      gsap.to(el, {
        opacity: 0,
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "4% top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, [containerRef]);

  return (
    <div
      ref={ref}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      aria-hidden="true"
    >
      <span className="text-[9px] tracking-[0.32em] text-white/30 uppercase font-mono">
        Scroll
      </span>
      <div className="relative h-10 w-px bg-white/10">
        <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-orange-500/60 to-transparent animate-[scrollLine_1.8s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

// ─── Dark cinematic overlay — keeps flame crisp while integrating with background ──
function DarkOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(4,3,2,0.18) 0%, rgba(4,3,2,0.45) 60%, rgba(4,3,2,0.72) 100%)",
      }}
    />
  );
}

// ─── Subtle film grain — eliminates JPEG 8-bit banding and gives 4K cinema look ─
function FilmGrain() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-25 opacity-[0.038] mix-blend-screen"
      aria-hidden="true"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}

// ─── Vignette + edge fades ────────────────────────────────────────────────────
function Vignette() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      aria-hidden="true"
    >
      {/* Radial edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_38%,rgba(0,0,0,0.82)_100%)]" />
      {/* Top gradient — keeps navbar readable */}
      <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
      {/* Bottom fade — smooth transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#050505] to-transparent" />
      {/* Warm ember bloom in centre — very subtle */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200,70,0,0.08) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}


// ─── HERO ROOT ─────────────────────────────────────────────────────────────
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const frameSeqRef = useRef<HeroFrameSequenceHandle>(null);
  const fireTextRef = useRef<FireTextHandle>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const hudRef = useRef<HeroHudHandle>(null);
  const servicesRef = useRef<HeroServicesHandle>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // ── Lenis smooth scroll ──────────────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 0.55,
      touchMultiplier: 1.1,
      syncTouch: false,
    });
    lenisRef.current = lenis;
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);

    const ticker = gsap.ticker.add((time: number) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      setLenis(null);
      lenis.destroy();
      gsap.ticker.remove(ticker);
    };
  }, []);

  // ── GSAP ScrollTrigger: pin + frame sequence ─────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (reducedMotion) {
      // Show a representative middle frame, no animation
      frameSeqRef.current?.setProgress(0);
      fireTextRef.current?.setProgress(0);
      hudRef.current?.setProgress(0);
      return;
    }

    const ctxCleanup: Array<() => void> = [];
    const ctx = gsap.context(() => {
      // ── Progress object that GSAP scrubs ──
      const state = { progress: 0 };

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        pin: stickyRef.current!,
        pinSpacing: false,
        scrub: 1.4,
        onUpdate(self) {
          // Hero phases run over ~310vh of the pinned range (p tops out ~0.8,
          // just after the offers intro has dissolved into the dark outro).
          const range = HERO_SCROLL_VH - 100;
          const vh = self.progress * range;
          const p = Math.min(1, vh / 380);
          state.progress = p;
          // Drive canvas directly — zero React re-renders
          frameSeqRef.current?.setProgress(p);
          fireTextRef.current?.setProgress(p);
          hudRef.current?.setProgress(p);
          servicesRef.current?.setProgress(p);
          // Once the offers intro is done, cover the leftover frames/fire
          if (outroRef.current) {
            const o = Math.min(1, Math.max(0, (p - 0.7) / 0.08));
            outroRef.current.style.opacity = String(o * o * (3 - 2 * o));
          }
        },
      });

      // ── Cursor-follow ember glow (fine pointers only) ────────────────
      const sticky = stickyRef.current;
      const glow = glowRef.current;
      if (
        sticky &&
        glow &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches
      ) {
        gsap.set(glow, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
        const gx = gsap.quickTo(glow, "x", { duration: 0.9, ease: "power3.out" });
        const gy = gsap.quickTo(glow, "y", { duration: 0.9, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          gx(e.clientX);
          gy(e.clientY);
          gsap.to(glow, { opacity: 1, duration: 0.6, overwrite: "auto" });
        };
        const onLeave = () => gsap.to(glow, { opacity: 0, duration: 0.8 });
        sticky.addEventListener("pointermove", onMove);
        sticky.addEventListener("pointerleave", onLeave);
        ctxCleanup.push(() => {
          sticky.removeEventListener("pointermove", onMove);
          sticky.removeEventListener("pointerleave", onLeave);
        });
      }
    }, section);

    return () => {
      ctxCleanup.forEach((fn) => fn());
      ctx.revert();
    };
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${HERO_SCROLL_VH}vh` }}
      aria-label="Angaar Labs hero"
    >
      {/* Sticky viewport */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden bg-[#050505]"
      >
        {/* z-0 ── Frame canvas — the cinematic animation ── */}
        <HeroFrameSequence
          ref={frameSeqRef}
          reducedMotion={reducedMotion}
        />

        {/* z-10 ── Dark overlay — dims frames, fire lines pop above ── */}
        <DarkOverlay />

        {/* z-20 ── Fire sparkling lines — additive, screen blend ── */}
        {!reducedMotion && (
          <div className="absolute inset-0 z-20">
            <HeroFireEffect />
          </div>
        )}

        {/* z-22 ── "Welcome to Angaar" Real Fire Text with Particle Flames ── */}
        <FireText ref={fireTextRef} reducedMotion={reducedMotion} />

        {/* z-15 ── Cursor-follow ember glow ── */}
        {!reducedMotion && (
          <div
            ref={glowRef}
            className="pointer-events-none absolute left-0 top-0 z-[34] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 mix-blend-screen"
            style={{
              background:
                "radial-gradient(circle, rgba(255,110,20,0.20) 0%, rgba(255,70,0,0.07) 40%, transparent 68%)",
            }}
            aria-hidden="true"
          />
        )}

        {/* z-21 ── Outro: hides leftover frames, leaves a calm ember-lit dark stage ── */}
        {!reducedMotion && (
          <div
            ref={outroRef}
            className="pointer-events-none absolute inset-0 z-[21] bg-[#040302] opacity-0"
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-[radial-gradient(ellipse_at_50%_115%,rgba(255,80,0,0.22),transparent_62%)] animate-[heatAura_5s_ease-in-out_infinite]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_10%,rgba(255,110,0,0.07),transparent_50%)]" />
          </div>
        )}

        {/* z-22 ── "What we provide" kinetic intro (after the zoom-out) ── */}
        {!reducedMotion && <HeroServices ref={servicesRef} />}

        {/* z-25 ── Film grain dither — eliminates banding and compression artifacts ── */}
        <FilmGrain />

        {/* z-30 ── Vignette, edge fades, warm bloom ── */}
        <Vignette />

        {/* z-40 ── Heat gauge HUD ── */}
        <HeroHud ref={hudRef} />

        {/* z-40 ── Scroll indicator ── */}
        <ScrollIndicator containerRef={sectionRef} />
      </div>
    </section>
  );
}
