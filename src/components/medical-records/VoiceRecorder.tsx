import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
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
  // Stores only confirmed final sentences
  const finalPartsRef = useRef<string[]>([]);
  // Track how many results we already processed to avoid re-processing
  const processedIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    // Reset state
    finalPartsRef.current = [];
    processedIndexRef.current = 0;
    setInterimText("");

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let newInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (!transcript) continue;

        if (event.results[i].isFinal) {
          // Only add if we haven't processed this index yet
          if (i >= processedIndexRef.current) {
            // Deduplicate: check if this exact text is already in our parts
            const lastPart = finalPartsRef.current[finalPartsRef.current.length - 1];
            if (!lastPart || lastPart !== transcript) {
              finalPartsRef.current.push(transcript);
            }
            processedIndexRef.current = i + 1;
          }
          setInterimText("");
        } else {
          newInterim = transcript;
        }
      }

      if (newInterim) {
        setInterimText(newInterim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        toast.error("Erro no reconhecimento de voz");
      }
      setIsRecording(false);
      setIsProcessing(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText("");
      const fullText = finalPartsRef.current.join(". ").trim();
      if (fullText) {
        // Add final period if missing
        const cleaned = fullText.endsWith(".") ? fullText : fullText + ".";
        onTranscript(cleaned);
        toast.success("Transcrição inserida!");
      }
      setIsProcessing(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.info("Gravação iniciada. Fale agora...");
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      setIsProcessing(true);
      recognitionRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (recognitionRef.current) {
      finalPartsRef.current = [];
      processedIndexRef.current = 0;
      recognitionRef.current.abort();
      setIsRecording(false);
      setIsProcessing(false);
      setInterimText("");
      toast.info("Gravação cancelada");
    }
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
            <div className="relative">
              <MicOff className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />
            </div>
            Parar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancelRecording}>
            Cancelar
          </Button>
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full bg-destructive animate-pulse"
                )}
                style={{
                  height: `${12 + Math.random() * 12}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
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
