import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, useCurrentFrame } from "remotion";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import { Globe } from "./Globe";
import { C, FONT } from "./theme";

// ---------- timeline (frames @ 30fps) ----------
const T = {
  eyebrow: 40,
  headline: 55,
  paragraphs: 95,
  globe: 125,
  cards: 250,
  canvasToLive: 300,
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// ---------- Figma-style selection box ----------
type Rect = { x: number; y: number; w: number; h: number; label: string };
const SELECTION: { f: number; rect: Rect }[] = [
  { f: 12, rect: { x: 56, y: 70, w: 300, h: 60, label: "Eyebrow" } },
  { f: 50, rect: { x: 56, y: 150, w: 640, h: 290, label: "Heading / H1" } },
  { f: 90, rect: { x: 56, y: 460, w: 600, h: 330, label: "Body / Paragraphs" } },
  { f: 120, rect: { x: 850, y: 30, w: 880, h: 780, label: "Globe / Interactive" } },
  { f: 245, rect: { x: 56, y: 822, w: 1808, h: 242, label: "Stats / Cards" } },
];

const Selection: React.FC<{ frame: number }> = ({ frame }) => {
  let i = 0;
  while (i < SELECTION.length - 1 && frame >= SELECTION[i + 1].f) i++;
  const a = SELECTION[i];
  const b = SELECTION[Math.min(i + 1, SELECTION.length - 1)];
  const k = b === a ? 0 : prog(frame, b.f - 12, b.f);
  const lerp = (p: number, q: number) => p + (q - p) * k;
  const r = { x: lerp(a.rect.x, b.rect.x), y: lerp(a.rect.y, b.rect.y), w: lerp(a.rect.w, b.rect.w), h: lerp(a.rect.h, b.rect.h) };
  const label = k > 0.5 ? b.rect.label : a.rect.label;
  const opacity = interpolate(frame, [4, 12, T.canvasToLive - 10, T.canvasToLive], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, border: `2px solid ${C.select}`, opacity, zIndex: 20 }}>
      <div style={{ position: "absolute", top: -30, left: -2, background: C.select, color: "#fff", fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: "4px 8px", borderRadius: 4 }}>
        {label}
      </div>
      {[[-6, -6], [r.w - 6, -6], [-6, r.h - 6], [r.w - 6, r.h - 6]].map(([x, y], j) => (
        <div key={j} style={{ position: "absolute", left: x - 2, top: y - 2, width: 10, height: 10, background: "#fff", border: `2px solid ${C.select}` }} />
      ))}
    </div>
  );
};

// ---------- wireframe placeholder bar ----------
const Bar: React.FC<{ w: number; h: number; mb?: number; shrink: number }> = ({ w, h, mb = 12, shrink }) => (
  <div style={{ width: w, height: h, marginBottom: mb, background: C.wireFill, borderRadius: 6, transformOrigin: "left center", transform: `scaleX(${1 - shrink})`, opacity: 1 - shrink }} />
);

// ---------- words rising in ----------
const RiseWords: React.FC<{ text: string; frame: number; start: number; stagger?: number; style: React.CSSProperties }> = ({ text, frame, start, stagger = 2.5, style }) => (
  <span style={style}>
    {text.split(" ").map((word, i) => {
      const p = prog(frame, start + i * stagger, start + i * stagger + 16);
      return (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em" }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, opacity: p }}>
            {word}&nbsp;
          </span>
        </span>
      );
    })}
  </span>
);

// ---------- icons (stroke draws on) ----------
const ICONS: Record<string, React.ReactNode> = {
  solar: (
    <>
      <path d="M4 20 L7 11 H21 L24 20 Z" />
      <path d="M9.3 11 L8.7 20 M14 11 V20 M18.7 11 L19.3 20 M5.5 15.5 H22.5" />
      <path d="M11 24 H17 M14 20 V24" />
      <circle cx="24" cy="6" r="2.5" />
      <path d="M24 1.5 V2.5 M28.5 6 H27.5 M27.2 2.8 L26.5 3.5 M20.8 2.8 L21.5 3.5" />
    </>
  ),
  bolt: (
    <>
      <circle cx="14" cy="14" r="11" />
      <path d="M15.5 6 L9 15.5 H14 L12.5 22 L19 12.5 H14 Z" />
    </>
  ),
  leaf: (
    <>
      <path d="M6 22 C6 11 13 6 23 5 C23 15 17 22 6 22 Z" />
      <path d="M6 22 L16 12" />
    </>
  ),
  globe: (
    <>
      <circle cx="14" cy="14" r="11" />
      <path d="M3 14 H25 M14 3 C9 9 9 19 14 25 M14 3 C19 9 19 19 14 25" />
    </>
  ),
};

