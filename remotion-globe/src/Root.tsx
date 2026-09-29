import React from "react";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { DeviceShowcase } from "./DeviceShowcase";
import { Section } from "./Section";

// Flat version of the section build, no device or editor chrome.
const SectionOnly: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Section f={frame / 2} />
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="DeviceShowcase" component={DeviceShowcase} durationInFrames={900} fps={60} width={1920} height={1080} />
    <Composition id="SectionOnly" component={SectionOnly} durationInFrames={720} fps={60} width={1920} height={1080} />
  </>
);
