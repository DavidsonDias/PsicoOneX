export interface VoiceActivityResult {
  isSpeech: boolean;
  threshold: number;
  noiseFloor: number;
  /** Energia suavizada usada na decisão (útil para depuração/medidor) */
  smoothed: number;
}

/**
 * Detector de fala com histerese, calibrado para voz baixa/distante e para voz
 * remota reproduzida pelo alto-falante (Meet/WhatsApp).
 *
 * Princípios:
 *  - O piso de ruído só aprende com quadros claramente silenciosos, então a
 *    própria fala nunca é aprendida como ruído.
 *  - Duas fronteiras (attack/release): entra em fala num limiar mais alto e só
 *    sai num limiar bem mais baixo — preserva sílabas fracas e fins de frase.
 *  - Energia suavizada (ataque rápido, queda lenta) evita cortes em consoantes.
 */
export class AdaptiveVoiceActivityDetector {
  private noiseFloor = 0.0015;
  private smoothed = 0;
  private speaking = false;

  analyze(rms: number): VoiceActivityResult {
    const safeRms = Number.isFinite(rms) ? Math.max(0, rms) : 0;

    // Ataque rápido / queda lenta: mantém a janela aberta em micro-pausas
    const alpha = safeRms > this.smoothed ? 0.5 : 0.12;
    this.smoothed = this.smoothed * (1 - alpha) + safeRms * alpha;

    // Piso absoluto baixo o suficiente para voz sussurrada com ganho aplicado
    const attack = Math.min(0.012, Math.max(0.0018, this.noiseFloor * 2.2));
    const release = attack * 0.45;

    this.speaking = this.speaking ? this.smoothed >= release : this.smoothed >= attack;

    // Aprende ruído apenas quando está bem abaixo do limiar de entrada
    if (!this.speaking && safeRms < attack * 0.8) {
      const learn = safeRms < this.noiseFloor ? 0.08 : 0.01;
      this.noiseFloor = this.noiseFloor * (1 - learn) + safeRms * learn;
      this.noiseFloor = Math.min(0.006, Math.max(0.0004, this.noiseFloor));
    }

    return {
      isSpeech: this.speaking,
      threshold: this.speaking ? release : attack,
      noiseFloor: this.noiseFloor,
      smoothed: this.smoothed,
    };
  }

  reset() {
    this.noiseFloor = 0.0015;
    this.smoothed = 0;
    this.speaking = false;
  }
}
