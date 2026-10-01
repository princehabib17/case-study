// Wireframe → website, driven by scroll (same stack as fantasy.co: GSAP ScrollTrigger + Lenis).
// One timeline is scrubbed by scroll position: wireframe boxes fly into place (FLIP-style),
// their placeholder bars dissolve into word-shaped blocks, and each block becomes its word.
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { geoContains, geoOrthographic } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };

// ---------------------------------------------------------------------------
// Stage: the design is authored at 1920×1080 and scaled to fit the viewport
// ---------------------------------------------------------------------------
const stage = $("#stage");
const fit = () => {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
};

// Split every [data-morph] element into words; each word gets a grey block on top of it.
const splitWords = () => {
  for (const el of $$("[data-morph]")) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((word, i) => {
      const w = document.createElement("span");
      w.className = "w";
      const t = document.createElement("span");
      t.textContent = word;
      w.append(document.createElement("b"), t);
      el.append(w);
      if (i < words.length - 1) el.append(" ");
    });
  }
};

// Rect of a final element in stage coordinates (independent of the current scale)
const finalRect = (id) => {
  if (id === "globe") return { x: 885, y: 25, w: 810, h: 810 };
  const el = document.getElementById(id);
  const r = el.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  const s = sr.width / 1920;
  const pad = el.classList.contains("card") ? 0 : 14;
  return { x: (r.left - sr.left) / s - pad, y: (r.top - sr.top) / s - pad, w: r.width / s + pad * 2, h: r.height / s + pad * 2 };
};

// ---------------------------------------------------------------------------
// Globe (canvas): land dots spread out from the centre, then markers pop
// ---------------------------------------------------------------------------
const land = feature(land110, land110.objects.land);
const toVec = (lon, lat) => {
  const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};
const DOTS = [];
for (let lat = -58; lat <= 80; lat += 1.6) {
  const lonStep = 1.6 / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  for (let lon = -180; lon < 180; lon += lonStep) {
    if (geoContains(land, [lon, lat])) DOTS.push({ lon, lat, seed: Math.abs(Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453) % 1, v: toVec(lon, lat) });
  }
}
const MARKERS = [
  ["SPAIN", -3.7, 40.4, "center", 0, 36], ["GERMANY", 10.4, 51.2, "left", 22, -4], ["ITALY", 12.5, 42.8, "center", 0, 36],
  ["AUSTRIA", 14.5, 47.5, "left", 22, 16], ["UAE", 54.4, 24.4, "center", 0, 36], ["THAILAND", 100.9, 15.9, "right", -20, -12],
  ["VIETNAM", 108.3, 14.1, "left", 20, 30], ["PHILIPPINES", 121.8, 12.9, "left", 22, 6],
];
const G = { wave: 0, spin: 0, markers: 0 };
const ctx = $("#globe").getContext("2d");
const CX = 1290, CY = 430, R = 405;
let drift = 0;

