const GAIN_KEY = "psicoone:dictation:gain";
const AUTO_KEY = "psicoone:dictation:autogain";

export function loadStoredGain(): number {
  const raw = Number(localStorage.getItem(GAIN_KEY));
  return Number.isFinite(raw) && raw > 0 ? Math.min(6, Math.max(0.5, raw)) : 2.5;
}

export function storeGain(gain: number) {
  localStorage.setItem(GAIN_KEY, String(gain));
}

export function loadAutoGain(): boolean {
  return localStorage.getItem(AUTO_KEY) !== "false";
}

export function storeAutoGain(enabled: boolean) {
  localStorage.setItem(AUTO_KEY, String(enabled));
}
