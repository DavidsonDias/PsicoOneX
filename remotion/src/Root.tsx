import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 25 seconds at 30fps = 750 frames
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={750}
    fps={30}
    width={1080}
    height={1920}
  />
);
