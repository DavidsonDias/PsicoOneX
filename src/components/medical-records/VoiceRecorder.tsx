import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const committedTextRef = useRef<string[]>([]);
  const isStoppingRef = useRef(false);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    // KEY FIX: Don't use continuous mode — restart manually instead.
    // This prevents the cumulative result duplication bug on mobile.
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      // With continuous=false, there's only one result set per session
      const result = event.results[0];
      if (!result) return;

      const transcript = result[0].transcript.trim();
      if (!transcript) return;

      if (result.isFinal) {
        // Commit this sentence
        committedTextRef.current.push(transcript);
        setInterimText("");
      } else {
        // Show live preview only
        setInterimText(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are expected during normal usage
      if (event.error === "no-speech") {
        // No speech detected — just restart if still recording
        return;
      }
      if (event.error === "aborted") {
        return;
      }
      console.error("Speech recognition error:", event.error);
      toast.error("Erro no reconhecimento de voz");
      shouldRestartRef.current = false;
      setIsRecording(false);
      setIsProcessing(false);
      setInterimText("");
    };

    recognition.onend = () => {
      // If user hasn't clicked stop, restart for next sentence
      if (shouldRestartRef.current && !isStoppingRef.current) {
        try {
          // Small delay to avoid rapid restart issues
          setTimeout(() => {
            if (shouldRestartRef.current && !isStoppingRef.current) {
              const newRecognition = createRecognition();
              if (newRecognition) {
                recognitionRef.current = newRecognition;
                newRecognition.start();
              }
            }
          }, 100);
        } catch (e) {
          console.error("Failed to restart recognition:", e);
        }
        return;
      }

      // User clicked stop — finalize
      setIsRecording(false);
      setInterimText("");
      const fullText = committedTextRef.current.join(". ").trim();
      if (fullText) {
        const cleaned = fullText.endsWith(".") ? fullText : fullText + ".";
        onTranscript(cleaned);
        toast.success("Transcrição inserida!");
      }
      setIsProcessing(false);
    };

    return recognition;
  }, [onTranscript]);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    // Reset
    committedTextRef.current = [];
    isStoppingRef.current = false;
    shouldRestartRef.current = true;
    setInterimText("");

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.info("Gravação iniciada. Fale agora...");
  }, [createRecognition]);

  const stopRecording = useCallback(() => {
    shouldRestartRef.current = false;
    isStoppingRef.current = true;
    setIsProcessing(true);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    shouldRestartRef.current = false;
    isStoppingRef.current = true;
    committedTextRef.current = [];
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setIsRecording(false);
    setIsProcessing(false);
    setInterimText("");
    toast.info("Gravação cancelada");
  }, []);

  if (isProcessing) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processando...
      </Button>
    );
  }

  if (isRecording) {
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
          {committedTextRef.current.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {committedTextRef.current.length} frase(s)
            </span>
          )}
        </div>
        {interimText && (
          <p className="text-xs text-muted-foreground italic truncate max-w-[300px] pl-1">
            🎙️ {interimText}
          </p>
        )}
      </div>
    );
  }

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
