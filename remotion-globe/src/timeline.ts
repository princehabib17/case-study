// One master timeline. Everything is a function of a single progress value
// u ∈ [0, 1]. In the video u comes from time; on the web it comes from scroll.
//
// Rules that keep it smooth:
//  - windows overlap, so something is always moving
//  - paths that visit several targets use one C1-continuous spline, so they
//    never decelerate to a stop at each target
//  - only the very start and very end of the whole piece come to rest

export type Rect = { x: number; y: number; w: number; h: number };
export type TargetKey = "eyebrow" | "heading" | "body" | "globe" | "stats";

// Selection targets in section coordinates (1920×1080)
export const TARGETS: Record<TargetKey, Rect> = {
  eyebrow: { x: 56, y: 70, w: 300, h: 64 },
  heading: { x: 56, y: 150, w: 700, h: 300 },
  body: { x: 56, y: 462, w: 610, h: 350 },
  globe: { x: 872, y: 14, w: 836, h: 800 },
  stats: { x: 56, y: 822, w: 1808, h: 242 },
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** smootherstep: gentle start and end, used for windows that overlap others */
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const win = (u: number, a: number, b: number) => smooth((u - a) / (b - a));
const sine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

// ---- phases (in u) ----
export const PHASE = {
  morph: [0.22, 0.33] as const, // Figma chrome morphs into Webflow chrome
  build: [0.26, 0.8] as const, // section builds (maps to section build-frames 35 → 365)
  panelsOut: [0.76, 0.93] as const, // editor panels leave, site grows to fill the screen
};
const BUILD_F: [number, number] = [35, 365];

export const buildFrame = (u: number) => {
  const [a, b] = PHASE.build;
  // linear: no pauses inside the build (the section looks identical for build-frames 0–35)
  // Not capped at the end: build-frames keep counting so the globe keeps drifting and the
  // markers keep pulsing after everything has arrived.
  return lerp(BUILD_F[0], BUILD_F[1], Math.max(0, (u - a) / (b - a)));
};

// ---- selection path: Hermite spline through targets ----
type Node = { u: number; target: TargetKey; label: string };
const NODES: Node[] = [
  { u: 0.02, target: "eyebrow", label: "Eyebrow" },
  { u: 0.075, target: "heading", label: "H1 — Headline" },
  { u: 0.12, target: "body", label: "Body copy" },
  { u: 0.17, target: "globe", label: "Globe" },
  { u: 0.215, target: "stats", label: "Stat cards" },
  { u: 0.275, target: "eyebrow", label: "Div · eyebrow" },
  { u: 0.3, target: "heading", label: "H1 · heading-xl" },
  { u: 0.36, target: "body", label: "Div · body-lg" },
  { u: 0.41, target: "globe", label: "Embed · globe-embed" },
  { u: 0.54, target: "globe", label: "Embed · globe-embed" },
  { u: 0.62, target: "stats", label: "Grid · stat-card" },
  { u: 0.72, target: "stats", label: "Grid · stat-card" },
];

const ROW_FIGMA: Record<TargetKey, number> = { eyebrow: 1, heading: 2, body: 3, globe: 4, stats: 5 };
const ROW_WEBFLOW: Record<TargetKey, number> = { eyebrow: 2, heading: 3, body: 4, globe: 5, stats: 6 };

const hermite = (u: number, values: number[]) => {
  const n = NODES.length;
  if (u <= NODES[0].u) return values[0];
  if (u >= NODES[n - 1].u) return values[n - 1];
  let i = 0;
  while (u > NODES[i + 1].u) i++;
  const tangent = (j: number) =>
    j === 0 || j === n - 1 ? 0 : (values[j + 1] - values[j - 1]) / (NODES[j + 1].u - NODES[j - 1].u);
  const du = NODES[i + 1].u - NODES[i].u;
  const s = (u - NODES[i].u) / du;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * values[i] +
    (s3 - 2 * s2 + s) * du * tangent(i) +
    (-2 * s3 + 3 * s2) * values[i + 1] +
    (s3 - s2) * du * tangent(i + 1)
  );
};

const series = (fn: (n: Node) => number) => NODES.map(fn);
const SX = series((n) => TARGETS[n.target].x);
const SY = series((n) => TARGETS[n.target].y);
const SW = series((n) => TARGETS[n.target].w);
const SH = series((n) => TARGETS[n.target].h);
const SRF = series((n) => ROW_FIGMA[n.target]);
const SRW = series((n) => ROW_WEBFLOW[n.target]);

export const selection = (u: number) => {
  let nearest = NODES[0];
  for (const n of NODES) if (Math.abs(n.u - u) < Math.abs(nearest.u - u)) nearest = n;
  return {
    rect: { x: hermite(u, SX), y: hermite(u, SY), w: hermite(u, SW), h: hermite(u, SH) },
    label: nearest.label,
    cls: nearest.label.split("· ")[1] ?? "global-footprint",
    rowFigma: hermite(u, SRF),
    rowWebflow: hermite(u, SRW),
    opacity: win(u, 0.0, 0.02) * (1 - win(u, 0.7, 0.77)),
  };
};

// ---- device pose: one continuous move, with a soft sway that dies out ----
export const devicePose = (u: number) => {
  const settle = sine(u / 0.95);
  const life = 1 - win(u, 0.7, 0.97);
  return {
    rotY: lerp(-28, 0, settle) + Math.sin(u * Math.PI * 2 * 1.15) * 2.2 * life,
    rotX: lerp(12, 0, settle) + Math.cos(u * Math.PI * 2 * 0.8) * 1.2 * life,
    rotZ: lerp(-2.4, 0, settle),
    scale: lerp(0.72, 0.86, settle),
    floatY: Math.sin(u * Math.PI * 2 * 1.4) * 7 * life,
  };
};

/** time-based conversion for the video: gentle ease at both ends only */
export const videoProgress = (frame: number, total: number) => {
  const x = frame / (total - 1);
  // short ease-in and ease-out ramps, constant speed through the middle
  const r = 0.05;
  const v = 1 / (1 - r); // peak speed so the curve still ends at 1
  if (x < r) return (v * x * x) / (2 * r);
  if (x > 1 - r) return 1 - (v * (1 - x) * (1 - x)) / (2 * r);
  return v * (x - r / 2);
};
