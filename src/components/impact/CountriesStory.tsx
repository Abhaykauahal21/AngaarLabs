"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import ConnectionPaths from "./ConnectionPaths";
import CountryNodes from "./CountryNodes";
import { COUNTRY_STAT, DESKTOP_VIEWBOX, MOBILE_VIEWBOX } from "./geo";
import { applyTransition, clamp, easeInOut, smooth } from "./impactMath";
import { reportEnter } from "./FlameTransition";
import { useScrubScene } from "./useScrubScene";
import WorldMap from "./WorldMap";

interface Conn {
  group: SVGGElement;
  glow: SVGPathElement;
  line: SVGPathElement;
  dot: SVGCircleElement;
  len: number;
  start: number;
  dur: number;
  active: boolean;
  lastD: number;
}

interface Refs {
  polys: { el: SVGPathElement; start: number; last: number }[];
  nodes: SVGGElement[];
  conns: Conn[];
  graticule: SVGGElement | null;
}

/**
 * Story 2 — "12+ Countries Served".
 * map is drawn → nodes light up → arcs connect them → 12+ takes over.
 */
export default function CountriesStory() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const numBlockRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const tr = useRef({ enter: 1 });
  const refs = useRef<Refs>({ polys: [], nodes: [], conns: [], graticule: null });
  const pRef = useRef(0);

  const apply = useCallback((raw: number) => {
    pRef.current = raw;
    // the timeline starts during the entry slide (offset 0 → 0.1) so the scene is never empty
    const p = clamp((raw / 0.93) * 0.9 + 0.1 * tr.current.enter);
    applyTransition(innerRef.current, tr.current.enter, 0, "x");
    const R = refs.current;

    // map is constructed left → right
    for (const poly of R.polys) {
      const d = easeInOut(clamp((p - poly.start) / 0.13));
      if (Math.abs(d - poly.last) < 0.004) continue;
      poly.last = d;
      poly.el.style.strokeDashoffset = String(1 - d);
      poly.el.style.fill = `rgba(255,200,140,${(d * 0.045).toFixed(3)})`;
    }
    if (R.graticule) R.graticule.setAttribute("opacity", String(smooth(clamp((p - 0.02) / 0.2)) * 0.9));

    const numA = smooth(clamp((p - 0.8) / 0.14));
    const mapDim = 1 - 0.5 * smooth(clamp((p - 0.78) / 0.15));
    if (mapBoxRef.current) {
      const s = 1.07 - 0.07 * easeInOut(clamp((p - 0.02) / 0.4));
      mapBoxRef.current.style.opacity = String(smooth(clamp((p - 0.0) / 0.07)) * mapDim);
      mapBoxRef.current.style.transform = `scale(${s})`;
    }

    // nodes
    const nodeK = 1 + 0.25 * numA;
    R.nodes.forEach((n, i) => {
      const a = smooth(clamp((p - (0.5 + i * 0.03)) / 0.06));
      n.style.opacity = String(a);
      n.style.transform = `scale(${(0.4 + 0.6 * a) * nodeK})`;
    });

    // connections + travelling sparks
    for (const c of R.conns) {
      if (!c.active) continue;
      const d = easeInOut(clamp((p - c.start) / c.dur));
      if (d !== c.lastD) {
        c.lastD = d;
        const off = String(1 - d);
        c.glow.style.strokeDashoffset = off;
        c.line.style.strokeDashoffset = off;
      }
      let u = d;
      if (d >= 1) u = (p * 5 + c.start * 3) % 1; // keeps flowing as you scroll
      if (d > 0.004) {
        const pt = c.line.getPointAtLength(u * c.len);
        c.dot.setAttribute("cx", pt.x.toFixed(1));
        c.dot.setAttribute("cy", pt.y.toFixed(1));
        c.dot.style.opacity = d >= 1 ? "0.95" : String(Math.min(1, d * 6));
      } else {
        c.dot.style.opacity = "0";
      }
    }

    if (eyebrowRef.current) {
      eyebrowRef.current.style.opacity = String(smooth(clamp(p / 0.1)) * (1 - 0.6 * numA));
    }
    if (scrimRef.current) scrimRef.current.style.opacity = String(numA);
    if (numBlockRef.current) {
      numBlockRef.current.style.opacity = String(numA);
      numBlockRef.current.style.transform = `scale(${1.1 - 0.1 * numA})`;
    }
    if (numRef.current) {
      numRef.current.textContent = String(
        Math.round(COUNTRY_STAT.value * smooth(clamp((p - 0.82) / 0.12)))
      );
    }
    if (copyRef.current) {
      const c = smooth(clamp((p - 0.9) / 0.08));
      copyRef.current.style.opacity = String(c);
      copyRef.current.style.transform = `translate3d(0,${(1 - c) * 18}px,0)`;
    }
    if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
  }, []);

  // collect elements + compute responsive timeline
  const build = useCallback(() => {
    const svg = svgRef.current;
    const scene = sceneRef.current;
    if (!svg || !scene) return;
    const W = scene.clientWidth;
    const mobile = W < 768;

    svg.setAttribute("viewBox", mobile ? MOBILE_VIEWBOX : DESKTOP_VIEWBOX);
    svg.style.setProperty("--sw", mobile ? "1.5" : "0.8");
    svg.style.setProperty("--sw-line", mobile ? "2.2" : "1");
    svg.style.setProperty("--sw-glow", mobile ? "7" : "4");

    const R = refs.current;
    R.graticule = svg.querySelector<SVGGElement>("[data-graticule]");
    R.polys = Array.from(svg.querySelectorAll<SVGPathElement>("[data-poly]")).map((el) => ({
      el,
      start: 0.03 + 0.24 * (Number(el.dataset.cx) / 1000),
      last: -1,
    }));
    R.nodes = Array.from(svg.querySelectorAll<SVGGElement>("[data-node-inner]"));

    const groups = Array.from(svg.querySelectorAll<SVGGElement>("[data-conn]"));
    const active = groups.filter((g) => !mobile || g.dataset.mobile === "1");
    R.conns = groups.map((group) => {
      const line = group.querySelector<SVGPathElement>("[data-line]")!;
      const isActive = active.includes(group);
      group.style.display = isActive ? "" : "none";
      const k = active.indexOf(group);
      return {
        group,
        glow: group.querySelector<SVGPathElement>("[data-glow]")!,
        line,
        dot: group.querySelector<SVGCircleElement>("[data-dot]")!,
        len: line.getTotalLength(),
        start: 0.55 + Math.max(0, k) * (0.2 / Math.max(1, active.length - 1)),
        dur: 0.12,
        active: isActive,
        lastD: -1,
      };
    });
    apply(pRef.current);
  }, [apply]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(scene);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [build]);

  const onEnter = useCallback(
    (e: number) => {
      tr.current.enter = e;
      // sweep in from the right: cancel the natural upward travel, slide in sideways instead
      const scene = sceneRef.current;
      if (scene) {
        scene.style.transform =
          e < 0.998 ? `translate3d(${(1 - e) * window.innerWidth}px,${-(1 - e) * window.innerHeight}px,0)` : "";
      }
      reportEnter("countries", scene, e, "left");
      apply(pRef.current);
    },
    [apply]
  );

  useScrubScene(wrapRef, apply, reduced, onEnter);

  return (
    <div ref={wrapRef} className="relative" style={{ height: "460vh", marginTop: "-80vh" }} data-story="countries">
      <div ref={sceneRef} className="sticky top-0 h-svh w-full overflow-hidden bg-[#040302]">
        <ul className="sr-only">
          <li>
            {COUNTRY_STAT.value}
            {COUNTRY_STAT.suffix} {COUNTRY_STAT.title} — {COUNTRY_STAT.note}
          </li>
        </ul>

        <div ref={innerRef} className="absolute inset-0 will-change-transform">
        {/* ambient warmth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 55%, rgba(255,90,0,0.1) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />

        {/* eyebrow */}
        <div
          ref={eyebrowRef}
          className="absolute inset-x-0 top-[15%] flex justify-center opacity-0 md:top-[14%]"
        >
          <p className="flex items-center gap-3 font-code text-[10px] uppercase tracking-[0.4em] text-orange-500">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500" />
            Global Reach
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500" />
          </p>
        </div>

        {/* map + network */}
        <div
          ref={mapBoxRef}
          className="absolute inset-x-0 top-[62%] mx-auto w-full max-w-[1500px] -translate-y-1/2 px-2 opacity-0 will-change-transform md:top-1/2 md:px-8"
          style={{ transformOrigin: "50% 50%" }}
          aria-hidden="true"
        >
          <svg
            ref={svgRef}
            viewBox={DESKTOP_VIEWBOX}
            className="block h-auto w-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <WorldMap />
            <ConnectionPaths />
            <CountryNodes />
          </svg>
        </div>

        {/* legibility scrim behind the number */}
        <div
          ref={scrimRef}
          className="absolute inset-0 opacity-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 38%, rgba(4,3,2,0.82) 0%, rgba(4,3,2,0.5) 28%, transparent 55%)",
          }}
          aria-hidden="true"
        />

        {/* the number */}
        <div
          ref={numBlockRef}
          className="absolute inset-x-0 top-[26%] flex justify-center opacity-0 md:top-[36%] md:-translate-y-1/2"
          aria-hidden="true"
        >
          <div
            className="flex items-baseline font-display font-extrabold leading-none tracking-[-0.05em]"
            style={{
              fontSize: "clamp(6rem, 22vw, 19rem)",
              filter: "drop-shadow(0 0 40px rgba(255,90,0,0.4))",
            }}
          >
            <span className="inline-grid bg-gradient-to-b from-[#fff1c8] via-[#ffb347] to-[#ff5a00] bg-clip-text text-transparent">
              <span className="invisible [grid-area:1/1]">{COUNTRY_STAT.value}</span>
              <span ref={numRef} className="[grid-area:1/1] text-right">
                0
              </span>
            </span>
            <span className="ml-[0.04em] bg-gradient-to-b from-[#ffb347] to-[#ff5a00] bg-clip-text pr-[0.1em] text-[0.62em] text-transparent">
              {COUNTRY_STAT.suffix}
            </span>
          </div>
        </div>

        {/* resolved copy */}
        <div
          ref={copyRef}
          className="absolute inset-x-0 top-[46%] px-6 text-center opacity-0 md:top-auto md:bottom-[13%]"
        >
          <h3 className="font-display text-[clamp(1rem,2vw,1.7rem)] font-semibold uppercase tracking-[0.04em] text-white">
            {COUNTRY_STAT.title}
          </h3>
          <p className="mt-2 font-body text-sm text-white/55 sm:text-base">{COUNTRY_STAT.note}</p>
        </div>

        {/* story progress */}
        <div
          className="absolute inset-x-0 bottom-6 mx-auto flex w-full max-w-6xl items-center gap-4 px-5 sm:px-8 md:px-12"
          aria-hidden="true"
        >
          <span className="font-code text-[10px] uppercase tracking-[0.3em] text-white/35">02 · Countries</span>
          <div className="relative h-px flex-1 bg-white/10">
            <div
              ref={barRef}
              className="absolute inset-0 origin-left bg-gradient-to-r from-orange-700 via-orange-500 to-amber-200"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