const Icon: React.FC<{ name: string; draw: number }> = ({ name, draw }) => (
  <svg width={56} height={56} viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <g style={{ strokeDasharray: 120, strokeDashoffset: 120 * (1 - draw) }}>{ICONS[name]}</g>
  </svg>
);

// ---------- stat cards ----------
const STATS = [
  { icon: "solar", value: 164, dec: 0, unit: "MW", title: "Clean Energy Installed", sub: "Total solar capacity deployed" },
  { icon: "bolt", value: 2.2, dec: 1, unit: "B", title: "Saved Yearly", sub: "In energy costs for our clients" },
  { icon: "leaf", value: 161, dec: 0, unit: "K+", title: "CO₂ Tons Reduced Yearly", sub: "Equivalent to planting 3.5M trees" },
  { icon: "globe", value: 8, dec: 0, unit: "", title: "Key Markets", sub: "Europe, Middle East & Southeast Asia" },
];

const StatCard: React.FC<{ s: (typeof STATS)[number]; frame: number; start: number }> = ({ s, frame, start }) => {
  const p = prog(frame, start, start + 20);
  const count = interpolate(frame, [start + 8, start + 60], [0, s.value], { ...clamp, easing: Easing.out(Easing.quad) });
  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        height: 226,
        borderRadius: 22,
        padding: "34px 26px",
        boxSizing: "border-box",
        display: "flex",
        gap: 22,
        background: `rgba(255,255,255,${p})`,
        border: p < 1 ? `2px dashed rgba(201,205,211,${1 - p})` : "2px solid transparent",
        boxShadow: `0 ${18 * p}px ${50 * p}px rgba(15,23,41,${0.07 * p})`,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      {/* icon badge */}
      <div style={{ width: 106, height: 106, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p > 0 ? C.greenSoft : C.wireFill, opacity: 0.6 + 0.4 * p }}>
        <Icon name={s.icon} draw={prog(frame, start + 6, start + 36)} />
      </div>
      <div style={{ position: "relative", flex: 1 }}>
        {/* wireframe text */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - p }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 52, color: C.wire, lineHeight: 1 }}>000</div>
          <div style={{ marginTop: 18 }}><Bar w={200} h={16} shrink={0} /><Bar w={230} h={12} shrink={0} /><Bar w={150} h={12} shrink={0} /></div>
        </div>
        {/* final text */}
        <div style={{ opacity: p }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 56, color: C.ink, lineHeight: 1, letterSpacing: -1.5 }}>
            {count.toFixed(s.dec)}
            {s.unit && <span style={{ fontSize: 28, fontWeight: 600, color: C.green, marginLeft: 10, letterSpacing: 0 }}>{s.unit}</span>}
          </div>
          <div style={{ marginTop: 16, fontFamily: FONT, fontWeight: 600, fontSize: 19.5, color: C.ink, whiteSpace: "nowrap" }}>{s.title}</div>
          <div style={{ marginTop: 12, fontFamily: FONT, fontWeight: 400, fontSize: 18, color: C.muted, lineHeight: 1.5, maxWidth: 270 }}>{s.sub}</div>
        </div>
      </div>
    </div>
  );
};

