/**
 * WebSpeech API Adapter — Free, client-side fallback
 * 
 * Pros: No API key, zero cost, works offline
 * Cons: Lower precision, no diarization, browser-dependent
 */

import type { TranscriptSegment, TranscriptionEngineConfig } from "./types";

interface WebSpeechCallbacks {
  onSegment: (segment: TranscriptSegment) => void;
  onInterim: (text: string) => void;
  onError: (error: string) => void;
  onStatusChange: (listening: boolean) => void;
}

export class WebSpeechAdapter {
  private recognition: any = null;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isListening = false;
  private config: TranscriptionEngineConfig;
  private callbacks: WebSpeechCallbacks;

  constructor(config: TranscriptionEngineConfig, callbacks: WebSpeechCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  isSupported(): boolean {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR;
  }

  get isListening(): boolean {
    return this._isListening;
  }

  start(): void {
    if (!this.isSupported()) {
      this.callbacks.onError("Web Speech API não suportada neste navegador");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = this.config.interimResults !== false;
    recognition.lang = this.config.lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          const trimmed = text.trim();
          if (trimmed) {
            this.callbacks.onSegment({
              id: crypto.randomUUID(),
              speaker: "local",
              speakerLabel: this.config.localLabel,
              text: trimmed,
              timestamp: new Date().toISOString(),
              confidence: confidence || undefined,
              isFinal: true,
              engine: "webspeech",
            });
          }
          this.callbacks.onInterim("");
        } else {
          interim += text;
        }
      }
      if (interim) this.callbacks.onInterim(interim);
    };

    recognition.onerror = (event: any) => {
      console.warn("[WebSpeech] Error:", event.error);
      if (event.error === "no-speech" || event.error === "aborted") {
        this.scheduleRestart();
      } else {
        this.callbacks.onError(`Erro de reconhecimento: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (this._isListening) {
        this.scheduleRestart();
      }
    };

    try {
      recognition.start();
      this.recognition = recognition;
      this._isListening = true;
      this.callbacks.onStatusChange(true);
    } catch (e) {
      console.error("[WebSpeech] Start failed:", e);
      this.callbacks.onError("Falha ao iniciar reconhecimento de voz");
    }
  }

  stop(): void {
    this._isListening = false;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    try {
      this.recognition?.stop();
    } catch {}
    this.recognition = null;
    this.callbacks.onInterim("");
    this.callbacks.onStatusChange(false);
  }

  private scheduleRestart(): void {
    this.restartTimeout = setTimeout(() => {
      if (this._isListening) this.start();
    }, 400);
  }
}
