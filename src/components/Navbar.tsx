"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getLenis, scrollToHash } from "@/lib/lenisStore";

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "Work", href: "#work" },
  { label: "Process", href: "#process" },
  { label: "AI Systems", href: "#ai-systems" },
  { label: "About", href: "#about" },
];

const OVERLAY_ORIGIN = "calc(100% - 44px) 44px";

// ─── Flame logo ──────────────────────────────────────────────────────────────
function FlameMark() {
  return (
    <span className="relative flex h-7 w-7 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-orange-500/25 blur-md transition-colors duration-300 group-hover/logo:bg-orange-500/50 animate-[heatAura_2.6s_ease-in-out_infinite]" />
      <svg
        viewBox="0 0 24 28"
        fill="none"
        className="relative h-5 w-5 origin-bottom drop-shadow-[0_0_6px_rgba(255,120,0,0.8)] animate-[flameFlicker_1.6s_ease-in-out_infinite] transition-[scale] duration-300 group-hover/logo:scale-125"
        aria-hidden="true"
      >
        <path
          d="M12 1.5C10.2 4.2 7.8 7.5 7.2 10.5C6.5 13.2 7.2 15 8.2 16.2C7.2 15.2 6.8 13.8 7.2 12.2C5.5 14.5 4.5 17.5 4.5 20.2C4.5 24.2 7.8 27 12 27C16.2 27 19.5 24.2 19.5 20.2C19.5 15.5 16.5 11.2 14.2 7.5C13.2 5.8 12.5 3.5 12 1.5Z"
          fill="url(#ember-outer)"
        />
        <path
          d="M12 12C11.2 13.5 10 15 10 16.8C10 18.8 10.8 19.8 12 20.8C13.2 19.8 14 18.8 14 16.8C14 15.2 13 13.8 12 12Z"
          fill="url(#ember-inner)"
        />
        <defs>
          <linearGradient id="ember-outer" x1="12" y1="1.5" x2="12" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff2a0" />
            <stop offset="35%" stopColor="#ff8c00" />
            <stop offset="75%" stopColor="#e84000" />
            <stop offset="100%" stopColor="#801000" />
          </linearGradient>
          <radialGradient id="ember-inner" cx="12" cy="16.5" r="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#ffd860" />
            <stop offset="100%" stopColor="#ff6000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </span>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
export default function Navbar() {
  const reducedMotion = useReducedMotion();

  const headerRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const fuseFillRef = useRef<HTMLDivElement>(null);
  const fuseHeadRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ctaRef = useMagnetic<HTMLAnchorElement>(0.3);

  const [scrolled, setScrolled] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  // ── Entrance ──────────────────────────────────────────────────────────
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    if (reducedMotion) {
      gsap.set(header, { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.25 });
      tl.fromTo(
        header,
        { y: -36, opacity: 0, scale: 0.94 },
        { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: "expo.out" }
      ).fromTo(
        ".nav-reveal",
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 },
        0.45
      );
    }, header);

    return () => ctx.revert();
  }, [reducedMotion]);

  // ── Scroll: condense, fuse progress, active section ────────────────────
  useEffect(() => {
    const setFill = fuseFillRef.current ? gsap.quickSetter(fuseFillRef.current, "scaleX") : null;
    const setHead = fuseHeadRef.current ? gsap.quickSetter(fuseHeadRef.current, "left", "%") : null;

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

      setFill?.(p);
      setHead?.(p * 100);
      setScrolled(y > 48);

      let current: number | null = null;
      NAV_LINKS.forEach(({ href }, i) => {
        const el = document.querySelector(href);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) current = i;
      });
      setActiveIdx(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // ── Sliding ember indicator ────────────────────────────────────────────
  const target = hoveredIdx ?? activeIdx;

  const moveIndicator = useCallback(
    (idx: number | null, instant = false) => {
      const ind = indicatorRef.current;
      const list = listRef.current;
      if (!ind || !list) return;

      const link = idx === null ? null : linkRefs.current[idx];
      if (!link) {
        gsap.to(ind, { opacity: 0, scaleX: 0.85, duration: 0.3, ease: "power2.out" });
        return;
      }

      const l = list.getBoundingClientRect();
      const r = link.getBoundingClientRect();
      const wasHidden = Number(gsap.getProperty(ind, "opacity")) < 0.05;
      const props = { x: r.left - l.left, width: r.width, opacity: 1, scaleX: 1 };

      if (instant || wasHidden || reducedMotion) {
        gsap.set(ind, props);
      } else {
        gsap.to(ind, { ...props, duration: 0.55, ease: "expo.out", overwrite: "auto" });
      }
    },
    [reducedMotion]
  );

  useEffect(() => {
    moveIndicator(target);
  }, [target, moveIndicator]);

  useEffect(() => {
    const onResize = () => moveIndicator(target, true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [target, moveIndicator]);

  // ── Mobile overlay ─────────────────────────────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const lenis = getLenis();

    if (open) {
      lenis?.stop();
      document.body.style.overflow = "hidden";
      gsap.set(overlay, { visibility: "visible" });
      const tl = gsap.timeline();
      tl.fromTo(
        overlay,
        { clipPath: `circle(0% at ${OVERLAY_ORIGIN})` },
        { clipPath: `circle(150% at ${OVERLAY_ORIGIN})`, duration: reducedMotion ? 0 : 0.9, ease: "expo.inOut" }
      ).fromTo(
        overlay.querySelectorAll(".menu-item"),
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: reducedMotion ? 0 : 0.7, ease: "power3.out", stagger: 0.07 },
        0.35
      );
      return () => {
        tl.kill();
      };
    }

    lenis?.start();
    document.body.style.overflow = "";
    const tl = gsap.to(overlay, {
      clipPath: `circle(0% at ${OVERLAY_ORIGIN})`,
      duration: reducedMotion ? 0 : 0.6,
      ease: "expo.inOut",
      onComplete: () => {
        gsap.set(overlay, { visibility: "hidden" });
      },
    });
    return () => {
      tl.kill();
    };
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ── Anchor click ───────────────────────────────────────────────────────
  const handleNav = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const wasOpen = open;
    setOpen(false);
    // let the overlay release the scroll lock before Lenis moves
    window.setTimeout(() => scrollToHash(href), wasOpen ? 450 : 0);
  };

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-4 left-0 right-0 z-50 flex justify-center px-3 sm:px-4 opacity-0"
      >
        <nav
          className={`relative flex w-full items-center justify-between gap-6 rounded-full border px-4 sm:px-5 transition-[max-width,padding,background-color,border-color,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] backdrop-blur-xl backdrop-saturate-150 ${
            scrolled
              ? "max-w-3xl py-1.5 bg-[#0a0604]/80 border-orange-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.7),0_0_30px_rgba(255,90,0,0.08)]"
              : "max-w-5xl py-2.5 bg-black/35 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          }`}
        >
          {/* ── Fuse: scroll-progress thread that burns along the bottom edge ── */}
          <div className="pointer-events-none absolute -bottom-px left-8 right-8 h-px bg-white/[0.05]">
            <div
              ref={fuseFillRef}
              className="h-full origin-left bg-gradient-to-r from-orange-700 via-orange-500 to-amber-200"
              style={{ transform: "scaleX(0)" }}
            />
            <div ref={fuseHeadRef} className="absolute top-1/2 left-0 -translate-y-1/2">
              <span className="absolute -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-amber-100 shadow-[0_0_10px_3px_rgba(255,140,0,0.9)]" />
              <span className="absolute -translate-x-1/2 h-1 w-1 rounded-full bg-orange-300 animate-[emberRise_1.4s_ease-out_infinite]" />
              <span className="absolute -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-amber-300 animate-[emberRise_1.9s_ease-out_0.5s_infinite]" />
              <span className="absolute -translate-x-1/2 h-[2px] w-[2px] rounded-full bg-orange-200 animate-[emberRise_1.6s_ease-out_1s_infinite]" />
            </div>
          </div>
          {/* ambient heat under the pill */}
          <div className="pointer-events-none absolute -bottom-3 left-1/4 right-1/4 h-4 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent blur-lg" />

          {/* ── Logo ── */}
          <a
            href="#top"
            onClick={(e) => handleNav(e, "#top")}
            className="nav-reveal group/logo flex shrink-0 items-center gap-2.5"
            aria-label="Angaar Labs — back to top"
          >
            <FlameMark />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 group-hover/logo:text-amber-200">
              Angaar <span className="font-medium text-orange-500">Labs</span>
            </span>
          </a>

          {/* ── Links + sliding ember capsule ── */}
          <ul
            ref={listRef}
            className="relative hidden md:flex items-center gap-0.5"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 bottom-0 rounded-full opacity-0"
            >
              <span className="absolute inset-0 rounded-full border border-orange-500/30 bg-gradient-to-b from-orange-500/20 to-orange-600/5 shadow-[0_0_18px_rgba(255,100,0,0.28)] animate-[emberPulse_2s_ease-in-out_infinite]" />
              <span className="absolute left-3 right-3 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
            </span>

            {NAV_LINKS.map(({ label, href }, idx) => {
              const lit = target === idx;
              return (
                <li key={label} className="nav-reveal">
                  <a
                    ref={(el) => {
                      linkRefs.current[idx] = el;
                    }}
                    href={href}
                    onClick={(e) => handleNav(e, href)}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onFocus={() => setHoveredIdx(idx)}
                    onBlur={() => setHoveredIdx(null)}
                    aria-current={activeIdx === idx ? "true" : undefined}
                    className={`relative z-10 block whitespace-nowrap px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 ${
                      lit ? "text-amber-200" : "text-white/55"
                    }`}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* ── CTA + hamburger ── */}
          <div className="flex items-center gap-2">
            <a
              ref={ctaRef}
              href="#contact"
              onClick={(e) => handleNav(e, "#contact")}
              className="nav-reveal group/btn relative hidden sm:inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-orange-300 shadow-[0_0_15px_rgba(255,100,0,0.2)] transition-[color,box-shadow,border-color] duration-300 hover:border-orange-400 hover:text-black hover:shadow-[0_0_26px_rgba(255,120,0,0.65)]"
            >
              {/* fire fill that rises from the bottom on hover */}
              <span className="absolute inset-0 translate-y-full bg-gradient-to-t from-orange-600 via-orange-500 to-amber-300 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-y-0" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#ff8c00] animate-[emberPulse_1.4s_ease-in-out_infinite] transition-colors group-hover/btn:bg-black" />
              <span className="relative">Start a Project</span>
              <span className="relative font-mono transition-transform duration-300 group-hover/btn:translate-x-1" aria-hidden="true">
                →
              </span>
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="nav-reveal relative z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] md:hidden"
            >
              <span
                className={`absolute h-px w-4 bg-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  open ? "rotate-45 bg-orange-400" : "-translate-y-[3px]"
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  open ? "-rotate-45 bg-orange-400" : "translate-y-[3px]"
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile fire menu ── */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 invisible overflow-hidden bg-[#050302] md:hidden"
        style={{ clipPath: `circle(0% at ${OVERLAY_ORIGIN})` }}
        aria-hidden={!open}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_110%,rgba(255,90,0,0.38),transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(255,120,0,0.12),transparent_55%)]" />

        <nav className="relative flex h-full flex-col justify-center gap-1 px-8">
          {NAV_LINKS.map(({ label, href }, i) => (
            <a
              key={label}
              href={href}
              onClick={(e) => handleNav(e, href)}
              tabIndex={open ? 0 : -1}
              className="menu-item group flex items-baseline gap-4 py-2 opacity-0"
            >
              <span className="font-mono text-[10px] tracking-[0.3em] text-orange-500/70">
                0{i + 1}
              </span>
              <span className="text-[clamp(2.2rem,10vw,3.4rem)] font-black uppercase leading-none tracking-[-0.02em] text-white/85 transition-colors duration-300 group-active:text-orange-400">
                {label}
              </span>
            </a>
          ))}
          <a
            href="#contact"
            onClick={(e) => handleNav(e, "#contact")}
            tabIndex={open ? 0 : -1}
            className="menu-item mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-xs font-bold uppercase tracking-widest text-black opacity-0"
          >
            Start a Project <span aria-hidden="true">→</span>
          </a>
        </nav>
      </div>
    </>
  );
}
