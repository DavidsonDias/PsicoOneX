export interface VoiceActivityResult {
  isSpeech: boolean;
  threshold: number;
  noiseFloor: number;
}

/**
 * Detector conservador de silêncio para ditado clínico.
 * O piso só aprende com quadros abaixo do limiar atual; assim, uma sessão que
 * começa com fala nunca transforma a própria voz em "ruído".
 */
export class AdaptiveVoiceActivityDetector {
  private noiseFloor = 0.002;

  analyze(rms: number): VoiceActivityResult {
    const safeRms = Number.isFinite(rms) ? Math.max(0, rms) : 0;
    const threshold = Math.min(0.018, Math.max(0.0035, this.noiseFloor * 1.8));
    const isSpeech = safeRms >= threshold;

    if (!isSpeech) {
      const alpha = safeRms < this.noiseFloor ? 0.08 : 0.015;
      this.noiseFloor = this.noiseFloor * (1 - alpha) + safeRms * alpha;
      this.noiseFloor = Math.min(0.01, Math.max(0.0005, this.noiseFloor));
    }

    return { isSpeech, threshold, noiseFloor: this.noiseFloor };
  }

  reset() {
    this.noiseFloor = 0.002;
  }
}