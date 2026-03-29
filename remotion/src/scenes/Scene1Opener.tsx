import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });

export const Scene1Opener: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo line animation
  const lineWidth = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const lineW = interpolate(lineWidth, [0, 1], [0, 200]);

  // Title entrance
  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 100 } });
  const titleY = interpolate(titleSpring, [0, 1], [80, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle entrance
  const subSpring = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 80 } });
  const subY = interpolate(subSpring, [0, 1], [40, 0]);
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  // Tagline
  const tagSpring = spring({ frame: frame - 40, fps, config: { damping: 25 } });
  const tagOpacity = interpolate(tagSpring, [0, 1], [0, 1]);

  // Glow pulse
  const glowPulse = interpolate(frame, [0, 60, 105], [0, 1, 0.7]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(250, 90%, 60%, 0.2) 0%, transparent 70%)",
          opacity: glowPulse,
          filter: "blur(40px)",
        }}
      />

      {/* Decorative line */}
      <div
        style={{
          width: lineW,
          height: 3,
          background: "linear-gradient(90deg, transparent, #7c3aed, transparent)",
          borderRadius: 2,
          marginBottom: 40,
        }}
      />

      {/* Logo mark */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${interpolate(titleSpring, [0, 1], [0.5, 1])})`,
          opacity: titleOpacity,
          boxShadow: "0 0 40px rgba(124, 58, 237, 0.4)",
        }}
      >
        <span style={{ color: "white", fontSize: 32, fontWeight: 900 }}>P</span>
      </div>

      {/* Title */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "white",
            letterSpacing: -2,
          }}
        >
          Psico
        </span>
        <span
          style={{
            fontSize: 72,
            fontWeight: 900,
            background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -2,
          }}
        >
          One
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          marginTop: 16,
        }}
      >
        <span
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 400,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Gestão Clínica Inteligente
        </span>
      </div>

      {/* Tagline line */}
      <div
        style={{
          marginTop: 40,
          opacity: tagOpacity,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ width: 30, height: 1, background: "rgba(255,255,255,0.3)" }} />
        <span style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>
          by SevenDevX
        </span>
        <div style={{ width: 30, height: 1, background: "rgba(255,255,255,0.3)" }} />
      </div>
    </AbsoluteFill>
  );
};
