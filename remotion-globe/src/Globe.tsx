import React, { useMemo } from "react";
import { Easing, interpolate } from "remotion";
import { geoContains, geoDistance, geoOrthographic } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import { C, FONT } from "./theme";

// ---- Land dots: sampled once, then projected every frame ----
const land = feature(land110 as any, (land110 as any).objects.land) as any;

const LAND_DOTS: { lon: number; lat: number; seed: number }[] = (() => {
  const dots: { lon: number; lat: number; seed: number }[] = [];
  const latStep = 1.6;
  for (let lat = -58; lat <= 80; lat += latStep) {
    // keep dot spacing even on the sphere
    const lonStep = latStep / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    for (let lon = -180; lon < 180; lon += lonStep) {
      if (geoContains(land, [lon, lat])) {
        const seed = Math.abs(Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453) % 1;
        dots.push({ lon, lat, seed });
      }
    }
  }
  return dots;
})();

// dx/dy nudge labels apart where countries sit close together
export const MARKERS: { name: string; lon: number; lat: number; anchor: "start" | "middle" | "end"; dx: number; dy: number }[] = [
  { name: "SPAIN", lon: -3.7, lat: 40.4, anchor: "middle", dx: 0, dy: 36 },
  { name: "GERMANY", lon: 10.4, lat: 51.2, anchor: "start", dx: 22, dy: -4 },
  { name: "ITALY", lon: 12.5, lat: 42.8, anchor: "middle", dx: 0, dy: 36 },
  { name: "AUSTRIA", lon: 14.5, lat: 47.5, anchor: "start", dx: 22, dy: 16 },
  { name: "UAE", lon: 54.4, lat: 24.4, anchor: "middle", dx: 0, dy: 36 },
  { name: "THAILAND", lon: 100.9, lat: 15.9, anchor: "end", dx: -20, dy: -12 },
  { name: "VIETNAM", lon: 108.3, lat: 14.1, anchor: "start", dx: 20, dy: 30 },
  { name: "PHILIPPINES", lon: 121.8, lat: 12.9, anchor: "start", dx: 22, dy: 6 },
];

type Props = { cx: number; cy: number; r: number; start: number; frame: number };

export const Globe: React.FC<Props> = ({ cx, cy, r, start, frame }) => {
  const t = frame - start;

  // Spin in fast and ease towards Europe → Southeast Asia. A constant drift runs
  // the whole time, so the globe never comes to a dead stop.
  const settle = 120;
  const spin = interpolate(t, [0, settle], [-222, -50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = Math.max(0, t) * 0.035;
  const lambda = spin - drift;
  const phi = -30;

  const projection = useMemo(
    () => geoOrthographic().scale(r).translate([cx, cy]).rotate([lambda, phi]).clipAngle(90),
    [cx, cy, r, lambda]
  );
  const center: [number, number] = [-lambda, -phi];

  // Wireframe placeholder fades out as dots arrive
  const wireOpacity = interpolate(t, [0, 30], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const dots = LAND_DOTS.map((d, i) => {
    const dist = geoDistance([d.lon, d.lat], center);
    if (dist > Math.PI / 2) return null;
    const p = projection([d.lon, d.lat]);
    if (!p) return null;
    const facing = Math.cos(dist); // 1 at centre, 0 at the limb
    const appear = interpolate(t, [4 + d.seed * 40, 14 + d.seed * 40], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    // fade the lower part of the globe out behind the stat cards, like the design
    const bottomFade = interpolate(p[1], [cy + r * 0.55, cy + r * 0.95], [1, 0.15], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <circle
        key={i}
        cx={p[0]}
        cy={p[1]}
        r={1.2 + 2.1 * facing}
        fill={C.dot}
        opacity={appear * (0.25 + 0.75 * facing) * bottomFade}
      />
    );
  });

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {/* Wireframe state: dashed circle with placeholder cross */}
      <g opacity={wireOpacity}>
        <circle cx={cx} cy={cy} r={r} fill={C.wireFill} fillOpacity={0.35} stroke={C.wire} strokeWidth={3} strokeDasharray="14 12" />
        <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} stroke={C.wire} strokeWidth={3} />
        <line x1={cx + r * 0.7} y1={cy - r * 0.7} x2={cx - r * 0.7} y2={cy + r * 0.7} stroke={C.wire} strokeWidth={3} />
      </g>

      {/* Soft sphere shading */}
      <defs>
        <radialGradient id="sphere" cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="100%" stopColor="#E9ECEF" stopOpacity={0.55} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#sphere)" opacity={1 - wireOpacity} />

      <g>{dots}</g>

      {/* Markers pop in one by one once the globe settles */}
      {MARKERS.map((m, i) => {
        const dist = geoDistance([m.lon, m.lat], center);
        const p = projection([m.lon, m.lat]);
        if (!p || dist > Math.PI / 2 - 0.08) return null;
        // fade out gently near the edge of the globe instead of popping
        const edge = interpolate(dist, [Math.PI / 2 - 0.4, Math.PI / 2 - 0.08], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const mStart = settle - 20 + i * 6;
        const pop = interpolate(t, [mStart, mStart + 16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.8)),
        }) * edge;
        if (pop <= 0) return null;
        const pulse = ((t - mStart) % 45) / 45;
        const labelX = p[0] + m.dx;
        const labelY = p[1] + m.dy;
        return (
          <g key={m.name}>
            <circle cx={p[0]} cy={p[1]} r={10 + pulse * 22} fill="none" stroke={C.green} strokeWidth={2} opacity={(1 - pulse) * 0.5 * pop} />
            <circle cx={p[0]} cy={p[1]} r={17 * pop} fill={C.greenHalo} />
            <circle cx={p[0]} cy={p[1]} r={10 * pop} fill={C.white} />
            <circle cx={p[0]} cy={p[1]} r={7 * pop} fill={C.green} />
            <text
              x={labelX}
              y={labelY}
              textAnchor={m.anchor}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={17}
              letterSpacing={0.4}
              fill={C.ink}
              opacity={pop}
            >
              {m.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
