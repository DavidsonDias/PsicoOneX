/**
 * DictationRecorder — captura contínua de áudio com:
 *  - Ganho ajustável + compressor (sensibilidade do microfone)
 *  - Janelas WAV completas (funciona em qualquer navegador / iOS Safari)
 *  - Continuidade em background (PWA minimizado): keep-alive de áudio,
 *    MediaSession, Wake Lock e retomada automática do AudioContext.
 */

import { blobToBase64, concatFloat32, downsample, encodeWav } from "./wav";

export interface DictationRecorderOptions {
  /** Ganho aplicado ao microfone (1 = normal, 3 = alta sensibilidade) */
  gain?: number;
  /** Duração de cada janela enviada para transcrição (ms) */
  windowMs?: number;
  /** Nível RMS mínimo para considerar que houve fala na janela */
  silenceThreshold?: number;
  targetSampleRate?: number;
  onWindow: (payload: { base64: string; mimeType: string; durationMs: number }) => void;
  onLevel?: (rms: number) => void;
  onError?: (message: string) => void;
  onBackgroundState?: (active: boolean) => void;
}

const KEEP_ALIVE_WAV =
  "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ4AAAAAAAAAAAAAAAAAAAAAAA==";

export class DictationRecorder {
  private opts: Required<Omit<DictationRecorderOptions, "onWindow" | "onLevel" | "onError" | "onBackgroundState">> &
    DictationRecorderOptions;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;
  private buffer: Float32Array[] = [];
  private bufferedSamples = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private keepAliveEl: HTMLAudioElement | null = null;
  private wakeLock: any = null;
  private visibilityHandler: (() => void) | null = null;
  private running = false;
  private peakRms = 0;
  private noiseFloor = 0;
  private speechMs = 0;
  private silenceMs = 0;


  constructor(options: DictationRecorderOptions) {
    this.opts = {
      gain: 2,
      windowMs: 6000,
      silenceThreshold: 0.004,
      targetSampleRate: 16000,
      ...options,
    } as any;
  }

  get isRunning() {
    return this.running;
  }

