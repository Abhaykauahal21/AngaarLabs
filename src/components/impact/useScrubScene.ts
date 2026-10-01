"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Drives `onProgress(0..1)` from the scroll position of `wrapperRef`.
 * The wrapper is tall and contains a CSS-sticky scene, so nothing is pinned
 * through JS — the scene releases naturally and can never trap the user.
 * A proxy tween adds a little scrub smoothing; reverse scrolling just works.
 */
export function useScrubScene(
  wrapperRef: React.RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  staticMode: boolean,
  onEnter?: (e: number) => void
) {
  const cb = useRef(onProgress);
  const enter = useRef(onEnter);
  useEffect(() => {
    cb.current = onProgress;
    enter.current = onEnter;
  });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (staticMode) {
      cb.current(1);
      enter.current?.(1);
      return;
    }
    // entry: the scene slides up over the previous one (top of wrapper: bottom → top of viewport)
    const entry = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "top top",
      onUpdate: (self) => enter.current?.(self.progress),
      onRefresh: (self) => enter.current?.(self.progress),
    });
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      ease: "none",
      onUpdate: () => cb.current(proxy.p),
      scrollTrigger: {
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.7,
      },
    });
    return () => {
      entry.kill();
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [wrapperRef, staticMode]);
}
