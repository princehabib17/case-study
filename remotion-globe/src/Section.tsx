import React from "react";
import { Easing, interpolate } from "remotion";
import { Globe } from "./Globe";
import { C, FONT } from "./theme";

// Section-internal timeline, in "build frames" (driven by the parent, may be fractional).
export const B = { eyebrow: 40, headline: 55, paragraphs: 95, globe: 125, cards: 250 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = Easing.bezier(0.33, 0, 0.2, 1);
const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: smooth });

// Selection targets in section coordinates (1920×1080)
export const TARGETS = {
  eyebrow: { x: 56, y: 70, w: 300, h: 64 },
  heading: { x: 56, y: 150, w: 700, h: 300 },
  body: { x: 56, y: 462, w: 610, h: 350 },
  globe: { x: 872, y: 14, w: 836, h: 800 },
  stats: { x: 56, y: 822, w: 1808, h: 242 },
};

const WireLabel: React.FC<{ children: React.ReactNode; opacity?: number; style?: React.CSSProperties }> = ({ children, opacity = 1, style }) => (
  <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, letterSpacing: 0.6, color: "#9AA0A8", textTransform: "uppercase", opacity, ...style }}>{children}</div>
);

const Bar: React.FC<{ w: number; h: number; mb?: number; shrink: number; label?: string }> = ({ w, h, mb = 12, shrink, label }) => (
  <div
    style={{
      width: w,
      height: h,
      marginBottom: mb,
      background: C.wireFill,
      border: "1.5px solid #D9DCE1",
      boxSizing: "border-box",
      borderRadius: 6,
      transformOrigin: "left center",
      transform: `scaleX(${1 - shrink})`,
      opacity: 1 - shrink,
      display: "flex",
      alignItems: "center",
      paddingLeft: 18,
    }}
  >
    {label && <WireLabel>{label}</WireLabel>}
  </div>
);

const RiseWords: React.FC<{ text: string; f: number; start: number; stagger?: number; style: React.CSSProperties }> = ({ text, f, start, stagger = 2.5, style }) => (
  <span style={style}>
    {text.split(" ").map((word, i) => {
      const p = prog(f, start + i * stagger, start + i * stagger + 22);
      return (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em" }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, opacity: p }}>{word}&nbsp;</span>
        </span>
      );
    })}
  </span>
);

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

const STATS = [
  { icon: "solar", value: 164, dec: 0, unit: "MW", title: "Clean Energy Installed", sub: "Total solar capacity deployed" },
  { icon: "bolt", value: 2.2, dec: 1, unit: "B", title: "Saved Yearly", sub: "In energy costs for our clients" },
  { icon: "leaf", value: 161, dec: 0, unit: "K+", title: "CO₂ Tons Reduced Yearly", sub: "Equivalent to planting 3.5M trees" },
  { icon: "globe", value: 8, dec: 0, unit: "", title: "Key Markets", sub: "Europe, Middle East & Southeast Asia" },
];

const StatCard: React.FC<{ s: (typeof STATS)[number]; f: number; start: number }> = ({ s, f, start }) => {
  const p = prog(f, start, start + 28);
  const count = interpolate(f, [start + 8, start + 70], [0, s.value], { ...clamp, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
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
        border: `2px dashed rgba(201,205,211,${1 - p})`,
        boxShadow: `0 ${18 * p}px ${50 * p}px rgba(15,23,41,${0.07 * p})`,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      <div style={{ width: 106, height: 106, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: C.greenSoft, boxShadow: `inset 0 0 0 200px rgba(230,232,235,${1 - p})` }}>
        <Icon name={s.icon} draw={prog(f, start + 6, start + 40)} />
      </div>
      <div style={{ position: "relative", flex: 1 }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - p }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 52, color: C.wire, lineHeight: 1 }}>000</div>
          <div style={{ marginTop: 18 }}>
            <Bar w={200} h={16} shrink={0} />
            <Bar w={230} h={12} shrink={0} />
            <Bar w={150} h={12} shrink={0} />
          </div>
        </div>
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

/** The Renesource "Global Footprint" section at 1920×1080. `f` = build progress in frames. */
export const Section: React.FC<{ f: number }> = ({ f }) => {
  const eyebrow = prog(f, B.eyebrow, B.eyebrow + 24);
  const headlineWire = prog(f, B.headline - 8, B.headline + 10);
  const paraWire = prog(f, B.paragraphs - 8, B.paragraphs + 10);
  const para1 = prog(f, B.paragraphs, B.paragraphs + 28);
  const para2 = prog(f, B.paragraphs + 10, B.paragraphs + 38);
  const globeWireLabel = 1 - prog(f, B.globe, B.globe + 20);

  return (
    <div style={{ position: "absolute", inset: 0, width: 1920, height: 1080, background: C.white, fontFamily: FONT, overflow: "hidden" }}>
      <Globe cx={1290} cy={430} r={405} start={B.globe} frame={f} />
      <WireLabel opacity={globeWireLabel} style={{ position: "absolute", left: 1290, top: 430, transform: "translate(-50%, -50%)", background: C.white, padding: "8px 14px", borderRadius: 6 }}>
        Interactive globe
      </WireLabel>

      <div style={{ position: "absolute", left: 64, top: 80, width: 700 }}>
        <div style={{ position: "relative", height: 70 }}>
          <div style={{ position: "absolute", opacity: 1 - eyebrow }}>
            <Bar w={260} h={22} shrink={0} mb={18} label="Eyebrow" />
            <Bar w={90} h={4} shrink={0} />
          </div>
          <div style={{ position: "absolute", opacity: eyebrow }}>
            <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: 4.2, color: C.green, transform: `translateY(${(1 - eyebrow) * 10}px)` }}>GLOBAL FOOTPRINT</div>
            <div style={{ marginTop: 22, width: 94, height: 3, background: C.green, transformOrigin: "left", transform: `scaleX(${eyebrow})` }} />
          </div>
        </div>

        <div style={{ position: "relative", marginTop: 26, height: 300 }}>
          <div style={{ position: "absolute", top: 12 }}>
            <Bar w={570} h={62} mb={32} shrink={headlineWire} label="H1 — Headline" />
            <Bar w={610} h={62} mb={32} shrink={headlineWire} />
            <Bar w={500} h={62} shrink={headlineWire} />
          </div>
          <div style={{ position: "absolute", top: 0, width: 720 }}>
            <RiseWords text="Delivering Solar Expertise Across 8 Key Markets" f={f} start={B.headline} style={{ fontSize: 86, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2.4, color: C.ink }} />
          </div>
        </div>

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

      <div style={{ position: "absolute", left: 64, right: 64, top: 830, display: "flex", gap: 36, zIndex: 10 }}>
        {STATS.map((s, i) => <StatCard key={s.title} s={s} f={f} start={B.cards + i * 10} />)}
      </div>
    </div>
  );
};
