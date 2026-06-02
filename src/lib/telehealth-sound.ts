// Lightweight notification beep using Web Audio (no asset download).
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function playWaitingRoomChime() {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const now = c.currentTime;
  // Two-note rising chime
  [
    { f: 660, t: 0, d: 0.18 },
    { f: 880, t: 0.16, d: 0.22 },
  ].forEach(({ f, t, d }) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
    osc.connect(gain).connect(c.destination);
    osc.start(now + t);
    osc.stop(now + t + d + 0.02);
  });
}
