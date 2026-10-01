import { PROJECT_KINDS, type UiKind } from "./projectData";

/** Tiny abstract interface sketches — one per kind of work. */
function MiniUI({ kind }: { kind: UiKind }) {
  const o = "rgba(255,138,40,0.85)";
  const d = "rgba(255,255,255,0.22)";
  switch (kind) {
    case "bars":
      return (
        <>
          {[4, 10, 7, 14, 11].map((h, i) => (
            <rect key={i} x={3 + i * 7} y={20 - h} width="4" height={h} rx="1" fill={i === 3 ? o : d} />
          ))}
        </>
      );
    case "nodes":
      return (
        <>
          <path d="M8 6 20 12 32 6M20 12v8" stroke={d} strokeWidth="1" fill="none" />
          <circle cx="8" cy="6" r="2.2" fill={d} />
          <circle cx="32" cy="6" r="2.2" fill={d} />
          <circle cx="20" cy="12" r="3" fill={o} />
          <circle cx="20" cy="20" r="2.2" fill={d} />
        </>
      );
    case "phone":
      return (
        <>
          <rect x="13" y="1" width="14" height="22" rx="3" fill="none" stroke={d} strokeWidth="1" />
          <rect x="16" y="5" width="8" height="3" rx="1" fill={o} />
          <rect x="16" y="11" width="8" height="2" rx="1" fill={d} />
          <rect x="16" y="15" width="5" height="2" rx="1" fill={d} />
        </>
      );
    case "table":
      return (
        <>
          {[3, 9, 15].map((y, i) => (
            <g key={y}>
              <rect x="3" y={y} width="9" height="3" rx="1" fill={i === 0 ? o : d} />
              <rect x="15" y={y} width="22" height="3" rx="1" fill={d} />
            </g>
          ))}
        </>
      );
    case "browser":
      return (
        <>
          <rect x="3" y="2" width="34" height="20" rx="2.5" fill="none" stroke={d} strokeWidth="1" />
          <path d="M3 7h34" stroke={d} strokeWidth="1" />
          <circle cx="6.5" cy="4.5" r="1" fill={o} />
          <rect x="7" y="11" width="14" height="3" rx="1" fill={d} />
          <rect x="7" y="16" width="22" height="3" rx="1" fill={d} />
        </>
      );
    case "flow":
      return (
        <>
          <rect x="2" y="9" width="9" height="6" rx="2" fill={d} />
          <rect x="16" y="9" width="9" height="6" rx="2" fill={o} />
          <rect x="30" y="9" width="8" height="6" rx="2" fill={d} />
          <path d="M11 12h5M25 12h5" stroke={d} strokeWidth="1" />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M3 19 11 13 18 16 27 6 37 9" stroke={o} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M3 22h34" stroke={d} strokeWidth="1" />
        </>
      );
    default:
      return (
        <>
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect key={`${r}${c}`} x={4 + c * 9} y={3 + r * 7} width="6" height="5" rx="1.2" fill={r === 1 && c === 2 ? o : d} />
            ))
          )}
        </>
      );
  }
}

/**
 * Renders `count` fragment cards. Positions are driven imperatively by the
 * story (transform only), so this component never re-renders on scroll.
 */
export default function ProjectFragments({
  count,
  register,
}: {
  count: number;
  register: (i: number, el: HTMLDivElement | null) => void;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const kind = PROJECT_KINDS[i % PROJECT_KINDS.length];
        return (
          <div
            key={i}
            ref={(el) => register(i, el)}
            className="absolute left-0 top-0 flex h-[62px] w-[100px] flex-col justify-between rounded-md border border-orange-500/25 bg-[#0b0806]/90 p-1.5 opacity-0 shadow-[0_0_18px_rgba(255,90,0,0.1)] will-change-transform max-md:h-[40px] max-md:w-[64px] max-md:p-1"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between font-code text-[6px] uppercase tracking-[0.2em] text-white/45">
              <span>{kind.tag}</span>
              <span className="h-[3px] w-[3px] rounded-full bg-orange-500 shadow-[0_0_5px_#ff7a00]" />
            </div>
            <svg viewBox="0 0 40 24" className="h-[26px] w-full max-md:h-[14px]">
              <MiniUI kind={kind.ui} />
            </svg>
            <div className="font-code text-[5px] tracking-[0.2em] text-white/25">
              PRJ-{String(i * 7 + 11).padStart(3, "0")}
            </div>
          </div>
        );
      })}
    </>
  );
}
