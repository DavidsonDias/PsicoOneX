/**
 * Calibração de microfone: mede alguns segundos de fala e recomenda a
 * sensibilidade (ganho) adequada, detectando também ruído e clipping.
 */

export interface CalibrationResult {
  ok: boolean;
  recommendedGain: number;
  noiseFloor: number;
  peak: number;
  clipping: boolean;
  message: string;
}

export async function calibrateMicrophone(durationMs = 4000): Promise<CalibrationResult> {
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
    });
  } catch {
    return {
      ok: false,
      recommendedGain: 2.5,
      noiseFloor: 0,
      peak: 0,
      clipping: false,
      message: "Não foi possível acessar o microfone. Verifique a permissão do navegador.",
    };
  }

  const Ctor: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctor();
  await ctx.resume().catch(() => undefined);
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);

  let peak = 0;
  let noise = 1;
  let clipping = false;
  const started = Date.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        sum += v * v;
        if (Math.abs(v) > 0.985) clipping = true;
      }
      const rms = Math.sqrt(sum / data.length);
      peak = Math.max(peak, rms);
      if (rms < noise) noise = rms;
      if (Date.now() - started >= durationMs) return resolve();
      requestAnimationFrame(tick);
    };
    tick();
  });

  stream.getTracks().forEach((t) => t.stop());
  await ctx.close().catch(() => undefined);

  const target = 0.09;
  const recommendedGain = Math.min(6, Math.max(0.8, Number((target / Math.max(peak, 0.004)).toFixed(1))));

  if (peak < 0.006) {
    return {
      ok: false,
      recommendedGain: Math.min(6, Math.max(3.5, recommendedGain)),
      noiseFloor: noise,
      peak,
      clipping,
      message: "Quase nenhum áudio detectado. Aproxime-se do microfone e teste novamente.",
    };
  }

  return {
    ok: true,
    recommendedGain,
    noiseFloor: noise,
    peak,
    clipping,
    message: clipping
      ? `Microfone configurado, mas o sinal está saturando. Sensibilidade recomendada: ${recommendedGain}x`
      : `Microfone configurado. Sensibilidade recomendada: ${recommendedGain}x`,
  };
}
