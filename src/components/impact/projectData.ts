export type UiKind = "bars" | "nodes" | "phone" | "table" | "browser" | "flow" | "chart" | "grid";

/** Kinds of work the fragments represent (cycled across the cards). */
export const PROJECT_KINDS: { tag: string; ui: UiKind }[] = [
  { tag: "SaaS", ui: "bars" },
  { tag: "AI", ui: "nodes" },
  { tag: "Mobile", ui: "phone" },
  { tag: "Enterprise", ui: "table" },
  { tag: "Web", ui: "browser" },
  { tag: "Automation", ui: "flow" },
  { tag: "Dashboard", ui: "chart" },
  { tag: "App", ui: "grid" },
];

export const PROJECT_STAT = {
  text: "78+",
  title: "Projects shipped to production",
  note: "SaaS, AI, Enterprise & Mobile",
};

export const FRAGMENTS = { desktop: 30, mobile: 12 };
export const DOTS = { desktop: 900, mobile: 380 };
