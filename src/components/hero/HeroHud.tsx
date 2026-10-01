"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import gsap from "gsap";

export interface HeroHudHandle {
  setProgress: (p: number) => void;
}

const CHAPTERS = [
  { id: "ignite", label: "Ignite", at: 0 },
  { id: "forge", label: "Forge", at: 0.28 },
  { id: "scale", label: "Scale", at: 0.72 },
];

/**
 * Right-edge "heat gauge" — a vertical fuse that fills with scroll while the
 * active chapter lights up. Driven imperatively (no React re-renders).
 */
const HeroHud = forwardRef<HeroHudHandle>(function HeroHud(_, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const tempRef = useRef<HTMLSpanElement>(null);
  const lastTemp = useRef("");

  useImperativeHandle(
    ref,
    () => ({
      setProgress(p: number) {
        if (fillRef.current) gsap.set(fillRef.current, { scaleY: p });
        if (headRef.current) gsap.set(headRef.current, { top: `${p * 100}%` });

        const temp = `${Math.round(480 + p * 1320)}°C`;
        if (tempRef.current && temp !== lastTemp.current) {
          tempRef.current.textContent = temp;
          lastTemp.current = temp;
        }

        if (rootRef.current) {
          rootRef.current.style.opacity = String(Math.min(1, Math.max(0, 1 - (p - 0.72) / 0.05)));
        }

        let active = 0;
        CHAPTERS.forEach((c, i) => {
          if (p >= c.at) active = i;
        });
        rootRef.current?.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el, i) => {
          el.dataset.active = String(i === active);
        });
      },
    }),
    []
  );

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute right-6 top-1/2 z-40 hidden -translate-y-1/2 select-none items-stretch gap-4 md:flex lg:right-10"
      aria-hidden="true"
    >
      {/* chapter labels */}
      <div className="flex h-56 flex-col justify-between text-right">
        {CHAPTERS.map((c, i) => (
          <div
            key={c.id}
            data-chapter
            data-active={i === 0}
            className="flex items-center justify-end gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/20 transition-colors duration-500 data-[active=true]:text-orange-400"
          >
            <span>{c.label}</span>
            <span className="opacity-60">0{i + 1}</span>
          </div>
        ))}
      </div>

      {/* fuse */}
      <div className="relative h-56 w-px bg-white/10">
        <div
          ref={fillRef}
          className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-amber-200 via-orange-500 to-red-700"
          style={{ transform: "scaleY(0)" }}
        />
        <div ref={headRef} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <span className="block h-2 w-2 rounded-full bg-amber-100 shadow-[0_0_12px_4px_rgba(255,130,0,0.85)]" />
        </div>
        <span className="absolute -bottom-7 right-0 whitespace-nowrap text-right font-mono text-[9px] tracking-[0.25em] text-orange-300/70">
          <span className="mr-2 text-white/25">HEAT</span>
          <span ref={tempRef}>480°C</span>
        </span>
      </div>
    </div>
  );
});

export default HeroHud;
