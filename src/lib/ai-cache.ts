/**
 * Cache local de resultados de IA (etapa A de otimização de consumo).
 *
 * Guarda o resultado com uma "assinatura" dos dados de origem e um TTL.
 * Enquanto a assinatura não muda e o TTL é válido, nenhuma chamada de IA é
 * feita novamente. Não duplica dado clínico no banco — vive apenas no
 * dispositivo do profissional.
 */

interface CacheEnvelope<T> {
  value: T;
  signature: string;
  savedAt: number;
}

const PREFIX = "psicoone:ai-cache:";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function readAiCache<T>(
  key: string,
  signature: string,
  ttlMs = DAY_MS
): { value: T; stale: boolean; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== "object") return null;
    const expired = Date.now() - parsed.savedAt > ttlMs;
    const changed = parsed.signature !== signature;
    return { value: parsed.value, stale: expired || changed, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function writeAiCache<T>(key: string, signature: string, value: T) {
  try {
    const envelope: CacheEnvelope<T> = { value, signature, savedAt: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    /* storage cheio ou indisponível: cache é best-effort */
  }
}

export function clearAiCache(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}
