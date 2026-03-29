import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "900"], subsets: ["latin"] });

export const Scene4Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoSpring = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 100 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.3, 1]);
  const logoOp = interpolate(logoSpring, [0, 1], [0, 1]);

  // Title
  const titleSpring = spring({ frame: frame - 20, fps, config: { damping: 18 } });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  // Tagline
  const tagSpring = spring({ frame: frame - 35, fps, config: { damping: 20 } });
  const tagOp = interpolate(tagSpring, [0, 1], [0, 1]);

  // SevenDevX
  const devSpring = spring({ frame: frame - 50, fps, config: { damping: 25 } });
  const devOp = interpolate(devSpring, [0, 1], [0, 1]);

  // Fade out at end
  const fadeOut = interpolate(frame, [120, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Glow
  const glowSize = interpolate(frame, [0, 80], [300, 500], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily, opacity: fadeOut }}>
      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          opacity: logoOp,
          boxShadow: "0 0 60px rgba(124,58,237,0.4)",
          marginBottom: 30,
        }}
      >
        <span style={{ color: "white", fontSize: 40, fontWeight: 900 }}>P</span>
      </div>

      {/* Title */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 56, fontWeight: 900, color: "white", letterSpacing: -2 }}>Psico</span>
        <span
          style={{
            fontSize: 56,
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

      {/* Tagline */}
      <div style={{ opacity: tagOp, marginBottom: 60 }}>
        <span style={{ fontSize: 22, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>
          Tecnologia que transforma a psicologia
        </span>
      </div>

      {/* SevenDevX */}
      <div
        style={{
          opacity: devOp,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.15)" }} />
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", letterSpacing: 4, textTransform: "uppercase" }}>
          SevenDevX
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          Tecnologia que impulsiona negócios
        </span>
      </div>
    </AbsoluteFill>
  );
};
