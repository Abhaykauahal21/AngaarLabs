"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { HERO_FRAME_COUNT } from "@/lib/heroFrames";
import { useHeroFrames, getBestFrame } from "@/hooks/useHeroFrames";

export interface HeroFrameSequenceHandle {
  setProgress: (p: number) => void;
}

interface HeroFrameSequenceProps {
  reducedMotion: boolean;
}

const HeroFrameSequence = forwardRef<
  HeroFrameSequenceHandle,
  HeroFrameSequenceProps
>(function HeroFrameSequence({ reducedMotion }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const lastFrameRef = useRef(-1);
  const rafRef = useRef<number | null>(null);

  const onFirstFrameReady = useCallback(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { cache } = useHeroFrames(onFirstFrameReady);

  // ── Core draw ─────────────────────────────────────────────────────────
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const progress = reducedMotion ? 0 : progressRef.current;
    const targetIdx = Math.round(progress * (HERO_FRAME_COUNT - 1));

    if (targetIdx === lastFrameRef.current && lastFrameRef.current !== -1) return;

    const img = getBestFrame(progress, cache, HERO_FRAME_COUNT);
    if (!img) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Use physical canvas pixels directly for 1:1 hardware sharpness
    const pw = canvas.width;
    const ph = canvas.height;
    if (pw === 0 || ph === 0) return;

    const iw = img.naturalWidth || 1920;
    const ih = img.naturalHeight || 1080;

    // Object-fit: COVER in physical canvas pixels
    const scale = Math.max(pw / iw, ph / ih);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    const dx = Math.round((pw - dw) / 2);
    const dy = Math.round((ph - dh) / 2);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, dw, dh);

    lastFrameRef.current = targetIdx;
  }

  function scheduleDrawIfNeeded() {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }

  useImperativeHandle(
    ref,
    () => ({
      setProgress(p: number) {
        progressRef.current = p;
        scheduleDrawIfNeeded();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Resize ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);

      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }

      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }

      lastFrameRef.current = -1; // force redraw
      draw();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        display: "block",
        filter: "contrast(1.08) brightness(1.02)",
        imageRendering: "auto",
      }}
      aria-hidden="true"
    />
  );
});

export default HeroFrameSequence;
