import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow rotating gradient
  const rotation = interpolate(frame, [0, 750], [0, 360]);
  const hueShift = interpolate(frame, [0, 750], [0, 30]);

  return (
    <AbsoluteFill>
      {/* Base dark background */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#050510",
        }}
      />
      {/* Animated gradient orb 1 */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, hsla(${245 + hueShift}, 80%, 40%, 0.3) 0%, transparent 70%)`,
          top: "10%",
          left: "-20%",
          transform: `rotate(${rotation}deg)`,
          filter: "blur(60px)",
        }}
      />
      {/* Animated gradient orb 2 */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, hsla(${280 + hueShift}, 70%, 35%, 0.25) 0%, transparent 70%)`,
          bottom: "5%",
          right: "-15%",
          transform: `rotate(${-rotation * 0.7}deg)`,
          filter: "blur(50px)",
        }}
      />
      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
};
