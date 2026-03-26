/**
 * Deepgram Adapter — Server-side STT via Edge Function
 * 
 * Architecture:
 * 1. Client captures audio via MediaRecorder
 * 2. Sends chunks (every 2s) to edge function
 * 3. Edge function streams to Deepgram
 * 4. Returns structured transcript with diarization
 * 
 * Status: READY — activates when DEEPGRAM_API_KEY is configured
 */

import type { TranscriptSegment, TranscriptionEngineConfig } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface DeepgramCallbacks {
  onSegment: (segment: TranscriptSegment) => void;
  onInterim: (text: string) => void;
  onError: (error: string) => void;
  onStatusChange: (listening: boolean) => void;
}

export class DeepgramAdapter {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private _isListening = false;
  private config: TranscriptionEngineConfig;
  private callbacks: DeepgramCallbacks;
  private stream: MediaStream | null = null;

  constructor(config: TranscriptionEngineConfig, callbacks: DeepgramCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  isSupported(): boolean {
    return typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices;
  }

  get isListening(): boolean {
    return this._isListening;
  }

  async start(): Promise<void> {
    if (!this.isSupported()) {
      this.callbacks.onError("MediaRecorder não suportado neste navegador");
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(2000); // 2s chunks
      this._isListening = true;
      this.callbacks.onStatusChange(true);

      // Send chunks every 3s
      this.sendInterval = setInterval(() => this.sendChunks(), 3000);
    } catch (e) {
      console.error("[Deepgram] Failed to start:", e);
      this.callbacks.onError("Falha ao capturar áudio para transcrição");
    }
  }

  stop(): void {
    this._isListening = false;
    if (this.sendInterval) clearInterval(this.sendInterval);

    try {
      this.mediaRecorder?.stop();
    } catch {}

    // Send remaining chunks
    setTimeout(() => this.sendChunks(), 500);

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.callbacks.onStatusChange(false);
  }

  private async sendChunks(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    const chunks = [...this.audioChunks];
    this.audioChunks = [];

    const blob = new Blob(chunks, { type: "audio/webm" });

    try {
      // Convert to base64 for edge function
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: {
          audio: base64,
          mimeType: "audio/webm",
          lang: this.config.lang,
          model: this.config.deepgramModel || "nova-2",
          diarize: this.config.diarize !== false,
          punctuate: this.config.punctuate !== false,
          localLabel: this.config.localLabel,
          remoteLabel: this.config.remoteLabel,
        },
      });

      if (error) {
        console.warn("[Deepgram] Edge function error:", error);
        return;
      }

      if (data?.segments) {
        for (const seg of data.segments) {
          this.callbacks.onSegment({
            id: crypto.randomUUID(),
            speaker: seg.speaker || "unknown",
            speakerLabel: seg.speakerLabel || this.config.localLabel,
            text: seg.text,
            timestamp: new Date().toISOString(),
            startTime: seg.startTime,
            endTime: seg.endTime,
            confidence: seg.confidence,
            isFinal: true,
            engine: "deepgram",
          });
        }
      }
    } catch (e) {
      console.warn("[Deepgram] Send failed:", e);
    }
  }

  /**
   * Check if Deepgram is configured on the backend
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { healthCheck: true },
      });
      return !error && data?.available === true;
    } catch {
      return false;
    }
  }
}
