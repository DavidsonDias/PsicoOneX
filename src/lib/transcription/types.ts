/**
 * Transcription Engine Abstraction Layer
 * 
 * Architecture: Strategy pattern for STT engines.
 * Default: WebSpeech (free, client-side)
 * Target: Deepgram (server-side, diarization, high precision)
 * 
 * To migrate: add DEEPGRAM_API_KEY secret → engine auto-switches
 */

export interface TranscriptSegment {
  id: string;
  speaker: "local" | "remote" | "unknown";
  speakerLabel: string;
  text: string;
  timestamp: string;
  startTime?: number;   // seconds from session start
  endTime?: number;     // seconds from session start
  confidence?: number;  // 0-1, from STT engine
  isFinal: boolean;
  engine: "webspeech" | "deepgram" | "whisper";
}

export type TranscriptionEngine = "webspeech" | "deepgram" | "gateway" | "auto";

export interface TranscriptionEngineConfig {
  engine: TranscriptionEngine;
  lang: string;
  localLabel: string;
  remoteLabel: string;
  /** Deepgram-specific */
  deepgramModel?: string;
  /** Enable diarization (Deepgram only) */
  diarize?: boolean;
  /** Punctuation (Deepgram only) */
  punctuate?: boolean;
  /** Send interim results */
  interimResults?: boolean;
}

export interface TranscriptionEngineAdapter {
  start(): void;
  stop(): void;
  isSupported(): boolean;
  readonly isListening: boolean;
}

export const DEFAULT_ENGINE_CONFIG: Partial<TranscriptionEngineConfig> = {
  engine: "auto",
  lang: "pt-BR",
  deepgramModel: "nova-2",
  diarize: true,
  punctuate: true,
  interimResults: true,
};
