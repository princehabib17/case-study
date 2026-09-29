import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import { Section, TARGETS } from "./Section";
import { FONT } from "./theme";

// ---------------------------------------------------------------------------
// Timeline in SECONDS. Everything overlaps and uses long ease-in-out curves,
// so nothing snaps to a stop mid-shot.
// ---------------------------------------------------------------------------
const S = {
  buildStart: 3.9, // Webflow build begins (section build-frame 35)
  buildRate: 44, // section build-frames per second
  handoff: [3.3, 4.2], // Figma UI → Webflow UI
  panelsOut: [10.9, 12.6], // editor panels slide away, site fills the screen
  deviceSettle: 13.2, // device finishes rotating to face the camera
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const soft = Easing.bezier(0.33, 0, 0.2, 1);
const p = (t: number, a: number, b: number, e = inOut) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: e });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// App (device screen) internal resolution
const APP_W = 1600;
const APP_H = 1000;
const TOP = 44;
const SIDE = 260;

const FIGMA_BLUE = "#0D99FF";
const WEBFLOW_BLUE = "#146EF5";

// ---------------------------------------------------------------------------
// Selection path: Figma tours the wireframe, then Webflow follows the build.
// ---------------------------------------------------------------------------
type TargetKey = keyof typeof TARGETS;
const KF: { t: number; target: TargetKey; label: string }[] = [
  { t: 0.9, target: "eyebrow", label: "Eyebrow" },
  { t: 1.5, target: "heading", label: "H1 — Headline" },
  { t: 2.1, target: "body", label: "Body copy" },
  { t: 2.7, target: "globe", label: "Globe" },
  { t: 3.3, target: "stats", label: "Stat cards" },
  { t: 4.35, target: "eyebrow", label: "Div · eyebrow" },
  { t: 4.75, target: "heading", label: "H1 · heading-xl" },
  { t: 5.8, target: "body", label: "Div · body-lg" },
  { t: 6.5, target: "globe", label: "Embed · globe-embed" },
  { t: 8.75, target: "stats", label: "Grid · stat-card" },
];
const MOVE = 0.5;
const ROW_FIGMA: Record<TargetKey, number> = { eyebrow: 1, heading: 2, body: 3, globe: 4, stats: 5 };
const ROW_WEBFLOW: Record<TargetKey, number> = { eyebrow: 2, heading: 3, body: 4, globe: 5, stats: 6 };

const selectionAt = (t: number) => {
  let i = 0;
  while (i < KF.length - 1 && t >= KF[i + 1].t) i++;
  const from = KF[i];
  const next = KF[i + 1];
  let to = from;
  let k = 0;
  if (next && t > next.t - MOVE) {
    to = next;
    k = p(t, next.t - MOVE, next.t);
  }
  const a = TARGETS[from.target];
  const b = TARGETS[to.target];
  return {
    rect: { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) },
    label: k > 0.5 ? to.label : from.label,
    rowFigma: lerp(ROW_FIGMA[from.target], ROW_FIGMA[to.target], k),
    rowWebflow: lerp(ROW_WEBFLOW[from.target], ROW_WEBFLOW[to.target], k),
    cls: (k > 0.5 ? to.label : from.label).split("· ")[1] ?? "global-footprint",
  };
};

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------
const Txt: React.FC<{ c: string; s?: number; w?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ c, s = 13, w = 500, style, children }) => (
  <div style={{ fontFamily: FONT, fontSize: s, fontWeight: w, color: c, whiteSpace: "nowrap", ...style }}>{children}</div>
);

const Field: React.FC<{ label: string; value: string; dark?: boolean }> = ({ label, value, dark }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 10px", borderRadius: 6, background: dark ? "#1E1E1E" : "#F5F5F5", flex: 1 }}>
    <Txt c={dark ? "#8A8A8A" : "#8C8C8C"} s={12}>{label}</Txt>
    <Txt c={dark ? "#EBEBEB" : "#1E1E1E"} s={12.5}>{value}</Txt>
  </div>
);

