import { supabase } from "@/integrations/supabase/client";
import { DictationRecorder } from "@/lib/audio/dictation-recorder";
import { dedupeOverlap } from "@/lib/audio/dedupe-overlap";
import { loadStoredGain } from "@/hooks/useLiveDictation";
import type { TranscriptSegment, TranscriptionEngineAdapter, TranscriptionEngineConfig } from "./types";

interface GatewayCallbacks {
  onSegment: (segment: TranscriptSegment) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (listening: boolean) => void;
}

/**
 * Engine de transcrição do teleatendimento com a mesma tecnologia do prontuário:
 * captura via Web Audio (VAD adaptativo, pré-buffer, AGC) e transcrição no
 * gateway de IA — precisão alta, português travado e captação de voz baixa,
 * inclusive a voz remota reproduzida pelo alto-falante.
 */
export class GatewayAdapter implements TranscriptionEngineAdapter {
  private recorder: DictationRecorder | null = null;
  private listening = false;
  private queue: Promise<void> = Promise.resolve();
  private lastText = "";

  constructor(
    private config: TranscriptionEngineConfig,
    private callbacks: GatewayCallbacks
  ) {}

  get isListening() {
    return this.listening;
  }

  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      !!((window as any).AudioContext || (window as any).webkitAudioContext)
    );
  }

  start() {
    if (this.listening) return;
    const recorder = new DictationRecorder({
      gain: loadStoredGain(),
      windowMs: 12000,
      onWindow: ({ base64, mimeType }) => this.enqueue(base64, mimeType),
      onError: (msg) => this.callbacks.onError?.(msg),
    });

    void recorder.start().then((ok) => {
      if (!ok) {
        this.callbacks.onError?.("Não foi possível acessar o microfone.");
        this.callbacks.onStatusChange?.(false);
        return;
      }
      this.recorder = recorder;
      this.listening = true;
      this.callbacks.onStatusChange?.(true);
    });
  }

  stop() {
    const recorder = this.recorder;
    this.recorder = null;
    this.listening = false;
    this.lastText = "";
    this.callbacks.onStatusChange?.(false);
    void recorder?.stop();
  }

  private enqueue(base64: string, mimeType: string) {
    this.callbacks.onInterim?.("ouvindo…");
    this.queue = this.queue.then(async () => {
      try {
        const lang = (this.config.lang || "pt-BR").split("-")[0];
        const { data, error } = await supabase.functions.invoke("speech-to-text", {
          body: { audio: base64, mimeType, language: lang },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const raw = typeof data?.text === "string" ? data.text : "";
        const text = dedupeOverlap(this.lastText, raw);
        this.callbacks.onInterim?.("");
        if (!text) return;
        this.lastText = `${this.lastText} ${text}`.trim().slice(-400);
        this.callbacks.onSegment({
          id: crypto.randomUUID(),
          speaker: "local",
          speakerLabel: this.config.localLabel,
          text,
          timestamp: new Date().toISOString(),
          isFinal: true,
          engine: "whisper",
        });
      } catch (e) {
        this.callbacks.onInterim?.("");
        this.callbacks.onError?.(e instanceof Error ? e.message : "Falha na transcrição");
      }
    });
  }
}
