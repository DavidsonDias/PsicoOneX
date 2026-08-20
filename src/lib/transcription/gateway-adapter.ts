import { ClinicalTranscriptionEngine } from "./engine";
import { loadAutoGain, loadStoredGain } from "./gain";
import type { TranscriptSegment, TranscriptionEngineAdapter, TranscriptionEngineConfig } from "./types";

interface GatewayCallbacks {
  onSegment: (segment: TranscriptSegment) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (listening: boolean) => void;
}

/**
 * Teleatendimento sobre a MESMA ClinicalTranscriptionEngine do prontuário:
 * chunk durável, fila com retry, ordenação por sequence, dedupe de overlap e
 * Final Flush ao encerrar — sem lógica duplicada.
 */
export class GatewayAdapter implements TranscriptionEngineAdapter {
  private engine: ClinicalTranscriptionEngine | null = null;
  private listening = false;

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
    const engine = new ClinicalTranscriptionEngine({
      context: "telehealth",
      language: this.config.lang || "pt-BR",
      gain: loadStoredGain(),
      autoGain: loadAutoGain(),
      onSegment: (text) => {
        this.callbacks.onInterim?.("");
        this.callbacks.onSegment({
          id: crypto.randomUUID(),
          speaker: "local",
          speakerLabel: this.config.localLabel,
          text,
          timestamp: new Date().toISOString(),
          isFinal: true,
          engine: "whisper",
        });
      },
      onMetrics: (m) => {
        this.callbacks.onInterim?.(m.pending > 0 ? "ouvindo…" : "");
      },
      onNotice: (_kind, message) => this.callbacks.onError?.(message),
    });

    void engine.start().then((ok) => {
      if (!ok) {
        this.callbacks.onError?.("Não foi possível acessar o microfone.");
        this.callbacks.onStatusChange?.(false);
        return;
      }
      this.engine = engine;
      this.listening = true;
      this.callbacks.onStatusChange?.(true);
    });
  }

  stop() {
    const engine = this.engine;
    this.engine = null;
    this.listening = false;
    this.callbacks.onStatusChange?.(false);
    // Final Flush: nenhum trecho pendente é abortado ao encerrar a chamada.
    void engine?.stopAndSave().then(() => engine.confirmPersisted().catch(() => undefined));
  }
}
