import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mic, Loader2, Square, SlidersHorizontal, MoonStar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLiveDictation } from "@/hooks/useLiveDictation";

interface VoiceRecorderProps {
  /** Recebe cada trecho transcrito (streaming) — grave imediatamente para não perder nada */
  onTranscript: (text: string, live?: boolean) => void;
  disabled?: boolean;
}


function polish(raw: string): string {
  let text = raw.trim().replace(/\s{2,}/g, " ");
  if (!text) return "";
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?]$/.test(text)) text += ".";
  return text;
}

const SENSITIVITY_LABELS: Array<{ max: number; label: string }> = [
  { max: 1.2, label: "Baixa" },
  { max: 2.6, label: "Normal" },
  { max: 4.2, label: "Alta" },
  { max: 6, label: "Máxima" },
];

export function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [finishing, setFinishing] = useState(false);

  const dictation = useLiveDictation({
    language: "pt",
    onError: (msg) => toast.error(msg),
    // Streaming: cada trecho já entra no prontuário/rascunho
    onSegment: (chunk) => {
      const piece = polish(chunk);
      if (piece) onTranscript(piece, true);
    },
  });

  const { isRecording, isTranscribing, level, text, gain, setGain, inBackground } = dictation;

  const sensitivityLabel =
    SENSITIVITY_LABELS.find((s) => gain <= s.max)?.label ?? "Personalizada";

  const handleStart = useCallback(async () => {
    const ok = await dictation.start();
    if (ok) {
      toast.info("🎙️ Gravando. O texto entra no prontuário em tempo real.");
    }
  }, [dictation]);

  const handleStop = useCallback(async () => {
    setFinishing(true);
    try {
      const result = await dictation.stop();
      if (result.trim()) {
        toast.success("Transcrição concluída e salva no prontuário.");
      } else {
        toast.info("Nenhuma fala foi reconhecida.");
      }
      dictation.reset();
    } finally {
      setFinishing(false);
    }
  }, [dictation]);


  const handleCancel = useCallback(async () => {
    await dictation.cancel();
    toast.info("Gravação cancelada");
  }, [dictation]);

  const sensitivityControl = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Sensibilidade do microfone"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Sensibilidade do microfone</p>
          <p className="text-xs text-muted-foreground">
            Aumente para captar voz baixa sem precisar falar alto.
          </p>
        </div>
        <Slider
          value={[gain]}
          min={0.5}
          max={6}
          step={0.1}
          onValueChange={([v]) => setGain(v)}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{sensitivityLabel}</span>
          <span>{gain.toFixed(1)}x</span>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (finishing) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Finalizando transcrição...
      </Button>
    );
  }

  if (isRecording) {
    return (
      <div className="w-full space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="destructive" size="sm" onClick={handleStop} className="gap-2">
            <Square className="h-3 w-3 fill-current" />
            Parar e inserir
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            Cancelar
          </Button>

          {/* Medidor de nível de voz */}
          <div className="flex items-end gap-0.5" aria-hidden>
            {[...Array(6)].map((_, i) => {
              const active = level > (i + 1) / 7;
              return (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-100",
                    active ? "bg-destructive" : "bg-destructive/20"
                  )}
                  style={{ height: `${8 + i * 3}px` }}
                />
              );
            })}
          </div>

          <span className="text-xs font-medium text-destructive">Gravando</span>
          {isTranscribing && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              transcrevendo
            </span>
          )}
          {inBackground && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MoonStar className="h-3 w-3" />
              em segundo plano
            </span>
          )}
          <div className="ml-auto">{sensitivityControl}</div>
        </div>

        {text ? (
          <p className="max-h-24 overflow-y-auto text-xs leading-relaxed text-foreground/80">{text}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Fale normalmente — a transcrição aparece a cada poucos segundos.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleStart}
        disabled={disabled}
        className="gap-2"
        title="Gravar voz (transcrição automática)"
      >
        <Mic className="h-4 w-4" />
        <span className="hidden sm:inline">Voz</span>
      </Button>
      {sensitivityControl}
    </div>
  );
}
