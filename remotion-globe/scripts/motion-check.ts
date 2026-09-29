// Samples the master timeline every frame and reports how much is moving.
// A frame counts as "stalled" when every tracked signal has (near) zero velocity.
import { PHASE, buildFrame, devicePose, selection, videoProgress, win } from "../src/timeline";

const N = 960;
const signals = (u: number) => {
  const s = selection(u);
  const p = devicePose(u);
  return {
    select: [s.rect.x, s.rect.y, s.rect.w, s.rect.h],
    device: [p.rotY * 20, p.rotX * 20, p.scale * 1000, p.floatY],
    build: [buildFrame(u) * 4],
    morph: [win(u, PHASE.morph[0], PHASE.morph[1]) * 400],
    panels: [win(u, PHASE.panelsOut[0], PHASE.panelsOut[1]) * 400],
  };
};
const mag = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));

let prev = signals(videoProgress(0, N));
let stalls = 0;
let minSel = Infinity;
let maxJerk = 0;
let prevSpeed = 0;
for (let fr = 1; fr < N; fr++) {
  const cur = signals(videoProgress(fr, N));
  const speeds = Object.fromEntries(Object.keys(cur).map((k) => [k, mag((cur as any)[k], (prev as any)[k])])) as Record<string, number>;
  const total = Object.values(speeds).reduce((a, b) => a + b, 0);
  const x = fr / N;
  if (x > 0.03 && x < 0.97 && total < 0.5) stalls++;
  if (x > 0.05 && x < 0.7) minSel = Math.min(minSel, speeds.select);
  maxJerk = Math.max(maxJerk, Math.abs(total - prevSpeed));
  prevSpeed = total;
  prev = cur;
}
console.log(`frames sampled: ${N}`);
console.log(`stalled frames (nothing moving, 3%–97%): ${stalls}`);
console.log(`slowest selection-box speed during its tour: ${minSel.toFixed(3)} px/frame`);
console.log(`largest frame-to-frame change in total speed: ${maxJerk.toFixed(2)}`);

// ---- where do problems happen? ----
{
  let prevS = signals(videoProgress(0, N));
  let prevT = 0;
  const stallFrames: number[] = [];
  const spikes: string[] = [];
  for (let fr = 1; fr < N; fr++) {
    const cur = signals(videoProgress(fr, N));
    const sp = Object.fromEntries(Object.keys(cur).map((k) => [k, mag((cur as any)[k], (prevS as any)[k])])) as Record<string, number>;
    const tot = Object.values(sp).reduce((a, b) => a + b, 0);
    const x = fr / N;
    if (x > 0.03 && x < 0.97 && tot < 0.5) stallFrames.push(fr);
    if (Math.abs(tot - prevT) > 8) spikes.push(`f${fr} (${(fr / 60).toFixed(2)}s) Δ=${(tot - prevT).toFixed(1)} ${JSON.stringify(Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, +v.toFixed(1)])))}`);
    prevT = tot;
    prevS = cur;
  }
  const ranges: string[] = [];
  for (let i = 0; i < stallFrames.length; i++) {
    const a = stallFrames[i];
    while (i + 1 < stallFrames.length && stallFrames[i + 1] === stallFrames[i] + 1) i++;
    ranges.push(`${(a / 60).toFixed(2)}–${(stallFrames[i] / 60).toFixed(2)}s`);
  }
  console.log("stall ranges:", ranges.join(", ") || "none");
  console.log("speed spikes:", spikes.slice(0, 8).join("\n  ") || "none");
}
