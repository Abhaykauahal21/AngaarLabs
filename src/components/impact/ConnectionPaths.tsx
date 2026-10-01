import { arcPath, CONNECTIONS, COUNTRY_NODES, project } from "./geo";

const byId = Object.fromEntries(COUNTRY_NODES.map((n) => [n.id, n]));

/**
 * Curved network arcs: a soft glow underlay, a crisp line, and a travelling
 * spark. All three are scrubbed by the story via data attributes.
 */
export default function ConnectionPaths() {
  return (
    <g fill="none" strokeLinecap="round">
      {CONNECTIONS.map((c, i) => {
        const a = byId[c.from];
        const b = byId[c.to];
        const d = arcPath(project(a.lon, a.lat), project(b.lon, b.lat), c.bend);
        return (
          <g key={`${c.from}-${c.to}`} data-conn data-mobile={c.mobile ? "1" : "0"} data-i={i}>
            <path
              data-glow
              d={d}
              pathLength={1}
              stroke="rgba(255,100,0,0.28)"
              style={{ strokeWidth: "var(--sw-glow, 4)", strokeDasharray: 1, strokeDashoffset: 1 }}
            />
            <path
              data-line
              d={d}
              pathLength={1}
              stroke="rgba(255,168,70,0.95)"
              style={{ strokeWidth: "var(--sw-line, 1)", strokeDasharray: 1, strokeDashoffset: 1 }}
            />
            <circle data-dot r="2.4" fill="#fff1c8" style={{ opacity: 0, filter: "drop-shadow(0 0 4px rgba(255,140,40,1))" }} />
          </g>
        );
      })}
    </g>
  );
}