// ---------- composition ----------
export const GlobeTransformation: React.FC = () => {
  const frame = useCurrentFrame();

  // hold the first frame until the web font is ready
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);

  const live = prog(frame, T.canvasToLive, T.canvasToLive + 24);
  const eyebrow = prog(frame, T.eyebrow, T.eyebrow + 18);
  const headlineWire = prog(frame, T.headline - 6, T.headline + 8);
  const paraWire = prog(frame, T.paragraphs - 6, T.paragraphs + 8);
  const para1 = prog(frame, T.paragraphs, T.paragraphs + 22);
  const para2 = prog(frame, T.paragraphs + 10, T.paragraphs + 32);

  return (
    <AbsoluteFill style={{ background: C.white, fontFamily: FONT, overflow: "hidden" }}>
      {/* Figma canvas: dot grid that fades away as the section goes live */}
      <AbsoluteFill
        style={{
          background: C.canvas,
          backgroundImage: "radial-gradient(#D5D8DD 1.4px, transparent 1.4px)",
          backgroundSize: "28px 28px",
          opacity: 1 - live,
        }}
      />

      {/* Stage tag */}
      <div style={{ position: "absolute", top: 34, right: 44, zIndex: 30, display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: C.ink, color: "#fff", fontSize: 16, fontWeight: 600 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: live > 0.5 ? C.green : C.select }} />
        {live > 0.5 ? "Live · Webflow" : "Wireframe · Figma"}
      </div>

      <Globe cx={1290} cy={430} r={405} start={T.globe} />

      {/* Left column */}
      <div style={{ position: "absolute", left: 64, top: 80, width: 700 }}>
        {/* eyebrow */}
        <div style={{ position: "relative", height: 70 }}>
          <div style={{ position: "absolute", opacity: 1 - eyebrow }}><Bar w={260} h={16} shrink={0} mb={20} /><Bar w={90} h={4} shrink={0} /></div>
          <div style={{ position: "absolute", opacity: eyebrow }}>
            <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: 4.2, color: C.green, transform: `translateY(${(1 - eyebrow) * 10}px)` }}>GLOBAL FOOTPRINT</div>
            <div style={{ marginTop: 22, width: 94, height: 3, background: C.green, transformOrigin: "left", transform: `scaleX(${eyebrow})` }} />
          </div>
        </div>

        {/* headline */}
        <div style={{ position: "relative", marginTop: 26, height: 300 }}>
          <div style={{ position: "absolute", top: 12 }}>
            <Bar w={570} h={62} mb={32} shrink={headlineWire} />
            <Bar w={610} h={62} mb={32} shrink={headlineWire} />
            <Bar w={500} h={62} shrink={headlineWire} />
          </div>
          <div style={{ position: "absolute", top: 0, width: 720 }}>
            <RiseWords
              text="Delivering Solar Expertise Across 8 Key Markets"
              frame={frame}
              start={T.headline}
              style={{ fontSize: 86, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2.4, color: C.ink }}
            />
          </div>
        </div>

        {/* paragraphs */}
        <div style={{ position: "relative", marginTop: 34 }}>
          <div style={{ position: "absolute", top: 8 }}>
            {[560, 540, 380].map((w, i) => <Bar key={i} w={w} h={14} mb={24} shrink={paraWire} />)}
            <div style={{ height: 20 }} />
            {[520, 540, 520, 500, 380].map((w, i) => <Bar key={i} w={w} h={14} mb={24} shrink={paraWire} />)}
          </div>
          <p style={{ margin: 0, fontSize: 22.5, lineHeight: 1.66, color: C.body, maxWidth: 580, opacity: para1, transform: `translateY(${(1 - para1) * 16}px)` }}>
            From Europe to Southeast Asia and the Middle East, our work spans diverse markets with precision, performance, and long-term impact.
          </p>
          <p style={{ margin: "20px 0 0", fontSize: 22.5, lineHeight: 1.66, color: C.body, maxWidth: 560, opacity: para2, transform: `translateY(${(1 - para2) * 16}px)` }}>
            Backed by decades of experience, our team has built and delivered large-scale solar projects across 8 key markets. We bring deep local knowledge, trusted partnerships, and a proven track record in the Philippines RE/PV industry.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ position: "absolute", left: 64, right: 64, top: 830, display: "flex", gap: 36, zIndex: 10 }}>
        {STATS.map((s, i) => <StatCard key={s.title} s={s} frame={frame} start={T.cards + i * 8} />)}
      </div>

      <Selection frame={frame} />
    </AbsoluteFill>
  );
};
