"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import gsap from "gsap";

export interface FireTextHandle {
  setProgress: (p: number) => void;
}

export interface FireTextProps {
  reducedMotion?: boolean;
}

interface FlameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  seed: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const MAX_FLAMES = 320;
const MAX_SPARKS = 80;

const FireText = forwardRef<FireTextHandle, FireTextProps>(function FireText(
  { reducedMotion = false },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      setProgress(p: number) {
        progressRef.current = p;
      },
    }),
    []
  );

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    // Emitter points sampled from the text
    let emitterPoints: { x: number; y: number }[] = [];
    let textBounds = { x: 0, y: 0, w: 0, h: 0 };

    // Particle pools (preallocated to avoid GC stutter)
    const flames: FlameParticle[] = [];
    for (let i = 0; i < MAX_FLAMES; i++) {
      flames.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 1,
        maxLife: 1,
        size: 0,
        seed: Math.random() * 100,
      });
    }

    const sparks: SparkParticle[] = [];
    for (let i = 0; i < MAX_SPARKS; i++) {
      sparks.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 1,
        maxLife: 1,
        size: 0,
      });
    }

    // ── Offscreen canvas to rasterize text and find edge pixels ──────────
    function buildTextMask() {
      if (w === 0 || h === 0) return;

      const offCanvas = document.createElement("canvas");
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext("2d");
      if (!offCtx) return;

      offCtx.clearRect(0, 0, w, h);

      // Responsive typography — larger & bolder
      const baseSize = Math.max(48, Math.min(w * 0.115, 125));
      const subSize = Math.max(14, Math.round(baseSize * 0.26));

      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";

      // Position shifted lower
      const cy = h * 0.54;

      // Line 1: WELCOME TO
      offCtx.font = `700 ${subSize}px "Geist", -apple-system, sans-serif`;
      offCtx.fillStyle = "#ffffff";
      offCtx.letterSpacing = "0.38em";
      offCtx.fillText("WELCOME TO", w / 2, cy - baseSize * 0.65);

      // Line 2: ANGAAR
      offCtx.font = `900 ${baseSize}px "Geist", -apple-system, sans-serif`;
      offCtx.letterSpacing = "0.08em";
      offCtx.fillText("ANGAAR", w / 2, cy + baseSize * 0.12);

      // Sample pixels
      const imgData = offCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const points: { x: number; y: number }[] = [];

      const step = Math.max(3, Math.round(w / 420)); // dynamic density
      let minX = w;
      let maxX = 0;
      let minY = h;
      let maxY = 0;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          // check if pixel is part of the text
          if (data[idx + 3] > 70) {
            points.push({ x, y });
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      emitterPoints = points;
      textBounds = {
        x: minX,
        y: minY,
        w: Math.max(1, maxX - minX),
        h: Math.max(1, maxY - minY),
      };
    }

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);

      buildTextMask();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // ── Animation Loop ───────────────────────────────────────────────────
    let frameTime = 0;

    function render(time: number) {
      if (!canvas || w === 0 || h === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      frameTime = time * 0.001; // seconds
      const p = progressRef.current;

      // Calculate visibility and zoom curve for "Welcome to Angaar":
      // 0.00 -> 0.08: fade in & ignite (settles 0.95 -> 1.0)
      // 0.08 -> 0.28: roaring fire (steady 1.0x)
      // 0.28 -> 0.48: ZOOMS IN TO 1.85x towards camera while dissolving into blazing embers
      // > 0.48: invisible
      let opacity = 0;
      let fireIntensity = 0;
      let zoomScale = 1.0;

      if (p <= 0.08) {
        const t = Math.max(0, p / 0.08);
        opacity = t;
        fireIntensity = 0.5 + t * 0.5;
        zoomScale = 0.95 + t * 0.05;
      } else if (p <= 0.28) {
        opacity = 1;
        fireIntensity = 1;
        zoomScale = 1.0;
      } else if (p <= 0.48) {
        const exitProgress = (p - 0.28) / 0.20; // 0 -> 1
        // Smooth exponential camera zoom-in effect
        zoomScale = 1.0 + Math.pow(exitProgress, 1.35) * 0.85; // 1.0 -> 1.85x!
        opacity = Math.max(0, 1 - Math.pow(exitProgress, 1.15));
        fireIntensity = 1 + exitProgress * 2.5; // intense fire flare during zoom
      } else {
        opacity = 0;
        fireIntensity = 0;
        zoomScale = 1.85;
      }

      ctx.clearRect(0, 0, w, h);

      if (opacity <= 0.005 || emitterPoints.length === 0) return;

      const numEmitters = emitterPoints.length;
      const cy = h * 0.54;

      // Wrap entire fire text presentation in centered zoom transform
      ctx.save();
      ctx.translate(w / 2, cy);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-w / 2, -cy);

      // ── 1. Spawn Flame Particles from text contours ────────────────────
      const spawnCount = Math.round(18 * fireIntensity);
      for (let s = 0; s < spawnCount; s++) {
        // find a dead flame particle
        for (let i = 0; i < flames.length; i++) {
          const f = flames[i];
          if (f.life >= f.maxLife) {
            const pt = emitterPoints[Math.floor(Math.random() * numEmitters)];
            f.x = pt.x + (Math.random() - 0.5) * 8;
            f.y = pt.y + (Math.random() - 0.5) * 4;
            f.vx = (Math.random() - 0.5) * 0.9;
            f.vy = -(1.4 + Math.random() * 2.5 * fireIntensity);
            f.life = 0;
            f.maxLife = 0.45 + Math.random() * 0.55;
            f.size = 15 + Math.random() * 22;
            break;
          }
        }
      }

      // ── 2. Spawn Flying Sparks ─────────────────────────────────────────
      if (Math.random() < 0.75 * fireIntensity) {
        for (let i = 0; i < sparks.length; i++) {
          const sp = sparks[i];
          if (sp.life >= sp.maxLife) {
            const pt = emitterPoints[Math.floor(Math.random() * numEmitters)];
            sp.x = pt.x + (Math.random() - 0.5) * 10;
            sp.y = pt.y - 2;
            sp.vx = (Math.random() - 0.5) * 2.8;
            sp.vy = -(2.8 + Math.random() * 4.2);
            sp.life = 0;
            sp.maxLife = 0.6 + Math.random() * 0.8;
            sp.size = 1.4 + Math.random() * 2.8;
            break;
          }
        }
      }

      // ── 3. Draw Molten Typography Base ─────────────────────────────────
      ctx.save();
      ctx.globalAlpha = opacity;

      // Larger & lower typography
      const baseSize = Math.max(48, Math.min(w * 0.115, 125));
      const subSize = Math.max(14, Math.round(baseSize * 0.26));

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Outer heat glow behind text
      const glowGrad = ctx.createRadialGradient(
        w / 2,
        cy,
        textBounds.w * 0.1,
        w / 2,
        cy,
        textBounds.w * 0.7
      );
      glowGrad.addColorStop(0, `rgba(255, 80, 0, ${0.38 * fireIntensity})`);
      glowGrad.addColorStop(0.5, `rgba(220, 40, 0, ${0.14 * fireIntensity})`);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // Line 1: WELCOME TO
      ctx.font = `700 ${subSize}px "Geist", -apple-system, sans-serif`;
      ctx.fillStyle = `rgba(255, 205, 130, ${0.9 * opacity})`;
      ctx.shadowColor = "#ff7700";
      ctx.shadowBlur = 18;
      ctx.letterSpacing = "0.38em";
      ctx.fillText("WELCOME TO", w / 2, cy - baseSize * 0.65);

      // Line 2: ANGAAR (Molten fire gradient text)
      ctx.font = `900 ${baseSize}px "Geist", -apple-system, sans-serif`;
      ctx.letterSpacing = "0.08em";
      const textGrad = ctx.createLinearGradient(
        w / 2,
        cy - baseSize * 0.4,
        w / 2,
        cy + baseSize * 0.6
      );

      // Pulsing molten flame inside the letters
      const pulse = 0.5 + 0.5 * Math.sin(frameTime * 4.5);
      textGrad.addColorStop(0, "#ffffff"); // white-hot top
      textGrad.addColorStop(0.25, `rgb(255, ${Math.round(200 + pulse * 40)}, 60)`);
      textGrad.addColorStop(0.65, "#ff6200");
      textGrad.addColorStop(1, "#c01800");

      ctx.shadowColor = "#ff5500";
      ctx.shadowBlur = 28 + pulse * 14;
      ctx.fillStyle = textGrad;
      ctx.fillText("ANGAAR", w / 2, cy + baseSize * 0.12);

      // Studio subtitle below
      ctx.shadowBlur = 0;
      ctx.font = `600 ${Math.max(10, Math.round(subSize * 0.68))}px monospace`;
      ctx.letterSpacing = "0.26em";
      ctx.fillStyle = `rgba(255, 140, 45, ${0.7 * opacity})`;
      ctx.fillText("AI-FIRST ENGINEERING STUDIO", w / 2, cy + baseSize * 0.74);
      ctx.restore();

      // ── 4. Draw Rising Flame Particles (Additive lighter) ──────────────
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < flames.length; i++) {
        const f = flames[i];
        if (f.life >= f.maxLife) continue;

        f.life += 0.016;
        const progress = f.life / f.maxLife;

        // Upward motion with turbulence
        const wave = Math.sin(frameTime * 6 + f.seed + f.y * 0.08) * 1.8;
        f.x += f.vx + wave * 0.25;
        f.y += f.vy;
        f.vy *= 0.985; // drag

        const currentSize = f.size * (1 - progress * 0.65);
        if (currentSize <= 0.5) continue;

        // Color ramp: White-hot -> Golden amber -> Fiery orange -> Ember red
        const pAlpha = (1 - progress) * opacity * 0.55;
        let r = 255;
        let g = 255;
        let b = 120;

        if (progress > 0.2) {
          g = Math.round(255 - ((progress - 0.2) / 0.8) * 180);
          b = Math.round(100 - ((progress - 0.2) / 0.8) * 100);
        }
        if (progress > 0.6) {
          r = Math.round(255 - ((progress - 0.6) / 0.4) * 80);
          g = Math.round(75 - ((progress - 0.6) / 0.4) * 55);
          b = 0;
        }

        // Soft radial flame puff
        const rad = ctx.createRadialGradient(
          f.x,
          f.y,
          0,
          f.x,
          f.y,
          currentSize
        );
        rad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pAlpha})`);
        rad.addColorStop(0.45, `rgba(${r}, ${Math.max(0, g - 40)}, 0, ${pAlpha * 0.6})`);
        rad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 5. Draw Flying Sparks ──────────────────────────────────────────
      for (let i = 0; i < sparks.length; i++) {
        const sp = sparks[i];
        if (sp.life >= sp.maxLife) continue;

        sp.life += 0.016;
        const progress = sp.life / sp.maxLife;

        // Spark drift
        sp.x += sp.vx + Math.sin(frameTime * 8 + i) * 0.6;
        sp.y += sp.vy;
        sp.vy += 0.02; // slight gravity

        const alpha = (1 - progress) * opacity;
        const sparkSize = sp.size * (1 - progress * 0.4);

        ctx.fillStyle = `rgba(255, ${Math.round(210 - progress * 120)}, 40, ${alpha})`;
        ctx.shadowColor = "#ff9900";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sparkSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // restore flames & sparks state
      ctx.restore(); // restore zoom transform matrix
    }

    const ticker = gsap.ticker.add(render);

    return () => {
      gsap.ticker.remove(ticker);
      ro.disconnect();
    };
  }, [reducedMotion]);

  // Reduced motion fallback
  if (reducedMotion) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-25 text-center">
        <p className="font-mono text-xs tracking-[0.35em] text-orange-400 uppercase">
          Welcome to
        </p>
        <h2 className="text-6xl sm:text-8xl font-black uppercase text-orange-500 tracking-wider">
          Angaar
        </h2>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-25"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          filter: "drop-shadow(0 0 16px rgba(255, 70, 0, 0.45))",
        }}
      />
    </div>
  );
});

export default FireText;
