// One master timeline. Everything is a function of a single progress value
// u ∈ [0, 1]. In the video u comes from time; on the web it comes from scroll.
// Times below are authored in seconds of the 13s video and converted to u.
//
// Rules that keep it smooth:
//  - windows overlap, so something is always moving
//  - paths that visit several targets use one C1-continuous spline
//  - only the very start and very end of the whole piece come to rest

export const DURATION_S = 13;
export const FPS = 60;
export const FRAMES = DURATION_S * FPS;
/** seconds → progress */
export const at = (s: number) => s / DURATION_S;

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

// ---- phases ----
export const PHASE = {
  morph: [at(2.7), at(4.0)] as const, // Figma chrome morphs into Webflow chrome
  panelsOut: [at(8.0), at(9.8)] as const, // editor panels leave, site grows to fill the screen
};
// Section build-frames: wireframe → final transformation runs from build-frame 40 to ~150,
// i.e. roughly 3 seconds at this rate, as one overlapping wave.
const BUILD_START_S = 3.5;
const BUILD_RATE = 38; // build-frames per second of video

export const buildFrame = (u: number) => {
  // Not capped: build-frames keep counting so the globe keeps drifting and markers keep pulsing.
  const s = u * DURATION_S;
  return 35 + Math.max(0, s - BUILD_START_S) * BUILD_RATE;
};

// ---- selection path: Hermite spline through targets ----
type Node = { u: number; target: TargetKey; label: string };
const NODES: Node[] = [
  { u: at(0.3), target: "eyebrow", label: "Eyebrow" },
  { u: at(0.85), target: "heading", label: "H1 — Headline" },
  { u: at(1.4), target: "body", label: "Body copy" },
  { u: at(1.95), target: "globe", label: "Globe" },
  { u: at(2.5), target: "stats", label: "Stat cards" },
  // Webflow pass rides just ahead of the transformation wave
  { u: at(3.55), target: "eyebrow", label: "Div · eyebrow" },
  { u: at(3.95), target: "heading", label: "H1 · heading-xl" },
  { u: at(4.45), target: "body", label: "Div · body-lg" },
  { u: at(4.95), target: "globe", label: "Embed · globe-embed" },
  { u: at(5.6), target: "stats", label: "Grid · stat-card" },
  { u: at(7.6), target: "stats", label: "Grid · stat-card" },
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
    opacity: win(u, 0, at(0.3)) * (1 - win(u, at(7.4), at(8.1))),
  };
};

// ---- device pose: one continuous move, with a soft sway that dies out ----
export const devicePose = (u: number) => {
  const settle = sine(u / at(10.6));
  const life = 1 - win(u, at(8.5), at(12.4));
  const s = u * DURATION_S;
  return {
    rotY: lerp(-28, 0, settle) + Math.sin(s * 0.9) * 2.2 * life,
    rotX: lerp(12, 0, settle) + Math.cos(s * 0.65) * 1.2 * life,
    rotZ: lerp(-2.4, 0, settle),
    // camera pushes in for the transformation, then eases back for the finished site
    scale: 0.78 + 0.26 * sine(u / at(5.2)) - 0.14 * sine((u - at(5.2)) / at(5.8)),
    floatY: Math.sin(s * 1.1) * 7 * life,
  };
};

/** time-based conversion for the video: short ease at both ends only */
export const videoProgress = (frame: number, total: number) => {
  const x = frame / (total - 1);
  const r = 0.04;
  const v = 1 / (1 - r); // peak speed so the curve still ends at 1
  if (x < r) return (v * x * x) / (2 * r);
  if (x > 1 - r) return 1 - (v * (1 - x) * (1 - x)) / (2 * r);
  return v * (x - r / 2);
};
