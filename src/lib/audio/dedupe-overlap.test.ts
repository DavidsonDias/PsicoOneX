import { describe, expect, it } from "vitest";
import { dedupeOverlap } from "./dedupe-overlap";

describe("dedupeOverlap", () => {
  it("mantém o primeiro trecho", () => {
    expect(dedupeOverlap("", "O paciente relata ansiedade.")).toBe("O paciente relata ansiedade.");
  });

  it("remove a sobreposição das janelas de áudio", () => {
    const prev = "O paciente relata ansiedade no trabalho";
    const next = "ansiedade no trabalho e insônia há duas semanas";
    expect(dedupeOverlap(prev, next)).toBe("e insônia há duas semanas");
  });

  it("ignora repetição integral, mesmo com pontuação e acentos diferentes", () => {
    expect(dedupeOverlap("Ele dormiu mal.", "ele dormiu mal")).toBe("");
  });

  it("preserva conteúdo novo sem sobreposição", () => {
    expect(dedupeOverlap("Sessão iniciada.", "Trouxe um sonho recorrente.")).toBe(
      "Trouxe um sonho recorrente."
    );
  });
});
