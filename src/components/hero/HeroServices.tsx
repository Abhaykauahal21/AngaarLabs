"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import gsap from "gsap";

export interface HeroServicesHandle {
  setProgress: (p: number) => void;
}

// Scroll window (in hero progress) where this intro plays — right after
// "Welcome to Angaar" zooms out (ends 0.48) and before the main headline (0.78+).
const START = 0.45;
const END = 0.76;

const OFFERS = [
  "Websites",
  "Web Apps",
  "AI Systems",
  "Automation",
  "Mobile Apps",
  "Cloud Platforms",
];

const DESCS = [
  "Fast, SEO-ready websites that turn visitors into customers.",
  "Custom dashboards, portals and SaaS products built to scale.",
  "LLM agents, copilots and ML features wired into your business.",
  "Workflows that run themselves — fewer clicks, fewer errors.",
  "Polished iOS and Android apps with one shared codebase.",
  "Secure, observable infrastructure that grows with your traffic.",
];

const LINE_EM = 1.1;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * "What we provide" kinetic intro. Two oversized marquee rows slide in
 * opposite directions with scroll while a word roller cycles through the
 * services Angaar offers. Fully scroll-driven, no React re-renders.
 */
const HeroServices = forwardRef<HeroServicesHandle>(function HeroServices(_, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowARef = useRef<HTMLDivElement>(null);
  const rowBRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rollerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const lastIdx = useRef(-1);

  useImperativeHandle(
    ref,
    () => ({
      setProgress(p: number) {
        const root = rootRef.current;
        if (!root) return;

        const t = clamp((p - START) / (END - START));
        const vis = smooth(clamp(t / 0.14)) * smooth(clamp((1 - t) / 0.14));

        if (vis <= 0.001) {
          root.style.visibility = "hidden";
          return;
        }
        root.style.visibility = "visible";
        root.style.opacity = String(vis);

        // opposite-direction sweeps
        if (rowARef.current) gsap.set(rowARef.current, { xPercent: 4 - t * 38 });
        if (rowBRef.current) gsap.set(rowBRef.current, { xPercent: -34 + t * 38 });

        // centre stage drifts up + sharpens as it enters, lifts away as it leaves
        if (stageRef.current) {
          gsap.set(stageRef.current, {
            y: (1 - smooth(clamp(t / 0.2))) * 40 - smooth(clamp((t - 0.88) / 0.12)) * 30,
            filter: `blur(${(1 - vis) * 8}px)`,
          });
        }

        if (barRef.current) gsap.set(barRef.current, { scaleX: t });

        // word roller
        const idx = Math.min(OFFERS.length - 1, Math.floor(clamp((t - 0.08) / 0.84) * OFFERS.length));
        if (idx !== lastIdx.current) {
          lastIdx.current = idx;
          if (rollerRef.current) {
            gsap.to(rollerRef.current, {
              y: `${-idx * LINE_EM}em`,
              duration: 0.65,
              ease: "expo.out",
              overwrite: "auto",
            });
          }
          if (descRef.current) {
            descRef.current.textContent = DESCS[idx];
            gsap.fromTo(
              descRef.current,
              { y: 14, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", overwrite: "auto" }
            );
          }
          if (countRef.current) countRef.current.textContent = `0${idx + 1}`;
          dotsRef.current?.querySelectorAll<HTMLElement>("[data-dot]").forEach((d, i) => {
            d.dataset.active = String(i === idx);
          });
        }
      },
    }),
    []
  );

  const rowA = "WEB SOLUTIONS ✦ FOR BUSINESSES ✦ ";
  const rowB = "AI ✦ AUTOMATION ✦ APPS ✦ CLOUD ✦ ";

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-[22] flex flex-col items-center justify-center overflow-hidden"
      style={{ visibility: "hidden", opacity: 0 }}
      aria-hidden="true"
    >
      {/* Dark backdrop — mutes the flame animation so the offer copy pops */}
      <div className="absolute inset-0 bg-[#030201]/85 backdrop-blur-[3px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(255,80,0,0.14),transparent_55%)]" />

      {/* Corner brackets */}
      {["left-6 top-24 border-l border-t", "right-6 top-24 border-r border-t", "left-6 bottom-16 border-l border-b", "right-6 bottom-16 border-r border-b"].map((c) => (
        <span key={c} className={`absolute h-5 w-5 border-orange-500/40 ${c}`} />
      ))}

      {/* Row A — outlined, sweeps left */}
      <div
        ref={rowARef}
        className="absolute left-0 top-[16%] flex w-max whitespace-nowrap font-black uppercase leading-none tracking-[-0.03em] text-transparent"
        style={{
          fontSize: "clamp(4rem, 13vw, 12rem)",
          WebkitTextStroke: "1px rgba(255,120,30,0.5)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span key={i}>{rowA}</span>
        ))}
      </div>

      {/* Row B — soft fill, sweeps right */}
      <div
        ref={rowBRef}
        className="absolute left-0 bottom-[14%] flex w-max whitespace-nowrap font-black uppercase leading-none tracking-[-0.03em] text-white/[0.09]"
        style={{ fontSize: "clamp(4rem, 13vw, 12rem)" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i}>{rowB}</span>
        ))}
      </div>

      {/* Centre stage */}
      <div ref={stageRef} className="relative flex flex-col items-center gap-5 px-6 text-center">
        <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-orange-500/80">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500" />
          What we provide
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500" />
        </p>

        <h2
          className="font-black uppercase leading-[1.02] tracking-[-0.03em] text-white"
          style={{ fontSize: "clamp(2rem, 5.6vw, 5.2rem)" }}
        >
          <span className="block">We build</span>
          <span
            className="relative mx-auto block overflow-hidden"
            style={{ height: `${LINE_EM}em`, lineHeight: `${LINE_EM}em` }}
          >
            <div ref={rollerRef} className="will-change-transform">
              {OFFERS.map((w) => (
                <span
                  key={w}
                  className="block bg-gradient-to-b from-amber-200 via-orange-500 to-red-600 bg-clip-text italic text-transparent"
                  style={{
                    height: `${LINE_EM}em`,
                    filter: "drop-shadow(0 0 22px rgba(255,90,0,0.45))",
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </span>
          <span className="block">for businesses</span>
        </h2>

        <p
          ref={descRef}
          className="min-h-[3em] max-w-md text-sm font-light leading-relaxed tracking-wide text-white/65 sm:text-base"
        >
          {DESCS[0]}
        </p>

        <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] text-white/40">
          <span className="text-orange-400">
            <span ref={countRef}>01</span>
          </span>
          <div className="relative h-px w-40 bg-white/10 sm:w-56">
            <div
              ref={barRef}
              className="absolute inset-0 origin-left bg-gradient-to-r from-orange-700 via-orange-500 to-amber-200 shadow-[0_0_10px_rgba(255,120,0,0.7)]"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <span>0{OFFERS.length}</span>
        </div>

        <div ref={dotsRef} className="mt-1 flex items-center gap-2">
          {OFFERS.map((w, i) => (
            <span
              key={w}
              data-dot
              data-active={i === 0}
              className="h-1 w-1 rounded-full bg-white/20 transition-all duration-500 data-[active=true]:w-6 data-[active=true]:bg-orange-500 data-[active=true]:shadow-[0_0_10px_rgba(255,120,0,0.9)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default HeroServices;
