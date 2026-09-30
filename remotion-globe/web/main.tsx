import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { DeviceShowcase } from "../src/DeviceShowcase";
import { FRAMES } from "../src/timeline";

// Scroll drives the animation. The displayed progress chases the scroll position with
// inertia (like Lenis smooth scrolling), so fast or jerky wheel input still glides.
const ScrollShowcase: React.FC = () => {
  const player = useRef<PlayerRef>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current = 0;
    let shown = -1;
    let last = performance.now();
    let raf = 0;
    // measure once (and on resize) instead of every frame, to avoid forced layout
    let top = 0, total = 1;
    const measureTrack = () => { if (track.current) { top = track.current.offsetTop; total = track.current.offsetHeight - window.innerHeight; } };
    measureTrack();
    window.addEventListener("resize", measureTrack);
    const tick = (now: number) => {
      if (player.current) {
        const target = Math.min(1, Math.max(0, (window.scrollY - top) / total));
        const dt = Math.min(64, now - last);
        const k = 1 - Math.pow(1 - 0.09, dt / 16.67); // frame-rate independent easing
        current += (target - current) * k;
        if (Math.abs(target - current) < 0.00005) current = target;
        const frame = Math.round(current * (FRAMES - 1));
        if (frame !== shown) {
          shown = frame; // only re-render when the frame actually changes
          player.current.seekTo(frame);
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", measureTrack); };
  }, []);

  return (
    <div ref={track} style={{ height: "520vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#E9EBEF", overflow: "hidden" }}>
        <Player
          ref={player}
          component={DeviceShowcase}
          inputProps={{ mode: "scroll" as const }}
          durationInFrames={FRAMES}
          fps={60}
          compositionWidth={1920}
          compositionHeight={1080}
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          style={{ width: "min(100vw, calc(100vh * 16 / 9))", aspectRatio: "16 / 9" }}
        />
      </div>
    </div>
  );
};

const Intro: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <section style={{ minHeight: "70vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8vw", background: "#0F1729", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
    <div style={{ fontSize: 14, letterSpacing: 4, textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>Renesource · Case study</div>
    <h1 style={{ fontSize: "clamp(40px, 6vw, 88px)", lineHeight: 1.05, margin: 0, letterSpacing: -2, fontWeight: 700 }}>{title}</h1>
    <p style={{ fontSize: 20, opacity: 0.7, marginTop: 22, maxWidth: 640 }}>{sub}</p>
  </section>
);

createRoot(document.getElementById("root")!).render(
  <>
    <Intro title="From Figma wireframe to live Webflow build" sub="Scroll down. The section below builds itself as you scroll, and reverses when you scroll back up." />
    <ScrollShowcase />
    <Intro title="End of demo" sub="Scroll back up to watch it deconstruct." />
  </>
);
