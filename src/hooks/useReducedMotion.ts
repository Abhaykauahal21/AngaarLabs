"use client";

import { useState } from "react";

export function useReducedMotion(): boolean {
  // Lazy initial state — runs once on mount, never re-initializes
  const [prefersReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  return prefersReduced;
}
