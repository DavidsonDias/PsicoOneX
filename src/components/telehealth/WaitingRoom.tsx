import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, Clock, Wifi, Video } from "lucide-react";

interface WaitingRoomProps {
  patientName: string;
  psychologistName?: string;
  onCancel?: () => void;
}

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TIPS = [
  "Verifique se sua câmera e microfone estão funcionando.",
  "Prefira um ambiente silencioso e bem iluminado.",
  "Use fone de ouvido para uma melhor qualidade de áudio.",
  "Sua conexão é criptografada e segura (LGPD).",
];

export function WaitingRoom({ patientName, psychologistName, onCancel }: WaitingRoomProps) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    const tipRotate = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 5000);
    return () => {
      clearInterval(tick);
      clearInterval(tipRotate);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden">
        {/* Animated background glow */}
        <motion.div
          aria-hidden
          className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Pulsing video icon */}
        <div className="relative mx-auto h-24 w-24 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
          <div className="relative h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Video className="h-9 w-9 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-2 relative">
          <h2 className="text-2xl font-bold">Aguardando o profissional</h2>
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{patientName}</span>!
            {psychologistName ? (
              <>
                {" "}A sessão com{" "}
                <span className="font-medium text-foreground">{psychologistName}</span>{" "}
                começará em instantes.
              </>
            ) : (
              " A sessão começará em instantes."
            )}
          </p>
        </div>

        {/* Live elapsed counter */}
        <div className="relative flex items-center justify-center gap-2 py-3 px-4 bg-muted/40 rounded-lg">
          <Clock className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">Tempo de espera:</span>
          <span className="text-base font-mono font-bold tabular-nums">{formatElapsed(elapsed)}</span>
        </div>

        {/* Status indicators */}
        <div className="relative flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <Wifi className="h-3 w-3" />
            Conectado
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-green-500" />
            Sala segura
          </span>
        </div>

        {/* Rotating tip */}
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-xs text-muted-foreground bg-primary/5 rounded-lg p-3 flex items-start gap-2 text-left"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>{TIPS[tipIndex]}</span>
        </motion.div>

        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="relative text-muted-foreground">
            Sair da sala
          </Button>
        )}
      </Card>
    </div>
  );
}
