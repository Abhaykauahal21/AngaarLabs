import { MAP_H, MAP_W, WORLD_POLYS } from "./worldMapData";

const MERIDIANS = [-120, -60, 0, 60, 120];
const PARALLELS = [60, 30, 0, -30];

/** x for a longitude / y for a latitude in the map's coordinate space. */
const gx = (lon: number) => ((lon + 180) / 360) * MAP_W;
const gy = (lat: number) => ((84 - lat) / 142) * MAP_H;

/**
 * Minimal outline world map. Each landmass is its own <path> with
 * pathLength=1, so the story can "construct" it by animating dashoffset.
 */
export default function WorldMap() {
  return (
    <g>
      <g data-graticule opacity="0" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5">
        {MERIDIANS.map((lon) => (
          <line key={lon} x1={gx(lon)} y1="0" x2={gx(lon)} y2={MAP_H} />
        ))}
        {PARALLELS.map((lat) => (
          <line key={lat} x1="0" y1={gy(lat)} x2={MAP_W} y2={gy(lat)} />
        ))}
      </g>
      <g data-land fill="none" stroke="rgba(255,226,190,0.55)" strokeLinejoin="round">
        {WORLD_POLYS.map((poly, i) => (
          <path
            key={i}
            data-poly
            data-cx={poly.cx}
            d={poly.d}
            pathLength={1}
            style={{
              strokeWidth: "var(--sw, 0.8)",
              strokeDasharray: 1,
              strokeDashoffset: 1,
              fill: "rgba(255,200,140,0)",
            }}
          />
        ))}
      </g>
    </g>
  );
}