const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 8, style }) => (
  <div style={{ display: "flex", gap, alignItems: "center", ...style }}>{children}</div>
);

// ---------------------------------------------------------------------------
// Figma-style editor chrome (light)
// ---------------------------------------------------------------------------
const FIGMA_LAYERS = ["Global Footprint", "Eyebrow", "H1 — Headline", "Body copy", "Globe", "Stat cards"];

const FigmaChrome: React.FC<{ row: number }> = ({ row }) => {
  const line = "#E6E6E6";
  return (
    <>
      {/* top bar */}
      <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: TOP, background: "#FFFFFF", borderBottom: `1px solid ${line}`, display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box", justifyContent: "space-between" }}>
        <Row gap={18}>
          <svg width={18} height={18} viewBox="0 0 18 18"><g fill="#1E1E1E"><rect x="1" y="3" width="16" height="2" rx="1" /><rect x="1" y="8" width="16" height="2" rx="1" /><rect x="1" y="13" width="16" height="2" rx="1" /></g></svg>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#1E1E1E" strokeWidth={1.6}><path d="M4 3 L15 10 L10 11 L8 16 Z" /></svg>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#1E1E1E" strokeWidth={1.6}><path d="M6 2 V18 M14 2 V18 M2 6 H18 M2 14 H18" /></svg>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#1E1E1E" strokeWidth={1.6}><rect x="3" y="4" width="14" height="12" rx="1" /></svg>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#1E1E1E" strokeWidth={1.6}><path d="M4 16 L14 6 M12 4 L16 8" /></svg>
          <Txt c="#1E1E1E" s={16} w={600}>T</Txt>
        </Row>
        <Row gap={6}>
          <Txt c="#8C8C8C">Renesource /</Txt>
          <Txt c="#1E1E1E" w={600}>Case Study — Wireframes</Txt>
        </Row>
        <Row gap={12}>
          <div style={{ width: 26, height: 26, borderRadius: 13, background: "#9747FF" }} />
          <div style={{ padding: "6px 14px", borderRadius: 6, background: FIGMA_BLUE }}><Txt c="#FFFFFF" w={600}>Share</Txt></div>
          <Txt c="#1E1E1E">52%</Txt>
        </Row>
      </div>

      {/* layers panel */}
      <div style={{ position: "absolute", left: 0, top: TOP, width: SIDE, height: APP_H - TOP, background: "#FFFFFF", borderRight: `1px solid ${line}`, boxSizing: "border-box" }}>
        <Row gap={16} style={{ padding: "14px 16px", borderBottom: `1px solid ${line}` }}>
          <Txt c="#1E1E1E" w={600}>File</Txt>
          <Txt c="#8C8C8C">Assets</Txt>
        </Row>
        <Txt c="#8C8C8C" s={12} w={600} style={{ padding: "14px 16px 8px" }}>Layers</Txt>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 6, right: 6, top: row * 30, height: 30, borderRadius: 6, background: "#E5F4FF" }} />
          {FIGMA_LAYERS.map((name, i) => (
            <Row key={name} gap={10} style={{ position: "relative", height: 30, paddingLeft: i === 0 ? 16 : 36 }}>
              <Txt c={i === 0 ? "#1E1E1E" : "#6B6B6B"} s={12} w={700}>{i === 0 ? "#" : i === 4 ? "◯" : i === 5 ? "▦" : "T"}</Txt>
              <Txt c="#1E1E1E" s={12.5} w={i === 0 ? 600 : 500}>{name}</Txt>
            </Row>
          ))}
        </div>
      </div>

      {/* properties panel */}
      <div style={{ position: "absolute", right: 0, top: TOP, width: SIDE, height: APP_H - TOP, background: "#FFFFFF", borderLeft: `1px solid ${line}`, boxSizing: "border-box", padding: 16 }}>
        <Row gap={16} style={{ marginBottom: 18 }}>
          <Txt c="#1E1E1E" w={600}>Design</Txt>
          <Txt c="#8C8C8C">Prototype</Txt>
        </Row>
        <Txt c="#1E1E1E" s={12} w={600} style={{ marginBottom: 10 }}>Frame</Txt>
        <Row style={{ marginBottom: 8 }}><Field label="W" value="1920" /><Field label="H" value="1080" /></Row>
        <Row style={{ marginBottom: 22 }}><Field label="X" value="0" /><Field label="Y" value="0" /></Row>
        <Txt c="#1E1E1E" s={12} w={600} style={{ marginBottom: 10 }}>Auto layout</Txt>
        <Row style={{ marginBottom: 22 }}><Field label="↔" value="64" /><Field label="↕" value="80" /></Row>
        <Txt c="#1E1E1E" s={12} w={600} style={{ marginBottom: 10 }}>Fill</Txt>
        <Row style={{ marginBottom: 22 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#FFFFFF", border: `1px solid ${line}` }} />
          <Txt c="#1E1E1E" s={12.5}>FFFFFF</Txt>
          <Txt c="#8C8C8C" s={12.5}>100%</Txt>
        </Row>
        {["Stroke", "Effects", "Export"].map((h) => (
          <Row key={h} style={{ justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${line}` }}>
            <Txt c="#1E1E1E" s={12} w={600}>{h}</Txt>
            <Txt c="#8C8C8C" s={16}>+</Txt>
          </Row>
        ))}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Webflow-style Designer chrome (dark)
// ---------------------------------------------------------------------------
const NAV = ["Body", "Section · global-footprint", "Div · eyebrow", "H1 · heading-xl", "Div · body-lg", "Embed · globe-embed", "Grid · stat-card"];

const WebflowChrome: React.FC<{ row: number; cls: string }> = ({ row, cls }) => {
  const panel = "#2B2B2B";
  const line = "#3A3A3A";
  const text = "#EBEBEB";
  const dim = "#A3A3A3";
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: TOP, background: panel, borderBottom: `1px solid ${line}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", boxSizing: "border-box" }}>
        <Row gap={16}>
          <Txt c={text} s={14} w={700}>Webflow</Txt>
          <div style={{ width: 1, height: 20, background: line }} />
          <Txt c={dim}>Page:</Txt>
          <Txt c={text} w={600}>Projects Template ▾</Txt>
        </Row>
        <Row gap={14}>
          {[0, 1, 2, 3].map((i) => (
            <svg key={i} width={20} height={18} viewBox="0 0 20 18" fill="none" stroke={i === 0 ? WEBFLOW_BLUE : dim} strokeWidth={1.6}>
              {i === 0 ? <><rect x="1" y="2" width="18" height="11" rx="1" /><path d="M7 16 H13" /></> : <rect x={3 + i * 1.5} y="1" width={14 - i * 3} height="16" rx="2" />}
            </svg>
          ))}
          <Txt c={dim} s={12.5}>1920 px</Txt>
        </Row>
        <Row gap={12}>
          <div style={{ width: 26, height: 26, borderRadius: 13, background: "#5E5E5E" }} />
          <div style={{ padding: "6px 14px", borderRadius: 4, background: "#3F3F3F" }}><Txt c={text} w={600}>Share</Txt></div>
          <div style={{ padding: "6px 14px", borderRadius: 4, background: WEBFLOW_BLUE }}><Txt c="#FFFFFF" w={600}>Publish</Txt></div>
        </Row>
      </div>

      {/* icon rail + navigator */}
      <div style={{ position: "absolute", left: 0, top: TOP, width: SIDE, height: APP_H - TOP, background: panel, borderRight: `1px solid ${line}`, boxSizing: "border-box", display: "flex" }}>
        <div style={{ width: 40, borderRight: `1px solid ${line}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, gap: 18 }}>
          {["+", "≡", "▭", "◎", "▣"].map((g, i) => <Txt key={g} c={i === 1 ? WEBFLOW_BLUE : dim} s={16} w={700}>{g}</Txt>)}
        </div>
        <div style={{ flex: 1 }}>
          <Txt c={text} s={12.5} w={600} style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${line}` }}>Navigator</Txt>
          <div style={{ position: "relative", marginTop: 6 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: row * 30, height: 30, background: "rgba(20,110,245,0.22)", borderLeft: `2px solid ${WEBFLOW_BLUE}` }} />
            {NAV.map((name, i) => (
              <Row key={name} gap={8} style={{ position: "relative", height: 30, paddingLeft: 12 + Math.min(i, 2) * 12 }}>
                <div style={{ width: 11, height: 11, border: `1.5px solid ${dim}`, borderRadius: i === 5 ? 6 : 2 }} />
                <Txt c={text} s={12}>{name}</Txt>
              </Row>
            ))}
          </div>
        </div>
      </div>

      {/* style panel */}
      <div style={{ position: "absolute", right: 0, top: TOP, width: SIDE, height: APP_H - TOP, background: panel, borderLeft: `1px solid ${line}`, boxSizing: "border-box", padding: 14 }}>
        <Row gap={16} style={{ marginBottom: 18, paddingBottom: 12, borderBottom: `1px solid ${line}` }}>
          <Txt c={text} w={600}>Style</Txt>
          <Txt c={dim}>Settings</Txt>
          <Txt c={dim}>Interactions</Txt>
        </Row>
        <Txt c={dim} s={12} style={{ marginBottom: 8 }}>Style selector</Txt>
        <div style={{ height: 32, borderRadius: 4, background: "#1E1E1E", display: "flex", alignItems: "center", padding: "0 6px", marginBottom: 20 }}>
          <div style={{ padding: "3px 8px", borderRadius: 3, background: WEBFLOW_BLUE }}><Txt c="#FFFFFF" s={12} w={600}>{cls}</Txt></div>
        </div>
        <Txt c={text} s={12} w={600} style={{ marginBottom: 10 }}>Layout</Txt>
        <Row gap={0} style={{ marginBottom: 20, borderRadius: 4, overflow: "hidden" }}>
          {["Block", "Flex", "Grid", "None"].map((d, i) => (
            <div key={d} style={{ flex: 1, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: i === 1 ? "#3F3F3F" : "#1E1E1E" }}>
              <Txt c={i === 1 ? text : dim} s={11.5}>{d}</Txt>
            </div>
          ))}
        </Row>
        <Txt c={text} s={12} w={600} style={{ marginBottom: 10 }}>Spacing</Txt>
        <div style={{ position: "relative", height: 120, borderRadius: 4, background: "#1E1E1E", marginBottom: 20 }}>
          <div style={{ position: "absolute", inset: 26, border: `1px dashed ${dim}`, borderRadius: 3 }} />
          <div style={{ position: "absolute", inset: 52, background: "#3F3F3F", borderRadius: 2 }} />
          <Txt c={dim} s={11} style={{ position: "absolute", top: 7, left: "50%", transform: "translateX(-50%)" }}>80</Txt>
          <Txt c={dim} s={11} style={{ position: "absolute", top: 33, left: "50%", transform: "translateX(-50%)" }}>0</Txt>
          <Txt c={dim} s={11} style={{ position: "absolute", top: 52, left: 7 }}>64</Txt>
          <Txt c={dim} s={11} style={{ position: "absolute", top: 52, right: 7 }}>64</Txt>
        </div>
        <Txt c={text} s={12} w={600} style={{ marginBottom: 10 }}>Typography</Txt>
        <Row style={{ marginBottom: 8 }}><Field dark label="Font" value="Plus Jakarta Sans" /></Row>
        <Row style={{ marginBottom: 8 }}><Field dark label="Weight" value="700" /><Field dark label="Size" value="86" /></Row>
        <Row><Field dark label="Color" value="#0F1729" /></Row>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------
export const DeviceShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);

  // section build progress (fractional frames => silky at 60fps)
  const f = t < S.buildStart ? 0 : 35 + (t - S.buildStart) * S.buildRate;

  const w = p(t, S.handoff[0], S.handoff[1]); // Figma → Webflow
  const e = p(t, S.panelsOut[0], S.panelsOut[1]); // panels out
  const sel = selectionAt(t);
  const selOpacity = interpolate(t, [0.55, 0.9, 10.5, 10.95], [0, 1, 1, 0], clamp);
  const selColor = interpolateColors(w, [0, 1], [FIGMA_BLUE, WEBFLOW_BLUE]);

  // design frame placement inside the app screen
  const sEditor = 1000 / 1920;
  const sFinal = APP_W / 1920;
  const scale = lerp(sEditor, sFinal, e);
  const frameLeft = lerp(300, 0, e);
  const frameTop = lerp(TOP + (APP_H - TOP - 1080 * sEditor) / 2 + 10, (APP_H - 1080 * sFinal) / 2, e);

  const canvasBg = interpolateColors(e, [0, 1], [interpolateColors(w, [0, 1], ["#F5F5F5", "#1E1E1E"]), "#FFFFFF"]);

  // device motion: one continuous move from an angled hero shot to front-on
  const settle = p(t, 0, S.deviceSettle);
  const calm = p(t, S.panelsOut[0], S.deviceSettle); // fades out the idle float
  const intro = p(t, 0, 1.1, soft);
  const rotY = lerp(-26, 0, settle) + Math.sin(t * 0.9) * 2.4 * (1 - calm);
  const rotX = lerp(11, 0, settle) + Math.cos(t * 0.7) * 1.3 * (1 - calm);
  const rotZ = lerp(-2.2, 0, settle);
  const devScale = lerp(0.72, 0.855, settle);
  const floatY = Math.sin(t * 1.1) * 7 * (1 - calm) + (1 - intro) * 90;

  const caption = t < 3.6 ? "Figma · Wireframe" : t < 11.2 ? "Webflow · Build" : "Live website";
  const captionFade = Math.min(p(t, 0.3, 0.9), 1 - p(t, 3.3, 3.6) + p(t, 3.6, 3.9), 1 - p(t, 10.9, 11.2) + p(t, 11.2, 11.5));

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, #FFFFFF 0%, #EEF0F3 55%, #E1E4E9 100%)", fontFamily: FONT, overflow: "hidden" }}>
      {/* stage caption */}
      <div style={{ position: "absolute", top: 44, left: 60, display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: "#0F1729", opacity: captionFade * intro }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: t < 3.6 ? FIGMA_BLUE : t < 11.2 ? WEBFLOW_BLUE : "#2E9E44" }} />
        <Txt c="#FFFFFF" s={16} w={600}>{caption}</Txt>
      </div>

      {/* floor shadow */}
      <div style={{ position: "absolute", left: "50%", top: 540 + 470 * devScale, width: 1500 * devScale, height: 70, transform: `translate(-50%, -50%) translateX(${rotY * 6}px)`, borderRadius: "50%", background: "rgba(15,23,41,0.28)", filter: "blur(38px)", opacity: intro }} />

      {/* device */}
      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 45%", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: APP_W + 72,
            height: APP_H + 72,
            padding: 36,
            boxSizing: "border-box",
            borderRadius: 64,
            background: "linear-gradient(145deg, #2B2E35 0%, #111317 55%, #1B1D22 100%)",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.09), inset 0 0 0 9px #0A0B0D, 0 60px 120px rgba(15,23,41,0.25)",
            transform: `translateY(${floatY}px) scale(${devScale}) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
            opacity: intro,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 15, left: "50%", width: 8, height: 8, marginLeft: -4, borderRadius: 4, background: "#2A2D33", boxShadow: "inset 0 0 0 2px #0A0B0D" }} />

          {/* screen */}
          <div style={{ position: "relative", width: APP_W, height: APP_H, borderRadius: 28, overflow: "hidden", background: canvasBg }}>
            {/* Figma canvas dot grid */}
            <AbsoluteFill style={{ backgroundImage: "radial-gradient(#D5D8DD 1.3px, transparent 1.3px)", backgroundSize: "24px 24px", opacity: (1 - w) * (1 - e) }} />

            {/* frame name above the design (Figma) */}
            <Txt c="#8C8C8C" s={12.5} style={{ position: "absolute", left: frameLeft, top: frameTop - 22, opacity: (1 - w) * (1 - e) }}>Global Footprint — Desktop 1920</Txt>

            {/* the design itself */}
            <div
              style={{
                position: "absolute",
                left: frameLeft,
                top: frameTop,
                width: 1920,
                height: 1080,
                transform: `scale(${scale})`,
                transformOrigin: "0 0",
                boxShadow: `0 ${12 / scale}px ${40 / scale}px rgba(0,0,0,${0.12 * (1 - e)})`,
              }}
            >
              <Section f={f} />
              {/* selection box, drawn in section coordinates, constant on-screen thickness */}
              <div style={{ position: "absolute", left: sel.rect.x, top: sel.rect.y, width: sel.rect.w, height: sel.rect.h, border: `${2 / scale}px solid ${selColor}`, opacity: selOpacity, boxSizing: "border-box" }}>
                <div style={{ position: "absolute", top: -26 / scale, left: -2 / scale, background: selColor, padding: `${3 / scale}px ${7 / scale}px`, borderRadius: 3 / scale }}>
                  <Txt c="#FFFFFF" s={11.5 / scale} w={600}>{sel.label}</Txt>
                </div>
                {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], j) => (
                  <div key={j} style={{ position: "absolute", left: `calc(${x * 100}% - ${4 / scale}px)`, top: `calc(${y * 100}% - ${4 / scale}px)`, width: 8 / scale, height: 8 / scale, background: "#FFFFFF", border: `${1.5 / scale}px solid ${selColor}`, boxSizing: "border-box", opacity: 1 - w }} />
                ))}
              </div>
            </div>

            {/* editor chrome, slides away at the end */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", inset: 0, transform: `translateY(${-TOP * 1.2 * e}px)`, opacity: 1 - e }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: TOP, overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - w }}><FigmaChrome row={sel.rowFigma} /></div>
                  <div style={{ position: "absolute", inset: 0, opacity: w }}><WebflowChrome row={sel.rowWebflow} cls={sel.cls} /></div>
                </div>
              </div>
              <div style={{ position: "absolute", left: 0, top: TOP, width: SIDE, height: APP_H - TOP, overflow: "hidden", transform: `translateX(${-SIDE * 1.05 * e}px)` }}>
                <div style={{ position: "absolute", left: 0, top: -TOP, width: APP_W, height: APP_H }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - w }}><FigmaChrome row={sel.rowFigma} /></div>
                  <div style={{ position: "absolute", inset: 0, opacity: w }}><WebflowChrome row={sel.rowWebflow} cls={sel.cls} /></div>
                </div>
              </div>
              <div style={{ position: "absolute", right: 0, top: TOP, width: SIDE, height: APP_H - TOP, overflow: "hidden", transform: `translateX(${SIDE * 1.05 * e}px)` }}>
                <div style={{ position: "absolute", right: 0, top: -TOP, width: APP_W, height: APP_H }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - w }}><FigmaChrome row={sel.rowFigma} /></div>
                  <div style={{ position: "absolute", inset: 0, opacity: w }}><WebflowChrome row={sel.rowWebflow} cls={sel.cls} /></div>
                </div>
              </div>
            </div>

            {/* glass reflection */}
            <AbsoluteFill style={{ background: `linear-gradient(${115 + rotY}deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0) 60%)`, pointerEvents: "none" }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
