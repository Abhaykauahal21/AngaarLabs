"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { clamp } from "./impactMath";

/**
 * "Burn-through" page transition.
 * While a scene slides up over the previous one, its top edge becomes a wall
 * of flame: the scene is clipped with a jagged, live-animated flame line, and
 * a fixed canvas paints tongues of fire, a white-hot seam, a heat bloom and
 * sparks along that edge. Everything is a function of scroll (`enter`), so it
 * reverses perfectly and costs nothing when no transition is active.
 */

type Dir = "up" | "left";
type Entry = { el: HTMLElement | null; enter: number; dir: Dir };
const entries = new Map<string, Entry>();

/**
 * Called by each story with its scene element and entry progress (0 → 1).
 * dir "up": scene rises from below. dir "left": scene sweeps in from the right.
 */
export function reportEnter(id: string, el: HTMLElement | null, enter: number, dir: Dir = "up") {
  entries.set(id, { el, enter, dir });
}

const nz = (x: number, t: number) =>
  Math.sin(x * 0.55 + t * 2.3) * 0.5 + Math.sin(x * 1.37 - t * 3.7) * 0.3 + Math.sin(x * 2.9 + t * 6.1) * 0.2;
const tongue = (x: number, t: number, off: number) =>
  Math.pow(clamp(nz(x + off, t) * 0.5 + 0.55), 1.7);

const MAX_SPARKS = 110;

