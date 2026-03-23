import { useState, useRef, useCallback, useEffect } from "react";

export interface TranscriptEntry {
  id: string;
  speaker: "local" | "remote";
  speakerLabel: string;
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface UseSessionTranscriptionOptions {
  enabled: boolean;
  localLabel: string;
  remoteLabel: string;
  lang?: string;
}

export function useSessionTranscription({
  enabled,
  localLabel,
  remoteLabel,
  lang = "pt-BR",
}: UseSessionTranscriptionOptions) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!enabled || !supported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          const trimmed = text.trim();
          if (trimmed) {
            setTranscript((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                speaker: "local",
                speakerLabel: localLabel,
                text: trimmed,
                timestamp: new Date().toISOString(),
                isFinal: true,
              },
            ]);
          }
          setInterimText("");
        } else {
          interim += text;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.warn("[Transcription] Error:", event.error);
      if (event.error === "no-speech" || event.error === "aborted") {
        // Auto-restart
        restartTimeoutRef.current = setTimeout(() => {
          if (isListening) startListening();
        }, 500);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (isListening) {
        restartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 300);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (e) {
      console.error("[Transcription] Start failed:", e);
    }
  }, [enabled, supported, lang, localLabel, isListening]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
    setInterimText("");
  }, []);

  const addRemoteEntry = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setTranscript((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          speaker: "remote",
          speakerLabel: remoteLabel,
          text: text.trim(),
          timestamp: new Date().toISOString(),
          isFinal: true,
        },
      ]);
    },
    [remoteLabel]
  );

  const getFullTranscript = useCallback(() => {
    return transcript
      .filter((e) => e.isFinal)
      .map((e) => `${e.speakerLabel}: ${e.text}`)
      .join("\n");
  }, [transcript]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setInterimText("");
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    transcript,
    interimText,
    isListening,
    supported,
    startListening,
    stopListening,
    addRemoteEntry,
    getFullTranscript,
    clearTranscript,
  };
}
