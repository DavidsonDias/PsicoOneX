import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Square, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "processing" | "error";

export function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [interimText, setInterimText] = useState("");
  const [committedPreview, setCommittedPreview] = useState("");

  const recognitionRef = useRef<any>(null);
  const committedSegmentsRef = useRef<string[]>([]);
  const lastFinalTranscriptRef = useRef("");
  const isStoppingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const activeSessionIdRef = useRef(0);

  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const isDuplicate = useCallback((newText: string): boolean => {
    if (!newText.trim()) return true;
    const last = lastFinalTranscriptRef.current;
    if (!last) return false;

    const normalize = (s: string) => s.toLowerCase().trim().replace(/[.,!?;:]+$/g, "");
    const a = normalize(newText);
    const b = normalize(last);

    // Exact match
    if (a === b) return true;

    // One contains the other (partial overlap from interim→final)
    if (a.includes(b) && a.length - b.length < 10) return false; // extended version is OK
    if (b.includes(a)) return true; // subset of last = duplicate

    return false;
  }, []);

  const createRecognition = useCallback((sessionId: number) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      // Guard: ignore events from old sessions
      if (sessionId !== activeSessionIdRef.current) return;

      // With continuous=false, process all results (usually just one)
      let currentInterim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          if (!isDuplicate(transcript)) {
            committedSegmentsRef.current.push(transcript);
            lastFinalTranscriptRef.current = transcript;
            setCommittedPreview(committedSegmentsRef.current.join(". "));
          }
          setInterimText("");
        } else {
          currentInterim = transcript;
        }
      }

      if (currentInterim) {
        setInterimText(currentInterim);
      }
    };

    recognition.onerror = (event: any) => {
      if (sessionId !== activeSessionIdRef.current) return;
      if (event.error === "no-speech" || event.error === "aborted") return;

      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Permissão de microfone negada. Verifique as configurações do navegador.");
        setState("error");
      } else {
        toast.error("Erro no reconhecimento de voz");
      }
      shouldRestartRef.current = false;
      setState("idle");
      setInterimText("");
    };

    recognition.onend = () => {
      if (sessionId !== activeSessionIdRef.current) return;

      if (shouldRestartRef.current && !isStoppingRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current && !isStoppingRef.current && sessionId === activeSessionIdRef.current) {
            try {
              const newRecognition = createRecognition(sessionId);
              if (newRecognition) {
                recognitionRef.current = newRecognition;
                newRecognition.start();
              }
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
          }
        }, 150);
        return;
      }

      // Finalize
      setState("idle");
      setInterimText("");
      setCommittedPreview("");

      const segments = committedSegmentsRef.current;
      if (segments.length > 0) {
        // Join and clean up
        let fullText = segments.join(". ").trim();
        // Capitalize first letter
        fullText = fullText.charAt(0).toUpperCase() + fullText.slice(1);
        // Ensure ends with period
        if (!/[.!?]$/.test(fullText)) fullText += ".";
        // Clean double periods
        fullText = fullText.replace(/\.{2,}/g, ".").replace(/\.\s*\./g, ".");

        onTranscript(fullText);
        toast.success(`Transcrição inserida (${segments.length} trecho${segments.length > 1 ? "s" : ""})!`);
      }
    };

    return recognition;
  }, [onTranscript, isDuplicate]);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    // Abort any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    // New session
    const sessionId = Date.now();
    activeSessionIdRef.current = sessionId;
    committedSegmentsRef.current = [];
    lastFinalTranscriptRef.current = "";
    isStoppingRef.current = false;
    shouldRestartRef.current = true;
    setInterimText("");
    setCommittedPreview("");

    const recognition = createRecognition(sessionId);
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setState("recording");
      toast.info("🎙️ Gravação iniciada. Fale agora...");
    } catch (e) {
      console.error("Failed to start recognition:", e);
      toast.error("Erro ao iniciar gravação");
      setState("idle");
    }
  }, [createRecognition]);

  const stopRecording = useCallback(() => {
    shouldRestartRef.current = false;
    isStoppingRef.current = true;
    setState("processing");
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  const cancelRecording = useCallback(() => {
    shouldRestartRef.current = false;
    isStoppingRef.current = true;
    activeSessionIdRef.current = 0;
    committedSegmentsRef.current = [];
    lastFinalTranscriptRef.current = "";
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setState("idle");
    setInterimText("");
    setCommittedPreview("");
    toast.info("Gravação cancelada");
  }, []);

  if (state === "processing") {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processando...
      </Button>
    );
  }

  if (state === "error") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={startRecording}
        disabled={disabled}
        className="gap-2 text-destructive border-destructive/50"
      >
        <AlertCircle className="h-4 w-4" />
        Tentar novamente
      </Button>
    );
  }

  if (state === "recording") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-2"
          >
            <Square className="h-3 w-3 fill-current" />
            Parar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancelRecording}>
            Cancelar
          </Button>
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-destructive animate-pulse"
                style={{
                  height: `${12 + Math.random() * 12}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            🎙️ Gravando
          </span>
          {committedSegmentsRef.current.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({committedSegmentsRef.current.length} trecho{committedSegmentsRef.current.length > 1 ? "s" : ""})
            </span>
          )}
        </div>

        {/* Live preview: committed text + interim */}
        {(committedPreview || interimText) && (
          <div className="text-xs pl-1 max-w-[400px] space-y-0.5">
            {committedPreview && (
              <p className="text-foreground/70 truncate">{committedPreview}</p>
            )}
            {interimText && (
              <p className="text-muted-foreground/60 italic truncate">
                {interimText}...
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Idle state
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={startRecording}
      disabled={disabled}
      className="gap-2"
      title="Gravar voz (transcrição automática)"
    >
      <Mic className="h-4 w-4" />
      <span className="hidden sm:inline">Voz</span>
    </Button>
  );
}