export default function FlameTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let mobile = false;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      mobile = W < 768;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // spark pool
    const sp = {
      x: new Float32Array(MAX_SPARKS),
      y: new Float32Array(MAX_SPARKS),
      vx: new Float32Array(MAX_SPARKS),
      vy: new Float32Array(MAX_SPARKS),
      life: new Float32Array(MAX_SPARKS),
      max: new Float32Array(MAX_SPARKS),
      size: new Float32Array(MAX_SPARKS),
    };
    let wasActive = false;
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // pick the active transition (the one whose scene is mid-slide)
      let active: Entry | null = null;
      entries.forEach((e) => {
        if (e.el && e.enter > 0.002 && e.enter < 0.998) active = e;
      });

      // settled: remove clip + clear canvas once
      entries.forEach((e) => {
        if (e.el && (e.enter <= 0.002 || e.enter >= 0.998) && e.el.style.clipPath) e.el.style.clipPath = "";
      });
      if (!active) {
        if (wasActive) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          sp.life.fill(0);
          wasActive = false;
        }
        return;
      }
      wasActive = true;

      const { el, enter, dir } = active as Entry;
      const rect = el!.getBoundingClientRect();
      const horizontal = dir === "left";
      // edge position along its travel axis, and the edge's length
      const edgePos = horizontal ? rect.left : rect.top;
      const len = horizontal ? H : W;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (edgePos > (horizontal ? W : H) + 60) return;
      // Draw as if the edge were a horizontal line at y = 0 with flames rising (−y).
      // For a leading-left edge, rotate the drawing space so "up" points left.
      const top = 0;

      // envelope: calm at both ends, roaring in the middle
      const env = Math.pow(Math.sin(Math.PI * enter), 0.7);
      const cols = mobile ? 20 : 34;
      const sc = mobile ? 0.62 : 1;
      const jag = 46 * sc * env;
      const maxFlame = 190 * sc * env + 26;

      // 1) jagged clip on the incoming scene
      const ys: number[] = [];
      let poly = "";
      for (let i = 0; i < cols; i++) {
        const v = tongue(i, t, 0);
        const y = jag * (1 - v);
        ys.push(y);
        poly += `${((i / (cols - 1)) * 100).toFixed(2)}% ${y.toFixed(1)}px,`;
      }
      if (horizontal) {
        let hp = "";
        for (let i = 0; i < cols; i++) hp += `${ys[cols - 1 - i].toFixed(1)}px ${((i / (cols - 1)) * 100).toFixed(2)}%,`;
        el!.style.clipPath = `polygon(${hp}101% 100%,101% 0%)`;
      } else {
        el!.style.clipPath = `polygon(${poly}100% 101%,0% 101%)`;
      }

      // 2) fire on the canvas
      if (horizontal) ctx.setTransform(0, -dpr, dpr, 0, edgePos * dpr, H * dpr);
      else ctx.setTransform(dpr, 0, 0, dpr, 0, edgePos * dpr);
      ctx.globalCompositeOperation = "lighter";

      const cw = len / (cols - 1);
      const base = top + jag * 0.5;
      const grad = ctx.createLinearGradient(0, base + 6, 0, base - maxFlame);
      grad.addColorStop(0, "rgba(255,244,214,0.95)");
      grad.addColorStop(0.18, "rgba(255,170,60,0.85)");
      grad.addColorStop(0.55, "rgba(235,70,0,0.45)");
      grad.addColorStop(1, "rgba(120,10,0,0)");

      // two flame layers (back one slower, taller) for depth
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        ctx.moveTo(0, top + ys[0] + 4);
        for (let i = 0; i < cols; i++) {
          const x = i * cw;
          const v = tongue(i, t * (layer ? 0.7 : 1), layer ? 9 : 0);
          const h = (layer ? 1.25 : 1) * (14 * sc + maxFlame * v) * (layer ? 0.8 : 1);
          const edge = top + ys[i];
          // wide, wind-leaning tongue: broad base, curling tip
          const lean = nz(i * 1.3 + 5, t * 1.4) * cw * 0.9;
          ctx.lineTo(x - cw * 0.95, edge);
          ctx.quadraticCurveTo(x - cw * 0.4, edge - h * 0.5, x + lean, edge - h);
          ctx.quadraticCurveTo(x + cw * 0.45, edge - h * 0.28, x + cw * 0.95, edge);
        }
        ctx.lineTo(len, top + ys[cols - 1] + 4);
        ctx.lineTo(len, top + 40);
        ctx.lineTo(0, top + 40);
        ctx.closePath();
        ctx.globalAlpha = (layer ? 0.5 : 0.9) * (0.35 + 0.65 * env);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // 3) white-hot seam following the jagged edge
      ctx.globalAlpha = 0.5 + 0.5 * env;
      ctx.shadowColor = "rgba(255,120,0,1)";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "rgba(255,236,190,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < cols; i++) {
        const x = i * cw;
        if (i === 0) ctx.moveTo(x, top + ys[i]);
        else ctx.lineTo(x, top + ys[i]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4) heat bloom hugging the edge
      const bloom = ctx.createLinearGradient(0, top - 240 * sc, 0, top + 60);
      bloom.addColorStop(0, "rgba(255,80,0,0)");
      bloom.addColorStop(0.75, `rgba(255,90,0,${0.22 * env})`);
      bloom.addColorStop(1, `rgba(255,60,0,${0.35 * env})`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = bloom;
      ctx.fillRect(0, top - 240 * sc, len, 300 * sc);

      // 5) sparks lift off the edge
      const spawn = Math.round((mobile ? 2 : 4) * env * (dt * 60));
      for (let s = 0; s < spawn; s++) {
        for (let i = 0; i < MAX_SPARKS; i++) {
          if (sp.life[i] <= 0) {
            const x = Math.random() * len;
            const col = clamp((x / len) * (cols - 1), 0, cols - 1);
            sp.x[i] = x;
            sp.y[i] = top + ys[Math.round(col)] - 2;
            sp.vx[i] = (Math.random() - 0.5) * 60;
            sp.vy[i] = -(70 + Math.random() * 190);
            sp.max[i] = 0.7 + Math.random() * 1.1;
            sp.life[i] = sp.max[i];
            sp.size[i] = 0.9 + Math.random() * 2.1;
            break;
          }
        }
      }
      for (let i = 0; i < MAX_SPARKS; i++) {
        if (sp.life[i] <= 0) continue;
        sp.life[i] -= dt;
        sp.x[i] += (sp.vx[i] + Math.sin(t * 6 + i) * 18) * dt;
        sp.y[i] += sp.vy[i] * dt;
        sp.vy[i] *= 0.985;
        const a = clamp(sp.life[i] / sp.max[i]);
        ctx.globalAlpha = a;
        ctx.fillStyle = a > 0.55 ? "#ffd9a0" : "#ff7a1a";
        ctx.fillRect(sp.x[i], sp.y[i], sp.size[i], sp.size[i]);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
      entries.forEach((e) => {
        if (e.el) e.el.style.clipPath = "";
      });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[45] h-full w-full"
      aria-hidden="true"
    />
  );
}
