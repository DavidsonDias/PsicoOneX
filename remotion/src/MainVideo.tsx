import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Opener } from "./scenes/Scene1Opener";
import { Scene2Demo } from "./scenes/Scene2Demo";
import { Scene3Highlights } from "./scenes/Scene3Highlights";
import { Scene4Closing } from "./scenes/Scene4Closing";
import { PersistentBackground } from "./components/PersistentBackground";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <TransitionSeries>
        {/* Scene 1: Opener - 0s to 3s (90 frames) */}
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene1Opener />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        {/* Scene 2: Demo - 3s to 15s (360 frames) */}
        <TransitionSeries.Sequence durationInFrames={375}>
          <Scene2Demo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        {/* Scene 3: Highlights - 15s to 20s (150 frames) */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <Scene3Highlights />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        {/* Scene 4: Closing - 20s to 25s (150 frames) */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
