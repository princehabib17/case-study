import React from "react";
import { Easing, interpolate, interpolateColors } from "remotion";
import { Globe } from "./Globe";
import { C, FONT } from "./theme";
import { smooth } from "./timeline";

export { TARGETS } from "./timeline";

// Section-internal cues, in "build frames" (driven by the parent, fractional).
// Everything overlaps: the whole wireframe → final transformation is one wave, ~40 → 150.
export const B = { eyebrow: 40, headline: 46, para1: 58, para2: 64, globe: 70, cards: 92 };

const win = (f: number, a: number, b: number) => smooth((f - a) / (b - a));
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------------------------------------------------------------------------
// Morph: every word starts as a grey wireframe block sitting exactly where the
// word will be. The block retracts left→right while the word is revealed
// behind it, so the wireframe turns into the text in place.
// ---------------------------------------------------------------------------
const Morph: React.FC<{
  text: string;
  f: number;
  start: number;
  stagger: number;
  dur?: number;
  style: React.CSSProperties;
  bar?: [number, number]; // bar top/bottom inset as a fraction of the line box
}> = ({ text, f, start, stagger, dur = 18, style, bar = [0.2, 0.18] }) => (
  <span style={style}>
    {text.split(" ").map((word, i) => {
      const p = win(f, start + i * stagger, start + i * stagger + dur);
      return (
        <React.Fragment key={i}>
          <span style={{ position: "relative", display: "inline-block" }}>
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${bar[0] * 100}%`,
                bottom: `${bar[1] * 100}%`,
                borderRadius: 6,
                background: C.wireFill,
                boxShadow: "inset 0 0 0 1.5px #DADDE2",
                transformOrigin: "right center",
                transform: `scaleX(${1 - p})`,
                opacity: p < 1 ? 1 : 0,
              }}
            />
            <span style={{ display: "inline-block", clipPath: `inset(-20% ${(1 - p) * 100}% -20% 0)`, transform: `translateY(${(1 - p) * 0.12}em)` }}>{word}</span>
          </span>{" "}
        </React.Fragment>
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
  const p = win(f, start, start + 28);
  const count = interpolate(f, [start + 6, start + 60], [0, s.value], { ...clamp, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
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
        background: interpolateColors(p, [0, 1], ["rgba(243,244,246,0.6)", "#FFFFFF"]),
        border: `2px dashed rgba(201,205,211,${1 - p})`,
        boxShadow: `0 ${18 * p}px ${50 * p}px rgba(15,23,41,${0.07 * p})`,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      <div style={{ width: 106, height: 106, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: interpolateColors(p, [0, 1], [C.wireFill, C.greenSoft]) }}>
        <Icon name={s.icon} draw={win(f, start + 4, start + 34)} />
      </div>
      <div style={{ flex: 1, fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 56, color: C.ink, lineHeight: 1, letterSpacing: -1.5, whiteSpace: "nowrap" }}>
          <Morph text={count.toFixed(s.dec)} f={f} start={start} stagger={0} dur={20} bar={[0.02, 0.02]} style={{}} />
          {s.unit && <Morph text={s.unit} f={f} start={start + 4} stagger={0} dur={18} style={{ fontSize: 28, fontWeight: 600, color: C.green, letterSpacing: 0 }} />}
        </div>
        <div style={{ marginTop: 16, fontWeight: 600, fontSize: 19.5, color: C.ink, whiteSpace: "nowrap" }}>
          <Morph text={s.title} f={f} start={start + 6} stagger={1.5} style={{}} />
        </div>
        <div style={{ marginTop: 12, fontWeight: 400, fontSize: 18, color: C.muted, lineHeight: 1.5, maxWidth: 270 }}>
          <Morph text={s.sub} f={f} start={start + 10} stagger={1} style={{}} />
        </div>
      </div>
    </div>
  );
};

/** The Renesource "Global Footprint" section at 1920×1080. `f` = build progress in frames. */
export const Section: React.FC<{ f: number }> = ({ f }) => {
  const line = win(f, B.eyebrow + 4, B.eyebrow + 26);
  return (
    <div style={{ position: "absolute", inset: 0, width: 1920, height: 1080, background: C.white, fontFamily: FONT, overflow: "hidden" }}>
      <Globe cx={1290} cy={430} r={405} start={B.globe} frame={f} />

      <div style={{ position: "absolute", left: 64, top: 80, width: 720 }}>
        {/* eyebrow */}
        <div style={{ height: 70 }}>
          <Morph text="GLOBAL FOOTPRINT" f={f} start={B.eyebrow} stagger={4} dur={20} style={{ fontSize: 21, fontWeight: 600, letterSpacing: 4.2, color: C.green }} />
          <div style={{ marginTop: 18, width: 94, height: 3, borderRadius: 2, background: interpolateColors(line, [0, 1], ["#DADDE2", C.green]) }} />
        </div>

        {/* headline */}
        <div style={{ marginTop: 26, fontSize: 86, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2.4, color: C.ink }}>
          <Morph text="Delivering Solar Expertise Across 8 Key Markets" f={f} start={B.headline} stagger={2.6} dur={20} bar={[0.16, 0.14]} style={{}} />
        </div>

        {/* paragraphs */}
        <p style={{ margin: "34px 0 0", fontSize: 22.5, lineHeight: 1.66, color: C.body, maxWidth: 580 }}>
          <Morph text="From Europe to Southeast Asia and the Middle East, our work spans diverse markets with precision, performance, and long-term impact." f={f} start={B.para1} stagger={0.8} dur={16} bar={[0.26, 0.24]} style={{}} />
        </p>
        <p style={{ margin: "20px 0 0", fontSize: 22.5, lineHeight: 1.66, color: C.body, maxWidth: 560 }}>
          <Morph text="Backed by decades of experience, our team has built and delivered large-scale solar projects across 8 key markets. We bring deep local knowledge, trusted partnerships, and a proven track record in the Philippines RE/PV industry." f={f} start={B.para2} stagger={0.6} dur={16} bar={[0.26, 0.24]} style={{}} />
        </p>
      </div>

      <div style={{ position: "absolute", left: 64, right: 64, top: 830, display: "flex", gap: 36, zIndex: 10 }}>
        {STATS.map((s, i) => <StatCard key={s.title} s={s} f={f} start={B.cards + i * 6} />)}
      </div>
    </div>
  );
};
