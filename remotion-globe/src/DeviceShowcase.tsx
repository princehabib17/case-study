import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { Section } from "./Section";
import { FONT } from "./theme";
import { PHASE, buildFrame, devicePose, lerp, selection, smooth, videoProgress, win } from "./timeline";

export type ShowcaseProps = {
  /** "video": time drives progress, with eased ends. "scroll": frame = scroll progress, linear. */
  mode: "video" | "scroll";
};

const APP_W = 1600;
const APP_H = 1000;
const TOP = 44;
const SIDE = 260;
const RAIL = 40;

const FIGMA_BLUE = "#0D99FF";
const WEBFLOW_BLUE = "#146EF5";

// Colours of the one editor shell, light (Figma) → dark (Webflow)
const shell = (m: number) => ({
  panel: interpolateColors(m, [0, 1], ["#FFFFFF", "#2B2B2B"]),
  line: interpolateColors(m, [0, 1], ["#E6E6E6", "#3A3A3A"]),
  text: interpolateColors(m, [0, 1], ["#1E1E1E", "#EBEBEB"]),
  dim: interpolateColors(m, [0, 1], ["#8C8C8C", "#A3A3A3"]),
  field: interpolateColors(m, [0, 1], ["#F5F5F5", "#1E1E1E"]),
  accent: interpolateColors(m, [0, 1], [FIGMA_BLUE, WEBFLOW_BLUE]),
  highlight: interpolateColors(m, [0, 1], ["rgba(13,153,255,0.13)", "rgba(20,110,245,0.24)"]),
});
type Shell = ReturnType<typeof shell>;

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------
const Txt: React.FC<{ c: string; s?: number; w?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ c, s = 13, w = 500, style, children }) => (
  <div style={{ fontFamily: FONT, fontSize: s, fontWeight: w, color: c, whiteSpace: "nowrap", ...style }}>{children}</div>
);
const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 8, style }) => (
  <div style={{ display: "flex", gap, alignItems: "center", ...style }}>{children}</div>
);
const Field: React.FC<{ k: Shell; label: string; value: string }> = ({ k, label, value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 10px", borderRadius: 6, background: k.field, flex: 1 }}>
    <Txt c={k.dim} s={12}>{label}</Txt>
    <Txt c={k.text} s={12.5}>{value}</Txt>
  </div>
);
/** crossfade two contents in place with a small vertical drift, so swaps feel like a morph */
// Staged: the old content clears in the first half, the new one settles in the second half,
// so the two never sit on top of each other as ghosted double text.
const Swap: React.FC<{ m: number; a: React.ReactNode; b: React.ReactNode; style?: React.CSSProperties }> = ({ m, a, b, style }) => {
  const out = smooth(m / 0.45);
  const inn = smooth((m - 0.55) / 0.45);
  return (
    <div style={{ position: "relative", ...style }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `translateY(${-8 * out}px)` }}>{a}</div>
      <div style={{ position: "absolute", inset: 0, opacity: inn, transform: `translateY(${8 * (1 - inn)}px)` }}>{b}</div>
    </div>
  );
};

const FIGMA_LAYERS = ["Global Footprint", "Eyebrow", "H1 — Headline", "Body copy", "Globe", "Stat cards"];
const NAV = ["Body", "Section · global-footprint", "Div · eyebrow", "H1 · heading-xl", "Div · body-lg", "Embed · globe-embed", "Grid · stat-card"];

