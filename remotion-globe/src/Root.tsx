import React from "react";
import { Composition } from "remotion";
import { GlobeTransformation } from "./GlobeTransformation";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="GlobeTransformation"
    component={GlobeTransformation}
    durationInFrames={360}
    fps={30}
    width={1920}
    height={1080}
  />
);
