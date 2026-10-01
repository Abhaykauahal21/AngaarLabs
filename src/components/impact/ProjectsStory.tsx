"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { applyTransition, clamp, displayFontFamily, easeInOut, lerp, mulberry32, smooth } from "./impactMath";
import { DOTS, FRAGMENTS, PROJECT_STAT } from "./projectData";
import ProjectFragments from "./ProjectFragments";
import { reportEnter } from "./FlameTransition";
import { useScrubScene } from "./useScrubScene";

const MAX_CARDS = FRAGMENTS.desktop;
const PALETTE = ["255,90,10", "255,138,40", "255,184,96", "255,226,170"];

interface Layout {
  W: number;
  H: number;
  dpr: number;
  nCards: number;
  nDots: number;
  fs: number;
  ncx: number;
  ncy: number;
  cw: number;
  ch: number;
  endScale: number;
  card: Float32Array; // stride CS: sx sy cx cy tx ty depth appearT delay rot0 sc0 phase
  dot: Float32Array; // stride DS: sx sy cx cy tx ty appearT delay size colour
}

const CS = 12;
const DS = 10;

/**
 * Story 1 — "78+ Projects Shipped".
 * scatter → collect → organise → form the number, all scrubbed by scroll.
 * Everything is a pure function of progress, so reverse scrolling is exact.
 */
