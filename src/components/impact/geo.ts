import { LAT_BOT, LAT_TOP, MAP_H, MAP_W } from "./worldMapData";

export type CountryNode = { id: string; name: string; lon: number; lat: number };

/** Add a country here and it appears on the map automatically. */
export const COUNTRY_NODES: CountryNode[] = [
  { id: "IN", name: "India", lon: 78.5, lat: 21.5 },
  { id: "AE", name: "United Arab Emirates", lon: 54.4, lat: 24.4 },
  { id: "GB", name: "United Kingdom", lon: -1.8, lat: 52.6 },
  { id: "US", name: "United States", lon: -98, lat: 39 },
];

export type Connection = {
  from: string;
  to: string;
  /** arc height as a fraction of the distance (negative bows downward) */
  bend: number;
  /** keep on small screens */
  mobile: boolean;
};

/** Order = draw order along the scroll timeline. */
export const CONNECTIONS: Connection[] = [
  { from: "IN", to: "AE", bend: 0.22, mobile: true },
  { from: "AE", to: "GB", bend: 0.3, mobile: true },
  { from: "GB", to: "US", bend: 0.32, mobile: true },
  { from: "IN", to: "GB", bend: 0.5, mobile: false },
  { from: "AE", to: "US", bend: 0.55, mobile: false },
];

export const COUNTRY_STAT = {
  value: 12,
  suffix: "+",
  title: "Countries served",
  note: "US, UK, UAE, India & beyond",
};

export function project(lon: number, lat: number): [number, number] {
  return [
    ((lon + 180) / 360) * MAP_W,
    ((LAT_TOP - Math.max(LAT_BOT, Math.min(LAT_TOP, lat))) / (LAT_TOP - LAT_BOT)) * MAP_H,
  ];
}

export function arcPath(a: [number, number], b: [number, number], bend: number): string {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cx = mx;
  const cy = my - dist * bend;
  return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

/** Mobile crops the map to the longitudes that actually matter (US → India). */
export const MOBILE_VIEWBOX = `${((-135 + 180) / 360) * MAP_W} 0 ${(240 / 360) * MAP_W} ${MAP_H}`;
export const DESKTOP_VIEWBOX = `0 0 ${MAP_W} ${MAP_H}`;
