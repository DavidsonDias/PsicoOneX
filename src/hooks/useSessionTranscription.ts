import { useState, useRef, useCallback, useEffect } from "react";
import type { TranscriptSegment, TranscriptionEngine } from "@/lib/transcription/types";
import { WebSpeechAdapter } from "@/lib/transcription/webspeech-adapter";
import { DeepgramAdapter } from "@/lib/transcription/deepgram-adapter";
import { GatewayAdapter } from "@/lib/transcription/gateway-adapter";

export type { TranscriptSegment };

// Re-export for backward compatibility
export type TranscriptEntry = TranscriptSegment;

interface UseSessionTranscriptionOptions {
  enabled: boolean;
  localLabel: string;
  remoteLabel: string;
  lang?: string;
  engine?: TranscriptionEngine;
}

export function useSessionTranscription({
  enabled,
  localLabel,
  remoteLabel,
  lang = "pt-BR",
  engine = "auto",
}: UseSessionTranscriptionOptions) {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const [activeEngine, setActiveEngine] = useState<TranscriptionEngine>("gateway");
  const [engineChecked, setEngineChecked] = useState(false);

  const adapterRef = useRef<WebSpeechAdapter | DeepgramAdapter | GatewayAdapter | null>(null);

  // Auto-detect best available engine
  useEffect(() => {
    if (engine !== "auto") {
      setActiveEngine(engine);
      setEngineChecked(true);
      return;
    }

    let cancelled = false;
    DeepgramAdapter.isAvailable().then((available) => {
      if (cancelled) return;
      // Sem Deepgram, usa a mesma engine do prontuário (gateway de IA):
      // precisão alta, português travado e captação de voz baixa/remota.
      setActiveEngine(available ? "deepgram" : "gateway");
      setEngineChecked(true);
    }).catch(() => {
      if (!cancelled) {
        setActiveEngine("gateway");
        setEngineChecked(true);
      }
    });

    return () => { cancelled = true; };
  }, [engine]);

  const callbacks = useCallback(() => ({
    onSegment: (segment: TranscriptSegment) => {
      setTranscript((prev) => [...prev, segment]);
    },
    onInterim: (text: string) => {
      setInterimText(text);
    },
    onError: (error: string) => {
      console.warn("[Transcription]", error);
    },
    onStatusChange: (listening: boolean) => {
      setIsListening(listening);
    },
  }), []);

  const startListening = useCallback(() => {
    if (!enabled || !engineChecked) return;

    const config = {
      engine: activeEngine,
      lang,
      localLabel,
      remoteLabel,
      diarize: true,
      punctuate: true,
      interimResults: true,
      deepgramModel: "nova-2",
    };

    const cbs = callbacks();

    const tryAdapter = (adapter: WebSpeechAdapter | DeepgramAdapter | GatewayAdapter) => {
      if (!adapter.isSupported()) return false;
      adapterRef.current = adapter;
      adapter.start();
      setSupported(true);
      return true;
    };

    // Cadeia de precisão: Deepgram → gateway de IA (mesma do prontuário) → Web Speech
    if (activeEngine === "deepgram" && tryAdapter(new DeepgramAdapter(config, cbs))) return;
    if (tryAdapter(new GatewayAdapter(config, cbs))) {
      setActiveEngine("gateway");
      return;
    }
    if (tryAdapter(new WebSpeechAdapter(config, cbs))) {
      setActiveEngine("webspeech");
      return;
    }
    setSupported(false);
  }, [enabled, engineChecked, activeEngine, lang, localLabel, remoteLabel, callbacks]);

  const stopListening = useCallback(() => {
    adapterRef.current?.stop();
    adapterRef.current = null;
    setIsListening(false);
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
          engine: activeEngine === "deepgram" ? "deepgram" : activeEngine === "gateway" ? "whisper" : "webspeech",
        },
      ]);
    },
    [remoteLabel, activeEngine]
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
      adapterRef.current?.stop();
    };
  }, []);

  return {
    transcript,
    interimText,
    isListening,
    supported,
    activeEngine,
    startListening,
    stopListening,
    addRemoteEntry,
    getFullTranscript,
    clearTranscript,
  };
}
