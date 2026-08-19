import { describe, expect, it } from "vitest";
import { AdaptiveVoiceActivityDetector } from "./voice-activity";

describe("AdaptiveVoiceActivityDetector", () => {
  it("reconhece fala logo no primeiro quadro", () => {
    const detector = new AdaptiveVoiceActivityDetector();
    expect(detector.analyze(0.02).isSpeech).toBe(true);
  });

  it("não eleva o piso de ruído durante fala contínua", () => {
    const detector = new AdaptiveVoiceActivityDetector();
    for (let i = 0; i < 200; i += 1) detector.analyze(0.025);
    const result = detector.analyze(0.012);
    expect(result.isSpeech).toBe(true);
    expect(result.threshold).toBeLessThan(0.012);
  });

  it("ignora silêncio mas preserva voz baixa e distante", () => {
    const detector = new AdaptiveVoiceActivityDetector();
    for (let i = 0; i < 100; i += 1) detector.analyze(0.0008);
    expect(detector.analyze(0.001).isSpeech).toBe(false);
    expect(detector.analyze(0.0045).isSpeech).toBe(true);
  });
});