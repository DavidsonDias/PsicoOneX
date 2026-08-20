const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Remove do novo trecho a parte que já foi transcrita.
 * As janelas de áudio têm sobreposição intencional (para não cortar palavras),
 * então o mesmo trecho pode aparecer duas vezes.
 */
export function dedupeOverlap(previous: string, chunk: string, maxWords = 14): string {
  const clean = chunk.trim().replace(/\s{2,}/g, " ");
  if (!clean) return "";
  if (!previous.trim()) return clean;

  const prevWords = previous.trim().split(/\s+/);
  const nextWords = clean.split(/\s+/);
  const limit = Math.min(maxWords, prevWords.length, nextWords.length);

  for (let n = limit; n >= 2; n -= 1) {
    const tail = prevWords.slice(-n).map(norm).filter(Boolean).join(" ");
    const head = nextWords.slice(0, n).map(norm).filter(Boolean).join(" ");
    if (tail && tail === head) {
      const remainder = nextWords.slice(n).join(" ").trim();
      return remainder;
    }
  }

  // Repetição exata de frase curta
  const prevNorm = prevWords.map(norm).join(" ");
  const chunkNorm = nextWords.map(norm).join(" ");
  if (chunkNorm && prevNorm.endsWith(chunkNorm)) return "";

  return clean;
}