export default function ProjectsStory() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const tr = useRef({ enter: 1, exit: 0 });
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const layout = useRef<Layout | null>(null);
  const pRef = useRef(0);

  const register = useCallback((i: number, el: HTMLDivElement | null) => {
    cardEls.current[i] = el;
  }, []);

  // timeline finishes at 85% of the wrapper; the last 15% is the exit (next scene slides over)
  const apply = useCallback((raw: number) => {
    pRef.current = raw;
    const p = clamp(raw / 0.85);
    tr.current.exit = clamp((raw - 0.85) / 0.15);
    applyTransition(innerRef.current, tr.current.enter, tr.current.exit);
    const L = layout.current;
    const canvas = canvasRef.current;
    if (!L || !canvas) return;

    const numA = smooth(clamp((p - 0.76) / 0.12));
    const glowK = smooth(clamp((p - 0.86) / 0.1));

    const hOut = smooth(clamp((p - 0.14) / 0.12));
    if (headRef.current) {
      headRef.current.style.opacity = String(1 - hOut);
      headRef.current.style.transform = `translate3d(0,${-hOut * 60}px,0)`;
    }
    if (copyRef.current) {
      const c = smooth(clamp((p - 0.87) / 0.09));
      copyRef.current.style.opacity = String(c);
      copyRef.current.style.transform = `translate3d(0,${(1 - c) * 22}px,0)`;
    }
    if (glowRef.current) glowRef.current.style.opacity = String(0.25 + 0.75 * numA * (0.6 + 0.4 * glowK));
    if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

    const c = L.card;
    for (let i = 0; i < MAX_CARDS; i++) {
      const el = cardEls.current[i];
      if (!el) continue;
      if (i >= L.nCards) {
        el.style.opacity = "0";
        continue;
      }
      const o = i * CS;
      const depth = c[o + 6];
      const a = smooth(clamp((p - c[o + 7]) / 0.07));
      const c1 = easeInOut(clamp((p - 0.3 - c[o + 8]) / 0.24));
      const c2 = easeInOut(clamp((p - 0.54 - c[o + 8]) / 0.26));
      const x0 = c[o] + Math.sin(p * 7 + c[o + 11]) * 10 * depth * (1 - c1);
      const y0 = c[o + 1] - (1 - c1) * p * 70 * depth;
      const x = lerp(lerp(x0, c[o + 2], c1), c[o + 4], c2);
      const y = lerp(lerp(y0, c[o + 3], c1), c[o + 5], c2);
      const sc = lerp(c[o + 10], L.endScale, c2);
      const rot = lerp(c[o + 9], 0, c2);
      el.style.opacity = String(a * (1 - 0.12 * numA) * Math.min(1, 0.4 + 0.6 * depth + 0.3 * c2));
      el.style.transform = `translate3d(${x - L.cw / 2}px,${y - L.ch / 2}px,0) rotate(${rot}deg) scale(${sc})`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.clearRect(0, 0, L.W, L.H);

    const d = L.dot;
    ctx.globalCompositeOperation = "lighter";
    for (let j = 0; j < L.nDots; j++) {
      const o = j * DS;
      const a = smooth(clamp((p - d[o + 6]) / 0.08));
      if (a <= 0.01) continue;
      const c1 = easeInOut(clamp((p - 0.32 - d[o + 7]) / 0.24));
      const c2 = easeInOut(clamp((p - 0.5 - d[o + 7]) / 0.3));
      const x = lerp(lerp(d[o], d[o + 2], c1), d[o + 4], c2);
      const y = lerp(lerp(d[o + 1], d[o + 3], c1), d[o + 5], c2) - (1 - c1) * p * 40;
      const tw = 0.7 + 0.3 * Math.sin(p * 40 + j);
      ctx.globalAlpha = a * tw * (0.5 - 0.22 * numA + 0.2 * c2);
      ctx.fillStyle = `rgb(${PALETTE[d[o + 9] | 0]})`;
      const s = d[o + 8];
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = "source-over";

    if (numA > 0.003) {
      ctx.globalAlpha = numA;
      const g = ctx.createLinearGradient(0, L.ncy - L.fs * 0.4, 0, L.ncy + L.fs * 0.4);
      g.addColorStop(0, "#fff1c8");
      g.addColorStop(0.45, "#ffb347");
      g.addColorStop(1, "#ff5a00");
      ctx.font = `800 ${L.fs}px ${displayFontFamily()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = `rgba(255,90,0,${0.3 + 0.35 * glowK})`;
      ctx.shadowBlur = L.fs * (0.08 + 0.1 * glowK);
      ctx.fillStyle = g;
      // semi-transparent body so the project fragments still read through it
      ctx.globalAlpha = numA * (0.5 + 0.12 * glowK);
      ctx.fillText(PROJECT_STAT.text, L.ncx, L.ncy + L.fs * 0.04);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = numA * 0.9;
      ctx.lineWidth = Math.max(1.5, L.fs / 120);
      ctx.strokeStyle = "rgba(255,196,120,0.95)";
      ctx.strokeText(PROJECT_STAT.text, L.ncx, L.ncy + L.fs * 0.04);
      ctx.globalAlpha = 1;
    }
  }, []);

  const build = useCallback(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!scene || !canvas) return;
    const W = scene.clientWidth;
    const H = scene.clientHeight;
    if (!W || !H) return;
    const mobile = W < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const family = displayFontFamily();
    const text = PROJECT_STAT.text;
    const ncx = W / 2;
    const ncy = H * (mobile ? 0.4 : 0.44);

    const probe = document.createElement("canvas").getContext("2d")!;
    probe.font = `800 200px ${family}`;
    const m = probe.measureText(text).width || 1;
    const fs = Math.min((W * (mobile ? 0.84 : 0.7) * 200) / m, (H * (mobile ? 0.3 : 0.42)) / 0.72, 380);
    probe.font = `800 ${fs}px ${family}`;
    const gw = Math.ceil(probe.measureText(text).width) + 40;
    const gh = Math.ceil(fs * 1.2);

    // rasterise the number once and sample its shape
    const off = document.createElement("canvas");
    off.width = gw;
    off.height = gh;
    const oc = off.getContext("2d", { willReadFrequently: true })!;
    oc.font = `800 ${fs}px ${family}`;
    oc.textAlign = "center";
    oc.textBaseline = "middle";
    oc.fillStyle = "#fff";
    oc.fillText(text, gw / 2, gh / 2 + fs * 0.04);
    const img = oc.getImageData(0, 0, gw, gh).data;
    const step = Math.max(3, Math.round(fs / (mobile ? 34 : 52)));
    const ox = ncx - gw / 2;
    const oy = ncy - gh / 2;
    const pts: number[] = [];
    let maxY = 0;
    for (let y = 0; y < gh; y += step) {
      for (let x = 0; x < gw; x += step) {
        if (img[(y * gw + x) * 4 + 3] > 120) {
          pts.push(ox + x, oy + y);
          if (y > maxY) maxY = y;
        }
      }
    }
    const nPts = pts.length / 2 || 1;

    const rnd = mulberry32(78);
    const nCards = mobile ? FRAGMENTS.mobile : FRAGMENTS.desktop;
    const nDots = mobile ? DOTS.mobile : DOTS.desktop;
    const cw = mobile ? 64 : 100;
    const ch = mobile ? 40 : 62;

    // greedy, well-spaced target points for the cards
    const order = Array.from({ length: nPts }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const picked: number[] = [];
    let minD = Math.sqrt((nPts * step * step) / (nCards * 1.5));
    for (let tries = 0; tries < 8 && picked.length < nCards; tries++) {
      picked.length = 0;
      for (const idx of order) {
        const px = pts[idx * 2];
        const py = pts[idx * 2 + 1];
        let ok = true;
        for (const q of picked) {
          if (Math.hypot(px - pts[q * 2], py - pts[q * 2 + 1]) < minD) {
            ok = false;
            break;
          }
        }
        if (ok) {
          picked.push(idx);
          if (picked.length >= nCards) break;
        }
      }
      minD *= 0.82;
    }
    picked.sort((a, b) => pts[a * 2] - pts[b * 2]);

    const card = new Float32Array(MAX_CARDS * CS);
    for (let i = 0; i < nCards; i++) {
      const o = i * CS;
      let sx = 0;
      let sy = 0;
      for (let t = 0; t < 12; t++) {
        sx = W * (0.05 + rnd() * 0.9);
        sy = H * (0.14 + rnd() * 0.78);
        if (!(Math.abs(sx - W / 2) < W * 0.32 && Math.abs(sy - H * 0.5) < H * 0.16)) break;
      }
      const depth = 0.35 + rnd() * 0.65;
      const tIdx = picked[Math.min(i, picked.length - 1)];
      card[o] = sx;
      card[o + 1] = sy;
      card[o + 2] = ncx + (sx - ncx) * 0.36 + (rnd() - 0.5) * 30;
      card[o + 3] = ncy + (sy - ncy) * 0.36 + (rnd() - 0.5) * 30;
      card[o + 4] = pts[tIdx * 2];
      card[o + 5] = pts[tIdx * 2 + 1];
      card[o + 6] = depth;
      card[o + 7] = 0.06 + rnd() * 0.2;
      card[o + 8] = rnd() * 0.07;
      card[o + 9] = (rnd() - 0.5) * 28;
      card[o + 10] = (mobile ? 0.7 : 0.62) + depth * 0.5;
      card[o + 11] = rnd() * 6.28;
    }

    const dot = new Float32Array(nDots * DS);
    for (let j = 0; j < nDots; j++) {
      const o = j * DS;
      const sx = W * rnd();
      const sy = H * (0.1 + rnd() * 0.85);
      const t = Math.floor(rnd() * nPts);
      dot[o] = sx;
      dot[o + 1] = sy;
      dot[o + 2] = ncx + (sx - ncx) * 0.45 + (rnd() - 0.5) * 60;
      dot[o + 3] = ncy + (sy - ncy) * 0.45 + (rnd() - 0.5) * 60;
      dot[o + 4] = pts[t * 2] + (rnd() - 0.5) * step;
      dot[o + 5] = pts[t * 2 + 1] + (rnd() - 0.5) * step;
      dot[o + 6] = 0.08 + rnd() * 0.3;
      dot[o + 7] = rnd() * 0.08;
      dot[o + 8] = 1.3 + rnd() * 1.4;
      const r = rnd();
      dot[o + 9] = r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.93 ? 2 : 3;
    }

    layout.current = { W, H, dpr, nCards, nDots, fs, ncx, ncy, cw, ch, endScale: mobile ? 0.36 : 0.5, card, dot };
    if (copyRef.current) copyRef.current.style.top = `${oy + maxY + (mobile ? 18 : 30)}px`;
    if (glowRef.current) {
      glowRef.current.style.left = `${ncx}px`;
      glowRef.current.style.top = `${ncy}px`;
    }
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
    let cancelled = false;
    document.fonts.load(`800 64px ${displayFontFamily()}`, "78+12").finally(() => {
      if (!cancelled) schedule();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [build]);

  const onEnter = useCallback((e: number) => {
    tr.current.enter = e;
    reportEnter("projects", sceneRef.current, e);
    applyTransition(innerRef.current, e, tr.current.exit);
  }, []);

  useScrubScene(wrapRef, apply, reduced, onEnter);

  return (
    <div ref={wrapRef} className="relative" style={{ height: "640vh" }} data-story="projects">
      <div ref={sceneRef} className="sticky top-0 h-svh w-full overflow-hidden bg-[#040302]">
        <ul className="sr-only">
          <li>
            {PROJECT_STAT.text} {PROJECT_STAT.title} — {PROJECT_STAT.note}
          </li>
        </ul>

        <div ref={innerRef} className="absolute inset-0 will-change-transform">
        {/* warm bloom behind the number */}
        <div
          ref={glowRef}
          className="absolute h-[70vh] w-[70vh] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,90,0,0.22) 0%, rgba(255,60,0,0.07) 45%, transparent 70%)",
            opacity: 0.25,
          }}
          aria-hidden="true"
        />

        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

        <ProjectFragments count={MAX_CARDS} register={register} />

        {/* intro headline */}
        <div
          ref={headRef}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <p className="flex items-center gap-3 font-code text-[10px] uppercase tracking-[0.4em] text-orange-500">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500" />
            Our Impact
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500" />
          </p>
          <h2 className="mt-5 font-display text-[clamp(2rem,6.2vw,5.6rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-white">
            Numbers that prove
            <br />
            <span className="bg-gradient-to-r from-amber-200 via-orange-500 to-red-600 bg-clip-text text-transparent">
              execution.
            </span>
          </h2>
        </div>

        {/* resolved copy */}
        <div
          ref={copyRef}
          className="absolute inset-x-0 px-6 text-center opacity-0"
          style={{ top: "70%" }}
        >
          <h3 className="font-display text-[clamp(1rem,2vw,1.7rem)] font-semibold uppercase tracking-[0.04em] text-white">
            {PROJECT_STAT.title}
          </h3>
          <p className="mt-2 font-body text-sm text-white/50 sm:text-base">{PROJECT_STAT.note}</p>
        </div>

        {/* story progress */}
        <div
          className="absolute inset-x-0 bottom-6 mx-auto flex w-full max-w-6xl items-center gap-4 px-5 sm:px-8 md:px-12"
          aria-hidden="true"
        >
          <span className="font-code text-[10px] uppercase tracking-[0.3em] text-white/35">01 · Projects</span>
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