// ---------------------------------------------------------------------------
// One editor shell that morphs Figma → Webflow
// ---------------------------------------------------------------------------
const TopBar: React.FC<{ k: Shell; m: number }> = ({ k, m }) => (
  <div style={{ position: "absolute", inset: 0, background: k.panel, borderBottom: `1px solid ${k.line}` }}>
    <Swap
      m={m}
      style={{ position: "absolute", left: 14, top: 0, width: 520, height: TOP }}
      a={
        <Row gap={18} style={{ height: TOP }}>
          <Txt c={k.text} s={17} w={700}>≡</Txt>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke={k.text} strokeWidth={1.6}><path d="M4 3 L15 10 L10 11 L8 16 Z" /></svg>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke={k.text} strokeWidth={1.6}><path d="M6 2 V18 M14 2 V18 M2 6 H18 M2 14 H18" /></svg>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke={k.text} strokeWidth={1.6}><rect x="3" y="4" width="14" height="12" rx="1" /></svg>
          <Txt c={k.text} s={16} w={600}>T</Txt>
        </Row>
      }
      b={
        <Row gap={16} style={{ height: TOP }}>
          <Txt c={k.text} s={14} w={700}>Webflow</Txt>
          <div style={{ width: 1, height: 20, background: k.line }} />
          <Txt c={k.dim}>Page:</Txt>
          <Txt c={k.text} w={600}>Projects Template ▾</Txt>
        </Row>
      }
    />
    <Swap
      m={m}
      style={{ position: "absolute", left: APP_W / 2 - 170, top: 0, width: 340, height: TOP }}
      a={<Row gap={6} style={{ height: TOP, justifyContent: "center" }}><Txt c={k.dim}>Renesource /</Txt><Txt c={k.text} w={600}>Case Study — Wireframes</Txt></Row>}
      b={
        <Row gap={14} style={{ height: TOP, justifyContent: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <svg key={i} width={20} height={18} viewBox="0 0 20 18" fill="none" stroke={i === 0 ? k.accent : k.dim} strokeWidth={1.6}>
              {i === 0 ? <><rect x="1" y="2" width="18" height="11" rx="1" /><path d="M7 16 H13" /></> : <rect x={3 + i * 1.5} y="1" width={14 - i * 3} height="16" rx="2" />}
            </svg>
          ))}
          <Txt c={k.dim} s={12.5}>1920 px</Txt>
        </Row>
      }
    />
    <Row gap={12} style={{ position: "absolute", right: 14, top: 0, height: TOP }}>
      <div style={{ width: 26, height: 26, borderRadius: 13, background: interpolateColors(m, [0, 1], ["#9747FF", "#5E5E5E"]) }} />
      <div style={{ padding: "6px 14px", borderRadius: lerp(6, 4, m), background: interpolateColors(m, [0, 1], [FIGMA_BLUE, "#3F3F3F"]) }}><Txt c="#FFFFFF" w={600}>Share</Txt></div>
      {/* Publish grows out of the zoom label */}
      <div style={{ position: "relative", width: lerp(40, 82, m), height: 28 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", opacity: 1 - smooth(m / 0.45) }}><Txt c={k.text}>52%</Txt></div>
        <div style={{ position: "absolute", inset: 0, borderRadius: 4, background: WEBFLOW_BLUE, opacity: smooth((m - 0.55) / 0.45), display: "flex", alignItems: "center", justifyContent: "center" }}><Txt c="#FFFFFF" w={600}>Publish</Txt></div>
      </div>
    </Row>
  </div>
);

const LeftPanel: React.FC<{ k: Shell; m: number; rowF: number; rowW: number }> = ({ k, m, rowF, rowW }) => {
  const rail = RAIL * m; // icon rail slides in as Figma becomes Webflow
  const rowTopF = 84;
  const rowTopW = 50;
  const hlY = lerp(rowTopF + rowF * 30, rowTopW + rowW * 30, m);
  return (
    <div style={{ position: "absolute", inset: 0, background: k.panel, borderRight: `1px solid ${k.line}`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: rail, borderRight: m > 0.02 ? `1px solid ${k.line}` : "none", overflow: "hidden" }}>
        <div style={{ width: RAIL, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, gap: 18, opacity: m }}>
          {["+", "≡", "▭", "◎", "▣"].map((g, i) => <Txt key={g} c={i === 1 ? k.accent : k.dim} s={16} w={700}>{g}</Txt>)}
        </div>
      </div>
      <div style={{ position: "absolute", left: rail, top: 0, right: 0, bottom: 0 }}>
        {/* shared highlight bar glides between the two lists */}
        <div style={{ position: "absolute", left: lerp(6, 0, m), right: lerp(6, 0, m), top: hlY, height: 30, borderRadius: lerp(6, 0, m), background: k.highlight, borderLeft: `${2 * m}px solid ${k.accent}` }} />
        <Swap
          m={m}
          style={{ position: "absolute", inset: 0 }}
          a={
            <>
              <Row gap={16} style={{ padding: "14px 16px", borderBottom: `1px solid ${k.line}` }}><Txt c={k.text} w={600}>File</Txt><Txt c={k.dim}>Assets</Txt></Row>
              <Txt c={k.dim} s={12} w={600} style={{ padding: "12px 16px 7px" }}>Layers</Txt>
              {FIGMA_LAYERS.map((name, i) => (
                <Row key={name} gap={10} style={{ height: 30, paddingLeft: i === 0 ? 16 : 36 }}>
                  <Txt c={k.dim} s={12} w={700}>{i === 0 ? "#" : i === 4 ? "◯" : i === 5 ? "▦" : "T"}</Txt>
                  <Txt c={k.text} s={12.5} w={i === 0 ? 600 : 500}>{name}</Txt>
                </Row>
              ))}
            </>
          }
          b={
            <>
              <Txt c={k.text} s={12.5} w={600} style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${k.line}` }}>Navigator</Txt>
              <div style={{ height: 6 }} />
              {NAV.map((name, i) => (
                <Row key={name} gap={8} style={{ height: 30, paddingLeft: 12 + Math.min(i, 2) * 12 }}>
                  <div style={{ width: 11, height: 11, border: `1.5px solid ${k.dim}`, borderRadius: i === 5 ? 6 : 2 }} />
                  <Txt c={k.text} s={12}>{name}</Txt>
                </Row>
              ))}
            </>
          }
        />
      </div>
    </div>
  );
};

const RightPanel: React.FC<{ k: Shell; m: number; cls: string }> = ({ k, m, cls }) => (
  <div style={{ position: "absolute", inset: 0, background: k.panel, borderLeft: `1px solid ${k.line}`, padding: 14, boxSizing: "border-box" }}>
    <Swap
      m={m}
      style={{ height: 34, marginBottom: 14, borderBottom: `1px solid ${k.line}` }}
      a={<Row gap={16}><Txt c={k.text} w={600}>Design</Txt><Txt c={k.dim}>Prototype</Txt></Row>}
      b={<Row gap={16}><Txt c={k.text} w={600}>Style</Txt><Txt c={k.dim}>Settings</Txt><Txt c={k.dim}>Interactions</Txt></Row>}
    />
    <Swap
      m={m}
      style={{ height: 820 }}
      a={
        <>
          <Txt c={k.text} s={12} w={600} style={{ marginBottom: 10 }}>Frame</Txt>
          <Row style={{ marginBottom: 8 }}><Field k={k} label="W" value="1920" /><Field k={k} label="H" value="1080" /></Row>
          <Row style={{ marginBottom: 22 }}><Field k={k} label="X" value="0" /><Field k={k} label="Y" value="0" /></Row>
          <Txt c={k.text} s={12} w={600} style={{ marginBottom: 10 }}>Auto layout</Txt>
          <Row style={{ marginBottom: 22 }}><Field k={k} label="↔" value="64" /><Field k={k} label="↕" value="80" /></Row>
          <Txt c={k.text} s={12} w={600} style={{ marginBottom: 10 }}>Fill</Txt>
          <Row style={{ marginBottom: 22 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: "#FFFFFF", border: `1px solid ${k.line}` }} />
            <Txt c={k.text} s={12.5}>FFFFFF</Txt>
            <Txt c={k.dim} s={12.5}>100%</Txt>
          </Row>
          {["Stroke", "Effects", "Export"].map((h) => (
            <Row key={h} style={{ justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${k.line}` }}><Txt c={k.text} s={12} w={600}>{h}</Txt><Txt c={k.dim} s={16}>+</Txt></Row>
          ))}
        </>
      }
      b={
        <>
          <Txt c={k.dim} s={12} style={{ marginBottom: 8 }}>Style selector</Txt>
          <div style={{ height: 32, borderRadius: 4, background: k.field, display: "flex", alignItems: "center", padding: "0 6px", marginBottom: 20 }}>
            <div style={{ padding: "3px 8px", borderRadius: 3, background: WEBFLOW_BLUE }}><Txt c="#FFFFFF" s={12} w={600}>{cls}</Txt></div>
          </div>
          <Txt c={k.text} s={12} w={600} style={{ marginBottom: 10 }}>Layout</Txt>
          <Row gap={0} style={{ marginBottom: 20, borderRadius: 4, overflow: "hidden" }}>
            {["Block", "Flex", "Grid", "None"].map((d, i) => (
              <div key={d} style={{ flex: 1, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: i === 1 ? "#3F3F3F" : k.field }}><Txt c={i === 1 ? k.text : k.dim} s={11.5}>{d}</Txt></div>
            ))}
          </Row>
          <Txt c={k.text} s={12} w={600} style={{ marginBottom: 10 }}>Spacing</Txt>
          <div style={{ position: "relative", height: 120, borderRadius: 4, background: k.field, marginBottom: 20 }}>
            <div style={{ position: "absolute", inset: 26, border: `1px dashed ${k.dim}`, borderRadius: 3 }} />
            <div style={{ position: "absolute", inset: 52, background: "#3F3F3F", borderRadius: 2 }} />
            <Txt c={k.dim} s={11} style={{ position: "absolute", top: 7, left: "50%", transform: "translateX(-50%)" }}>80</Txt>
            <Txt c={k.dim} s={11} style={{ position: "absolute", top: 52, left: 7 }}>64</Txt>
            <Txt c={k.dim} s={11} style={{ position: "absolute", top: 52, right: 7 }}>64</Txt>
          </div>
          <Txt c={k.text} s={12} w={600} style={{ marginBottom: 10 }}>Typography</Txt>
          <Row style={{ marginBottom: 8 }}><Field k={k} label="Font" value="Plus Jakarta Sans" /></Row>
          <Row style={{ marginBottom: 8 }}><Field k={k} label="Weight" value="700" /><Field k={k} label="Size" value="86" /></Row>
          <Row><Field k={k} label="Color" value="#0F1729" /></Row>
        </>
      }
    />
  </div>
);

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------
export const DeviceShowcase: React.FC<ShowcaseProps> = ({ mode }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);

  const u = mode === "video" ? videoProgress(frame, durationInFrames) : frame / (durationInFrames - 1);

  const f = buildFrame(u);
  const m = win(u, PHASE.morph[0], PHASE.morph[1]); // Figma → Webflow
  const e = win(u, PHASE.panelsOut[0], PHASE.panelsOut[1]); // panels out
  const k = shell(smooth(m)); // colours pass through their grey midpoint quickly
  const sel = selection(u);
  const pose = devicePose(u);
  const intro = mode === "video" ? win(u, 0, 0.05) : 1;

  // design frame placement inside the screen
  const sEditor = (APP_W - 2 * SIDE - 80) / 1920;
  const sFinal = APP_W / 1920;
  const scale = lerp(sEditor, sFinal, e);
  const frameLeft = lerp(SIDE + 40, 0, e);
  const frameTop = lerp(TOP + (APP_H - TOP - 1080 * sEditor) / 2 + 10, (APP_H - 1080 * sFinal) / 2, e);
  // whiten early in the panel exit so the canvas never sits at a flat mid-grey
  const canvasBg = interpolateColors(smooth(e / 0.4), [0, 1], [interpolateColors(m, [0, 1], ["#F5F5F5", "#1E1E1E"]), "#FFFFFF"]);

  // stage captions crossfade continuously
  const cap = [
    { text: "Figma · Wireframe", dot: FIGMA_BLUE, o: 1 - win(u, 0.21, 0.25) },
    { text: "Webflow · Build", dot: WEBFLOW_BLUE, o: win(u, 0.26, 0.3) * (1 - win(u, 0.77, 0.81)) },
    { text: "Live website", dot: "#2E9E44", o: win(u, 0.82, 0.86) },
  ];

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, #FFFFFF 0%, #EEF0F3 55%, #E1E4E9 100%)", fontFamily: FONT, overflow: "hidden" }}>
      {cap.map((c) => (
        <div key={c.text} style={{ position: "absolute", top: 44, left: 60, display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: "#0F1729", opacity: c.o * intro, transform: `translateY(${(1 - c.o) * 8}px)` }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.dot }} />
          <Txt c="#FFFFFF" s={16} w={600}>{c.text}</Txt>
        </div>
      ))}

      {/* floor shadow follows the device */}
      <div style={{ position: "absolute", left: "50%", top: 540 + 470 * pose.scale, width: 1500 * pose.scale, height: 70, transform: `translate(-50%, -50%) translateX(${pose.rotY * 6}px)`, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(15,23,41,0.3), rgba(15,23,41,0))", opacity: intro }} />

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
            transform: `translateY(${pose.floatY + (1 - intro) * 90}px) scale(${pose.scale}) rotateX(${pose.rotX}deg) rotateY(${pose.rotY}deg) rotateZ(${pose.rotZ}deg)`,
            opacity: intro,
            position: "relative",
            willChange: "transform",
          }}
        >
          <div style={{ position: "absolute", top: 15, left: "50%", width: 8, height: 8, marginLeft: -4, borderRadius: 4, background: "#2A2D33", boxShadow: "inset 0 0 0 2px #0A0B0D" }} />

          <div style={{ position: "relative", width: APP_W, height: APP_H, borderRadius: 28, overflow: "hidden", background: canvasBg }}>
            <AbsoluteFill style={{ backgroundImage: "radial-gradient(#D5D8DD 1.3px, transparent 1.3px)", backgroundSize: "24px 24px", opacity: (1 - m) * (1 - e) }} />
            <Txt c="#8C8C8C" s={12.5} style={{ position: "absolute", left: frameLeft, top: frameTop - 22, opacity: (1 - m) * (1 - e) }}>Global Footprint — Desktop 1920</Txt>

            {/* the design */}
            <div style={{ position: "absolute", left: frameLeft, top: frameTop, width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "0 0", boxShadow: `0 ${12 / scale}px ${40 / scale}px rgba(0,0,0,${0.12 * (1 - e)})` }}>
              <Section f={f} />
              <div style={{ position: "absolute", left: sel.rect.x, top: sel.rect.y, width: sel.rect.w, height: sel.rect.h, border: `${2 / scale}px solid ${k.accent}`, opacity: sel.opacity, boxSizing: "border-box" }}>
                <div style={{ position: "absolute", top: -26 / scale, left: -2 / scale, background: k.accent, padding: `${3 / scale}px ${7 / scale}px`, borderRadius: 3 / scale }}>
                  <Txt c="#FFFFFF" s={11.5 / scale} w={600}>{sel.label}</Txt>
                </div>
                {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], j) => (
                  <div key={j} style={{ position: "absolute", left: `calc(${x * 100}% - ${4 / scale}px)`, top: `calc(${y * 100}% - ${4 / scale}px)`, width: 8 / scale, height: 8 / scale, background: "#FFFFFF", border: `${1.5 / scale}px solid ${k.accent}`, boxSizing: "border-box", opacity: 1 - m }} />
                ))}
              </div>
            </div>

            {/* editor shell, slides away at the end */}
            <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: TOP, transform: `translateY(${-TOP * 1.1 * e}px)` }}>
              <TopBar k={k} m={m} />
            </div>
            <div style={{ position: "absolute", left: 0, top: TOP, width: SIDE, height: APP_H - TOP, transform: `translateX(${-SIDE * 1.05 * e}px)` }}>
              <LeftPanel k={k} m={m} rowF={sel.rowFigma} rowW={sel.rowWebflow} />
            </div>
            <div style={{ position: "absolute", right: 0, top: TOP, width: SIDE, height: APP_H - TOP, transform: `translateX(${SIDE * 1.05 * e}px)` }}>
              <RightPanel k={k} m={m} cls={sel.cls} />
            </div>

            <AbsoluteFill style={{ background: `linear-gradient(${115 + pose.rotY}deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0) 60%)`, pointerEvents: "none" }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
