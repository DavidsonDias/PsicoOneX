import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const MockDashboard: React.FC<{ opacity: number; scale: number; y: number }> = ({ opacity, scale, y }) => (
  <div
    style={{
      width: 920,
      transform: `translateY(${y}px) scale(${scale})`,
      opacity,
      background: "linear-gradient(180deg, #0f0f1a 0%, #12122a 100%)",
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.08)",
      padding: 28,
      boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.1)",
    }}
  >
    {/* Top bar */}
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {[["#ff5f57", 10], ["#ffbd2e", 10], ["#28ca42", 10]].map(([c, s], i) => (
        <div key={i} style={{ width: Number(s), height: Number(s), borderRadius: "50%", background: String(c) }} />
      ))}
      <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5, marginLeft: 12 }} />
    </div>

    {/* Sidebar + Content */}
    <div style={{ display: "flex", gap: 16 }}>
      {/* Sidebar */}
      <div style={{ width: 160, display: "flex", flexDirection: "column", gap: 8 }}>
        {["Dashboard", "Pacientes", "Agenda", "Prontuário", "Financeiro", "IA Clínica"].map((item, i) => (
          <div
            key={i}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: i === 0 ? "rgba(124,58,237,0.15)" : "transparent",
              border: i === 0 ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
              fontSize: 13,
              color: i === 0 ? "#a78bfa" : "rgba(255,255,255,0.4)",
              fontWeight: i === 0 ? 600 : 400,
              fontFamily,
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Metric cards */}
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Pacientes", value: "127", color: "#7c3aed" },
            { label: "Sessões", value: "48", color: "#3b82f6" },
            { label: "Receita", value: "R$ 24.5k", color: "#10b981" },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "16px 14px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div
          style={{
            height: 140,
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "flex-end",
            padding: "14px 18px",
            gap: 6,
          }}
        >
          {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: 4,
                background: `linear-gradient(180deg, rgba(124,58,237,0.8) 0%, rgba(59,130,246,0.4) 100%)`,
              }}
            />
          ))}
        </div>

        {/* Appointment list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { name: "Ana Beatriz", time: "09:00", status: "#10b981" },
            { name: "Carlos Mendes", time: "10:30", status: "#3b82f6" },
            { name: "Julia Santos", time: "14:00", status: "#f59e0b" },
          ].map((apt, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: apt.status }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily, flex: 1 }}>{apt.name}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily }}>{apt.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MockAgenda: React.FC<{ opacity: number; x: number; rotate: number }> = ({ opacity, x, rotate }) => (
  <div
    style={{
      width: 380,
      opacity,
      transform: `translateX(${x}px) rotate(${rotate}deg)`,
      background: "linear-gradient(180deg, #0f0f1a 0%, #12122a 100%)",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      padding: 20,
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    }}
  >
    <div style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily, marginBottom: 14 }}>📅 Agenda Semanal</div>
    {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily }}>{d}</div>
        <div style={{ flex: 1, height: 28, borderRadius: 8, background: `rgba(124,58,237,${0.1 + i * 0.05})`, display: "flex", alignItems: "center", paddingLeft: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily }}>{3 + i} sessões</span>
        </div>
      </div>
    ))}
  </div>
);

const MockAI: React.FC<{ opacity: number; x: number; rotate: number }> = ({ opacity, x, rotate }) => (
  <div
    style={{
      width: 380,
      opacity,
      transform: `translateX(${x}px) rotate(${rotate}deg)`,
      background: "linear-gradient(180deg, #0f0f1a 0%, #12122a 100%)",
      borderRadius: 16,
      border: "1px solid rgba(124,58,237,0.2)",
      padding: 20,
      boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(124,58,237,0.1)",
    }}
  >
    <div style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily, marginBottom: 14 }}>🧠 Assistente IA</div>
    <div style={{ padding: 12, borderRadius: 10, background: "rgba(124,58,237,0.08)", marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily }}>Sugestão clínica baseada no histórico do paciente...</span>
    </div>
    <div style={{ padding: 12, borderRadius: 10, background: "rgba(59,130,246,0.08)" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily }}>Relatório de evolução gerado automaticamente</span>
    </div>
  </div>
);

export const Scene2Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dashboard entrance
  const dashSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const dashY = interpolate(dashSpring, [0, 1], [200, 60]);
  const dashScale = interpolate(dashSpring, [0, 1], [0.85, 0.95]);
  const dashOp = interpolate(dashSpring, [0, 1], [0, 1]);

  // Slow scroll up effect on dashboard
  const scrollY = interpolate(frame, [60, 300], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Floating card 1 (agenda) - appears at frame 90
  const card1Spring = spring({ frame: frame - 90, fps, config: { damping: 15 } });
  const card1X = interpolate(card1Spring, [0, 1], [300, 0]);
  const card1Op = interpolate(card1Spring, [0, 1], [0, 1]);

  // Floating card 2 (AI) - appears at frame 180
  const card2Spring = spring({ frame: frame - 180, fps, config: { damping: 15 } });
  const card2X = interpolate(card2Spring, [0, 1], [-300, 0]);
  const card2Op = interpolate(card2Spring, [0, 1], [0, 1]);

  // Gentle float motion
  const floatY = Math.sin(frame * 0.03) * 8;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Label */}
      <Sequence from={0} durationInFrames={60}>
        <div
          style={{
            position: "absolute",
            top: 80,
            opacity: interpolate(frame, [0, 15, 45, 60], [0, 1, 1, 0], { extrapolateRight: "clamp" }),
            fontFamily,
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Sistema em ação
        </div>
      </Sequence>

      {/* Main dashboard */}
      <div style={{ transform: `translateY(${scrollY}px)` }}>
        <MockDashboard opacity={dashOp} scale={dashScale} y={dashY} />
      </div>

      {/* Floating agenda card */}
      <div style={{ position: "absolute", right: 40, top: 350 + floatY }}>
        <MockAgenda opacity={card1Op} x={card1X} rotate={-3} />
      </div>

      {/* Floating AI card */}
      <div style={{ position: "absolute", left: 40, bottom: 200 + floatY * -1 }}>
        <MockAI opacity={card2Op} x={card2X} rotate={2} />
      </div>
    </AbsoluteFill>
  );
};
