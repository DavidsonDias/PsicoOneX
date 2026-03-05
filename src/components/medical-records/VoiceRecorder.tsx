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
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

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

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    transcriptRef.current = "";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }
      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        toast.error("Erro no reconhecimento de voz");
      }
      setIsRecording(false);
      setIsProcessing(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (transcriptRef.current.trim()) {
        onTranscript(transcriptRef.current.trim());
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
      transcriptRef.current = "";
      recognitionRef.current.abort();
      setIsRecording(false);
      setIsProcessing(false);
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
                "w-1 rounded-full bg-destructive",
                "animate-pulse"
              )}
              style={{
                height: `${12 + Math.random() * 12}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
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