const drawGlobe = (time) => {
  ctx.clearRect(0, 0, 1920, 1080);
  if (G.wave <= 0.001) return;
  const lambda = -236 + 186 * G.spin - drift;
  const phi = -30;
  const proj = geoOrthographic().scale(R).translate([CX, CY]).rotate([lambda, phi]).clipAngle(90);
  const c = toVec(-lambda, -phi);

  // soft sphere
  const grad = ctx.createRadialGradient(CX - R * 0.2, CY - R * 0.25, R * 0.1, CX, CY, R);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(226,230,235,0.6)");
  ctx.globalAlpha = smooth(G.wave * 2);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#9aa0a8";
  for (const d of DOTS) {
    const facing = d.v[0] * c[0] + d.v[1] * c[1] + d.v[2] * c[2];
    if (facing <= 0) continue;
    const appear = clamp01((G.wave * 1.25 - (1 - facing) * 1.0 - d.seed * 0.12) / 0.18);
    if (appear <= 0) continue;
    const p = proj([d.lon, d.lat]);
    if (!p) continue;
    const bottom = 1 - 0.85 * clamp01((p[1] - (CY + R * 0.55)) / (R * 0.4));
    ctx.globalAlpha = appear * (0.25 + 0.75 * facing) * bottom;
    ctx.beginPath();
    ctx.arc(p[0], p[1], (1.2 + 2.1 * facing) * (0.6 + 0.4 * appear), 0, Math.PI * 2);
    ctx.fill();
  }

  // markers
  MARKERS.forEach(([name, lon, lat, align, dx, dy], i) => {
    const v = toVec(lon, lat);
    const facing = v[0] * c[0] + v[1] * c[1] + v[2] * c[2];
    const pop = smooth((G.markers - i * 0.08) / 0.36) * clamp01((facing - 0.08) / 0.3);
    if (pop <= 0.001) return;
    const p = proj([lon, lat]);
    if (!p) return;
    const pulse = ((time / 1500 + i * 0.13) % 1);
    ctx.globalAlpha = (1 - pulse) * 0.5 * pop;
    ctx.strokeStyle = "#2e9e44"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p[0], p[1], 10 + pulse * 22, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = pop;
    ctx.fillStyle = "rgba(46,158,68,0.22)"; ctx.beginPath(); ctx.arc(p[0], p[1], 17 * pop, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(p[0], p[1], 10 * pop, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2e9e44"; ctx.beginPath(); ctx.arc(p[0], p[1], 7 * pop, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0f1729"; ctx.font = '700 17px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = align;
    ctx.fillText(name, p[0] + dx, p[1] + dy);
    ctx.fillStyle = "#9aa0a8";
  });
  ctx.globalAlpha = 1;
};

// ---------------------------------------------------------------------------
// The scroll-scrubbed transformation timeline
// ---------------------------------------------------------------------------
const build = () => {
  $$(".card").forEach((c, i) => (c.id = `card-${i}`));
  const groups = $$(".grp");
  gsap.set(groups, { opacity: 0 }); // word-shaped blocks appear as the boxes land
  gsap.set(".card", { backgroundColor: "rgba(255,255,255,0)", boxShadow: "0 0px 0px rgba(15,23,41,0)" });
  gsap.set(".badge", { backgroundColor: "#e6e8eb" });
  gsap.set("#eyeline", { backgroundColor: "#d6d9de" });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: "#track", start: "top top", end: "bottom bottom", scrub: 0.8 },
  });
  tl.to("#hint", { opacity: 0, duration: 0.3 }, 0);

  $$(".box").forEach((box, i) => {
    const [x, y, w, h] = box.dataset.rect.split(",").map(Number);
    gsap.set(box, { left: x, top: y, width: w, height: h });
    const id = box.dataset.for;
    const to = finalRect(id);
    const isCard = id.startsWith("card");
    const at = isCard ? 1.05 + (i - 4) * 0.15 : 0.02 + i * 0.24;

    // 1) the wireframe box flies and resizes into the final element's place
    tl.to(box, { left: to.x, top: to.y, width: to.w, height: to.h, borderRadius: id === "globe" ? 405 : isCard ? 22 : 12, duration: 1.5, ease: "power2.inOut" }, at);
    // 2) its placeholder content dissolves while word-shaped blocks fade in underneath
    tl.to($$(".ph, .x", box), { opacity: 0, duration: 0.6 }, at + 0.75);
    tl.to($(".tag", box), { opacity: 0, duration: 0.4 }, at + 1.0);
    tl.to(box, { borderColor: "rgba(156,163,175,0)", backgroundColor: "rgba(243,244,246,0)", duration: 0.7 }, at + 1.2);

    if (id === "globe") {
      tl.to(G, { spin: 1, duration: 2.8, ease: "power2.out" }, at + 0.6);
      tl.to(G, { wave: 1, duration: 1.6, ease: "power1.inOut" }, at + 1.0);
      tl.to(G, { markers: 1, duration: 1.3 }, at + 2.4);
      return;
    }
    const group = document.getElementById(id);
    tl.to(group, { opacity: 1, duration: 0.5 }, at + 0.9);
    // 3) each grey block turns into its word, as a wave
    tl.to($$(".w", group), { "--p": 1, duration: 0.6, ease: "power1.out", stagger: { amount: isCard ? 0.5 : 0.9 } }, at + 1.35);

    if (id === "g-eyebrow") tl.to("#eyeline", { backgroundColor: "#2e9e44", duration: 0.5 }, at + 1.4);
    if (isCard) {
      tl.to(group, { backgroundColor: "#ffffff", boxShadow: "0 18px 50px rgba(15,23,41,0.07)", duration: 0.6 }, at + 1.2);
      tl.to($(".badge", group), { backgroundColor: "#eaf6ec", duration: 0.5 }, at + 1.25);
      tl.to($(".badge svg", group), { "--draw": 1, duration: 0.8 }, at + 1.35);
      const n = { v: 0 }, val = $(".val", group), dec = Number(group.dataset.dec), target = Number(group.dataset.value);
      tl.to(n, { v: target, duration: 1.1, ease: "power1.out", onUpdate: () => (val.textContent = n.v.toFixed(dec)) }, at + 1.3);
    }
  });

  // the Figma-style dot grid gives way to the white site at the end
  tl.to("#dotgrid", { opacity: 0, duration: 1.0 }, 3.0);
  tl.to([".stage", ".sticky"], { backgroundColor: "#ffffff", duration: 1.0 }, 3.0);
  tl.to({}, { duration: 0.4 }); // short hold at the very end
  return tl;
};

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
(async () => {
  splitWords();
  fit();
  await document.fonts.ready;
  await document.fonts.load('700 17px "Plus Jakarta Sans"');
  build();

  // Lenis smooth scrolling, wired into GSAP's ticker (same pattern fantasy.co uses)
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => {
    lenis.raf(t * 1000);
    const now = performance.now();
    drift = Math.sin(now / 5000) * 7; // gentle sway so the globe is never frozen, but stays in range
    drawGlobe(now);
  });
  gsap.ticker.lagSmoothing(0);

  addEventListener("resize", () => { fit(); ScrollTrigger.refresh(); });
  window.__ready = true;
})();
