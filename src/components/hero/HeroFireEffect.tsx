"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// ─── Module-level pools (no Math.random in render) ──────────────────────────

const WISP_COUNT = 16;
const SPARK_COUNT = 55;

// Fire wisp configurations — each wisp is an upward-curving energy line
const WISP_CONFIG = Array.from({ length: WISP_COUNT }, (_, i) => ({
  // spread across full width with a slight inward bias
  xPct: 3 + (i / (WISP_COUNT - 1)) * 94,
  // height reaches 30–80% of screen height
  maxHeightPct: 32 + Math.random() * 50,
  // horizontal oscillation amplitude (px)
  amplitude: 18 + Math.random() * 38,
  // oscillation speed (radians/sec)
  freq: 0.4 + Math.random() * 0.7,
  // initial phase so they're not in sync
  phase: Math.random() * Math.PI * 2,
  // particle count along the wisp
  dots: 10 + Math.floor(Math.random() * 10),
  // base opacity (some wisps are dimmer)
  opacity: 0.18 + Math.random() * 0.45,
  // line width (thin to medium)
  width: 0.6 + Math.random() * 1.2,
  // color type: 0 = orange-core, 1 = amber, 2 = red-orange
  colorType: Math.floor(Math.random() * 3) as 0 | 1 | 2,
}));

// Free-floating sparks that drift upward
const SPARK_CONFIG = Array.from({ length: SPARK_COUNT }, () => ({
  xPct: Math.random() * 100,
  yPct: 20 + Math.random() * 75,
  vxPct: (Math.random() - 0.5) * 0.08,
  vyPct: -(0.04 + Math.random() * 0.12),
  life: Math.random(),
  lifeSpeed: 0.003 + Math.random() * 0.008,
  size: 0.8 + Math.random() * 2.2,
  opacity: 0.3 + Math.random() * 0.7,
  flickerPhase: Math.random() * Math.PI * 2,
  flickerFreq: 1.5 + Math.random() * 4,
}));

// Wisp color palettes
const WISP_COLORS: Record<
  0 | 1 | 2,
  { core: string; mid: string; tip: string }
> = {
  0: { core: "255,80,0", mid: "255,140,0", tip: "255,200,80" },
  1: { core: "200,40,0", mid: "240,100,0", tip: "255,180,40" },
  2: { core: "255,100,0", mid: "255,160,20", tip: "255,230,120" },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function HeroFireEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef(SPARK_CONFIG.map((s) => ({ ...s })));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let w = 0;
    let h = 0;

    // ── Resize ────────────────────────────────────────────────────────
    function resize() {
      if (!canvas) return;
      // Work in CSS pixels — no DPR scaling here (atmospheric effect)
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Pause the loop whenever the hero is off-screen or the tab is hidden
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    // ── Draw loop ─────────────────────────────────────────────────────
    function loop(time: number) {
      if (!visible || document.hidden) return;
      if (!canvas || w === 0 || h === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const t = time * 0.001; // seconds

      ctx.clearRect(0, 0, w, h);

      // ── Draw fire wisps ──────────────────────────────────────────
      for (let i = 0; i < WISP_CONFIG.length; i++) {
        const cfg = WISP_CONFIG[i];
        const colors = WISP_COLORS[cfg.colorType];

        const baseX = (cfg.xPct / 100) * w;
        const baseY = h; // starts from bottom
        const topY = h - (cfg.maxHeightPct / 100) * h;

        // Oscillation — each segment offsets horizontally via sine
        const numSegments = cfg.dots;

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // Draw wisp as a series of glowing dots along a curved path
        for (let d = 0; d < numSegments; d++) {
          const segT = d / (numSegments - 1); // 0 = base, 1 = tip
          const y = baseY + (topY - baseY) * segT;

          // Horizontal wave — amplitude decreases toward tip (like real fire)
          const wave =
            cfg.amplitude *
            Math.sin(t * cfg.freq + cfg.phase + segT * 3.5) *
            (1 - segT * 0.6);
          const x = baseX + wave;

          // Opacity falls toward base and tip
          const lifeCurve =
            segT < 0.15
              ? segT / 0.15
              : segT > 0.75
                ? 1 - (segT - 0.75) / 0.25
                : 1;
          const alpha = cfg.opacity * lifeCurve;

          // Flicker
          const flicker =
            0.7 + 0.3 * Math.sin(t * 3.7 * cfg.freq + cfg.phase + d);
          const finalAlpha = alpha * flicker;

          // Dot size — thicker in middle, thin at base and tip
          const dotRadius =
            cfg.width * 1.5 * (0.3 + lifeCurve * 0.7) * (1 - segT * 0.5);

          // Colour shifts from core at bottom to tip color at top
          const r = colors.core;
          const tipC = colors.tip;

          // Glow halo
          ctx.beginPath();
          ctx.arc(x, y, dotRadius * 4, 0, Math.PI * 2);
          const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, dotRadius * 4);
          haloGrad.addColorStop(0, `rgba(${r},${finalAlpha * 0.4})`);
          haloGrad.addColorStop(1, `rgba(${r},0)`);
          ctx.fillStyle = haloGrad;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${segT > 0.6 ? tipC : r},${Math.min(1, finalAlpha * 1.4)})`;
          ctx.fill();
        }

        ctx.restore();
      }

      // ── Draw free sparks ─────────────────────────────────────────
      const sparkArr = sparks.current;
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < sparkArr.length; i++) {
        const s = sparkArr[i];

        // Advance life
        s.life += s.lifeSpeed;
        if (s.life > 1) {
          // Reset spark to a random bottom-ish position
          s.xPct = Math.random() * 100;
          s.yPct = 80 + Math.random() * 18;
          s.vxPct = (Math.random() - 0.5) * 0.08;
          s.vyPct = -(0.04 + Math.random() * 0.12);
          s.life = 0;
          s.opacity = 0.3 + Math.random() * 0.7;
          s.size = 0.8 + Math.random() * 2.2;
          continue;
        }

        // Move
        s.xPct += s.vxPct;
        s.yPct += s.vyPct;

        const sx = (s.xPct / 100) * w;
        const sy = (s.yPct / 100) * h;

        // Fade in/out over life
        const lifeFade =
          s.life < 0.15
            ? s.life / 0.15
            : s.life > 0.7
              ? 1 - (s.life - 0.7) / 0.3
              : 1;

        const flicker =
          0.6 + 0.4 * Math.sin(t * s.flickerFreq + s.flickerPhase);
        const alpha = s.opacity * lifeFade * flicker;

        // Color — hotter (whiter) when young, ember orange when old
        const heat = 1 - s.life;
        const cr = 255;
        const cg = Math.round(80 + heat * 140);
        const cb = Math.round(heat * 60);

        // Glow
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 3, 0, Math.PI * 2);
        const gGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.size * 3);
        gGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha * 0.5})`);
        gGrad.addColorStop(1, `rgba(${cr},${cg},0,0)`);
        ctx.fillStyle = gGrad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha * 1.5)})`;
        ctx.fill();
      }

      ctx.restore();
    }

    // ── GSAP ticker drives the animation ─────────────────────────────
    const tickerId = gsap.ticker.add(loop);

    return () => {
      gsap.ticker.remove(tickerId);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ display: "block" }}
      aria-hidden="true"
    />
  );
}
