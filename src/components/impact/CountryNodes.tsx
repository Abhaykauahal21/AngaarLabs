import { COUNTRY_NODES, project } from "./geo";

/** Glowing location points. Driven by the story (opacity + scale). */
export default function CountryNodes() {
  return (
    <g>
      {COUNTRY_NODES.map((n) => {
        const [x, y] = project(n.lon, n.lat);
        return (
          <g
            key={n.id}
            data-node
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
          >
            <g data-node-inner style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}>
              <circle r="9" fill="rgba(255,110,0,0.18)" />
              <circle
                r="4.5"
                fill="none"
                stroke="rgba(255,150,50,0.9)"
                strokeWidth="0.8"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: "nodePing 2.6s ease-out infinite",
                }}
              />
              <circle r="2.6" fill="#ffd9a0" />
              <title>{n.name}</title>
            </g>
          </g>
        );
      })}
    </g>
  );
}
