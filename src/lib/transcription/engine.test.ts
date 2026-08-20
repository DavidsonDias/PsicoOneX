import { describe, it, expect, vi, beforeEach } from "vitest";

/** Recorder falso controlável: permite simular janelas e o stop com flush final. */
const recorders: any[] = [];

vi.mock("@/lib/audio/dictation-recorder", () => ({
  DictationRecorder: class {
    opts: any;
    running = false;
    paused = false;
    constructor(opts: any) {
      this.opts = opts;
      recorders.push(this);
    }
    get health() {
      return { trackLive: true, contextState: "running", frameAgeMs: 10, speechAgeMs: 10 };
    }
    get isPaused() {
      return this.paused;
    }
    async start() {
      this.running = true;
      return true;
    }
    async pause() {
      this.paused = true;
    }
    resume() {
      this.paused = false;
    }
    setGain() {}
    /** Simula o flush final: entrega o buffer restante ANTES de liberar recursos */
    async stop() {
      await this.opts.onWindow({ base64: "TAIL", mimeType: "audio/wav", durationMs: 1200 });
      this.running = false;
    }
    emit(tag: string) {
      return this.opts.onWindow({ base64: tag, mimeType: "audio/wav", durationMs: 3000 });
    }
  },
}));

const TEXT: Record<string, string> = {
  A: "o paciente relatou dificuldade",
  B: "dificuldade para dormir",
  C: "durante a semana",
  TAIL: "e pediu ajuda no fim da sessão",
};

const delays: Record<string, number> = { A: 40, B: 5, C: 20, TAIL: 15 };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async (_name: string, { body }: any) => {
        await new Promise((r) => setTimeout(r, delays[body.audio] ?? 5));
        return { data: { text: TEXT[body.audio] ?? "" }, error: null };
      }),
    },
  },
}));

import { ClinicalTranscriptionEngine } from "./engine";

describe("ClinicalTranscriptionEngine", () => {
  beforeEach(() => {
    recorders.length = 0;
  });

  it("emite segmentos na ordem das janelas mesmo com respostas fora de ordem", async () => {
    const segments: string[] = [];
    const engine = new ClinicalTranscriptionEngine({
      context: "medical_record",
      onSegment: (t) => segments.push(t),
    });
    await engine.start();
    const rec = recorders[0];
    await rec.emit("A");
    await rec.emit("B");
    await rec.emit("C");
    const result = await engine.stopAndSave();

    expect(segments.length).toBeGreaterThan(0);
    // Ordem da conversa (sequence), nunca a ordem de conclusão HTTP
    expect(result.text.startsWith("o paciente relatou dificuldade")).toBe(true);
    expect(result.text).toContain("durante a semana");
    // Overlap deduplicado: "dificuldade" não aparece duas vezes seguidas
    expect(result.text).not.toMatch(/dificuldade dificuldade/);
  });

  it("não perde o último trecho ao clicar em parar (Final Flush)", async () => {
    const engine = new ClinicalTranscriptionEngine({ context: "medical_record" });
    await engine.start();
    const rec = recorders[0];
    // Fala + STOP imediato durante o processamento
    const emitting = rec.emit("A");
    const result = await engine.stopAndSave();
    await emitting;

    expect(result.text).toContain("o paciente relatou dificuldade");
    expect(result.text).toContain("fim da sessão");
    expect(result.integrity).toBe(true);
    expect(result.metrics.pending).toBe(0);
  });

  it("é idempotente sob stop duplicado (clique duplo)", async () => {
    const engine = new ClinicalTranscriptionEngine({ context: "medical_record" });
    await engine.start();
    await recorders[0].emit("A");
    const [a, b] = await Promise.all([engine.stopAndSave(), engine.stopAndSave()]);
    expect(a.text).toBe(b.text);
    expect(a.text.match(/relatou/g)?.length).toBe(1);
  });
});
