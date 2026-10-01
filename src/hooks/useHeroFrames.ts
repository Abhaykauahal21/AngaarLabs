"use client";

import { useEffect, useRef } from "react";
import { FRAME_URLS, HERO_FRAME_COUNT } from "@/lib/heroFrames";

/** Shared image cache — persists across re-mounts */
const imageCache = new Map<number, HTMLImageElement>();
let globalLoadedCount = 0;

/**
 * Progressively preloads all hero frames.
 *
 * Strategy:
 *  1. Frame 0 — immediate (blocks nothing else, tiny file)
 *  2. Frames 1–11 — high-priority batch (first ~13% of animation)
 *  3. Frames 12–83 — background batch, concurrency-limited to 4
 *
 * Returns a ref to the cache map so the canvas can read images synchronously.
 */
export function useHeroFrames(onFirstFrameReady: () => void): {
  cache: Map<number, HTMLImageElement>;
  loadedCount: React.RefObject<number>;
} {
  const loadedCountRef = useRef(globalLoadedCount);
  const onFirstReadyCalled = useRef(false);

  useEffect(() => {
    // Already loaded everything (e.g. hot-reload)
    if (imageCache.size === HERO_FRAME_COUNT) {
      if (!onFirstReadyCalled.current) {
        onFirstReadyCalled.current = true;
        onFirstFrameReady();
      }
      return;
    }

    function loadFrame(index: number): Promise<void> {
      if (imageCache.has(index)) return Promise.resolve();

      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.src = FRAME_URLS[index];

        img.onload = async () => {
          if (img.decode) {
            try {
              await img.decode();
            } catch {
              // Ignore decode errors and continue
            }
          }
          imageCache.set(index, img);
          globalLoadedCount = imageCache.size;
          loadedCountRef.current = globalLoadedCount;

          // Signal first frame available
          if (index === 0 && !onFirstReadyCalled.current) {
            onFirstReadyCalled.current = true;
            onFirstFrameReady();
          }
          resolve();
        };

        img.onerror = () => resolve(); // silently skip bad frames
      });
    }

    async function preloadAll() {
      // Phase 1: first frame immediately
      await loadFrame(0);

      // Phase 2: frames 1–15 (high priority, parallel)
      const earlyBatch = Array.from({ length: 15 }, (_, i) =>
        loadFrame(i + 1)
      );
      await Promise.all(earlyBatch);

      // Phase 3: remaining frames, 8 concurrent for instant local delivery
      const remaining = Array.from(
        { length: HERO_FRAME_COUNT - 16 },
        (_, i) => i + 16
      );

      async function worker(queue: number[]) {
        for (const idx of queue) {
          await loadFrame(idx);
        }
      }

      const CONCURRENCY = 8;
      const chunkSize = Math.ceil(remaining.length / CONCURRENCY);
      const chunks = Array.from({ length: CONCURRENCY }, (_, i) =>
        remaining.slice(i * chunkSize, (i + 1) * chunkSize)
      );
      await Promise.all(chunks.map(worker));
    }

    preloadAll();
  }, [onFirstFrameReady]);

  return { cache: imageCache, loadedCount: loadedCountRef };
}

/**
 * Given a scroll progress (0–1) and the loaded cache,
 * return the best available HTMLImageElement to render.
 * Falls back to the nearest loaded frame below the target.
 */
export function getBestFrame(
  progress: number,
  cache: Map<number, HTMLImageElement>,
  totalFrames: number
): HTMLImageElement | null {
  const target = Math.round(progress * (totalFrames - 1));

  // Exact frame available
  if (cache.has(target)) return cache.get(target)!;

  // Search downward for nearest loaded frame
  for (let i = target - 1; i >= 0; i--) {
    if (cache.has(i)) return cache.get(i)!;
  }

  // Search upward as last resort
  for (let i = target + 1; i < totalFrames; i++) {
    if (cache.has(i)) return cache.get(i)!;
  }

  return null;
}
