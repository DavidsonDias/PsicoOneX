import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "800"], subsets: ["latin"] });

const highlights = [
  { icon: "🧠", title: "IA Clínica", desc: "Assistente inteligente para cada sessão" },
  { icon: "📊", title: "Gestão Total", desc: "Agenda, financeiro e prontuários" },
  { icon: "🔒", title: "Segurança", desc: "Dados protegidos e criptografados" },
];

export const Scene3Highlights: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily }}>
      {/* Section title */}
      <div
        style={{
          position: "absolute",
          top: 280,
          opacity: interpolate(spring({ frame, fps, config: { damping: 20 } }), [0, 1], [0, 1]),
          transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 20 } }), [0, 1], [30, 0])}px)`,
        }}
      >
        <span style={{ fontSize: 18, color: "#7c3aed", fontWeight: 600, letterSpacing: 3, textTransform: "uppercase" }}>
          Por que PsicoOne?
        </span>
      </div>

      {/* Highlight cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 40 }}>
        {highlights.map((h, i) => {
          const s = spring({ frame: frame - (i * 12 + 15), fps, config: { damping: 14, stiffness: 120 } });
          const y = interpolate(s, [0, 1], [60, 0]);
          const op = interpolate(s, [0, 1], [0, 1]);
          const sc = interpolate(s, [0, 1], [0.9, 1]);

          return (
            <div
              key={i}
              style={{
                transform: `translateY(${y}px) scale(${sc})`,
                opacity: op,
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "24px 32px",
                width: 700,
                borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.1))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  flexShrink: 0,
                }}
              >
                {h.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>{h.title}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{h.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