  setGain(gain: number) {
    this.opts.gain = gain;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
    }
  }

  async start(): Promise<boolean> {
    if (this.running) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (e) {
      this.opts.onError?.(
        "Não foi possível acessar o microfone. Verifique a permissão do navegador/aplicativo."
      );
      return false;
    }

    const Ctor: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctor();
    await this.ctx.resume().catch(() => {});

    this.source = this.ctx.createMediaStreamSource(this.stream);

    // Sensibilidade: ganho + compressão para captar voz baixa sem distorcer
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.opts.gain;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -45;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (event) => {
      if (!this.running) return;
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input);
      const frameMs = (copy.length / (this.ctx?.sampleRate || 48000)) * 1000;

      let sum = 0;
      for (let i = 0; i < copy.length; i++) sum += copy[i] * copy[i];
      const rms = Math.sqrt(sum / copy.length);

      // Noise floor adaptativo: acompanha o ruído ambiente lentamente
      this.noiseFloor = this.noiseFloor === 0 ? rms : this.noiseFloor * 0.995 + rms * 0.005;
      const speechGate = Math.max(this.opts.silenceThreshold, this.noiseFloor * 2.2);
      const isSpeech = rms > speechGate;

      // Só começa a acumular quando há fala (evita janelas 100% de ruído)
      if (isSpeech || this.speechMs > 0) {
        this.buffer.push(copy);
        this.bufferedSamples += copy.length;
      }

      if (isSpeech) {
        this.speechMs += frameMs;
        this.silenceMs = 0;
      } else if (this.speechMs > 0) {
        this.silenceMs += frameMs;
      }

      this.peakRms = Math.max(this.peakRms, rms);
      this.opts.onLevel?.(rms);

      // Fecha a janela numa pausa natural da fala, ou no limite máximo
      const totalMs = (this.bufferedSamples / (this.ctx?.sampleRate || 48000)) * 1000;
      const pauseClose = this.speechMs >= 1200 && this.silenceMs >= 700;
      const hardClose = totalMs >= this.opts.windowMs;
      if (pauseClose || hardClose) void this.flush(false);
    };

    // Saída silenciosa: mantém o grafo ativo sem devolver áudio ao usuário
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;

    this.source.connect(this.gainNode);
    this.gainNode.connect(this.compressor);
    this.compressor.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(this.ctx.destination);

    this.running = true;

    this.startKeepAlive();
    this.requestWakeLock();


    this.visibilityHandler = () => {
      if (!this.running) return;
      this.ctx?.resume().catch(() => {});
      this.keepAliveEl?.play().catch(() => {});
      if (document.visibilityState === "visible") this.requestWakeLock();
      this.opts.onBackgroundState?.(document.visibilityState !== "visible");
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
    window.addEventListener("pagehide", this.visibilityHandler);

    return true;
  }

  /** Envia o áudio acumulado imediatamente (usado ao parar a gravação) */
  async flushNow() {
    await this.flush(true);
  }

  private async flush(force: boolean) {
    if (!this.ctx) return;
    if (this.bufferedSamples === 0) return;

    const chunks = this.buffer;
    const peak = this.peakRms;
    this.buffer = [];
    this.bufferedSamples = 0;
    this.peakRms = 0;

    // Descarta janelas silenciosas para não gastar transcrição
    if (!force && peak < this.opts.silenceThreshold) return;
    if (peak < this.opts.silenceThreshold * 0.5) return;

    const merged = concatFloat32(chunks);
    const rate = this.ctx.sampleRate;
    const resampled = downsample(merged, rate, this.opts.targetSampleRate);
    const durationMs = (merged.length / rate) * 1000;
    if (durationMs < 400) return;

    const wav = encodeWav(resampled, this.opts.targetSampleRate);
    if (wav.size < 2048) return;

    try {
      const base64 = await blobToBase64(wav);
      this.opts.onWindow({ base64, mimeType: "audio/wav", durationMs });
    } catch {
      this.opts.onError?.("Falha ao preparar o áudio para transcrição.");
    }
  }

  private startKeepAlive() {
    try {
      const el = document.createElement("audio");
      el.src = KEEP_ALIVE_WAV;
      el.loop = true;
      el.volume = 0.0001;
      (el as any).playsInline = true;
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
      document.body.appendChild(el);
      el.play().catch(() => {});
      this.keepAliveEl = el;

      if ("mediaSession" in navigator) {
        (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
          title: "Gravando sessão clínica",
          artist: "PsicoOne",
        });
        (navigator as any).mediaSession.playbackState = "playing";
      }
    } catch {
      /* keep-alive é best effort */
    }
  }

  private async requestWakeLock() {
    try {
      if (this.wakeLock || !("wakeLock" in navigator)) return;
      this.wakeLock = await (navigator as any).wakeLock.request("screen");
      this.wakeLock.addEventListener?.("release", () => {
        this.wakeLock = null;
      });
    } catch {
      this.wakeLock = null;
    }
  }

  async stop() {
    if (!this.running) return;
    this.running = false;

    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;

    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      window.removeEventListener("pagehide", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    await this.flush(true);

    try {
      if (this.processor) this.processor.onaudioprocess = null as any;
      this.processor?.disconnect();
      this.compressor?.disconnect();
      this.gainNode?.disconnect();
      this.source?.disconnect();
      this.sink?.disconnect();
    } catch {
      /* noop */
    }

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    await this.ctx?.close().catch(() => {});
    this.ctx = null;

    if (this.keepAliveEl) {
      this.keepAliveEl.pause();
      this.keepAliveEl.remove();
      this.keepAliveEl = null;
    }
    if ("mediaSession" in navigator) {
      try {
        (navigator as any).mediaSession.playbackState = "none";
      } catch {}
    }
    try {
      await this.wakeLock?.release?.();
    } catch {}
    this.wakeLock = null;
  }
}
