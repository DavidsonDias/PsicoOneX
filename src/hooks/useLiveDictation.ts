import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DictationRecorder } from "@/lib/audio/dictation-recorder";

const GAIN_KEY = "psicoone:dictation:gain";

export function loadStoredGain(): number {
  const raw = Number(localStorage.getItem(GAIN_KEY));
  return Number.isFinite(raw) && raw > 0 ? Math.min(6, Math.max(0.5, raw)) : 2.5;
}

export function storeGain(gain: number) {
  localStorage.setItem(GAIN_KEY, String(gain));
}

interface UseLiveDictationOptions {
  language?: string;
  onError?: (message: string) => void;
}

export function useLiveDictation({ language = "pt", onError }: UseLiveDictationOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [level, setLevel] = useState(0);
  const [text, setText] = useState("");
  const [gain, setGainState] = useState<number>(() => loadStoredGain());
  const [inBackground, setInBackground] = useState(false);

  const recorderRef = useRef<DictationRecorder | null>(null);
  const pendingRef = useRef(0);
  const textRef = useRef("");
  const levelRaf = useRef<number | null>(null);
  const lastLevel = useRef(0);

  useEffect(() => {
    // Atualiza o medidor no máximo ~15x/s para não sobrecarregar o React
    const tick = () => {
      setLevel(lastLevel.current);
      levelRaf.current = window.setTimeout(tick, 66) as unknown as number;
    };
    tick();
    return () => {
      if (levelRaf.current) clearTimeout(levelRaf.current);
    };
  }, []);

  const appendText = useCallback((chunk: string) => {
    const clean = chunk.trim();
    if (!clean) return;
    textRef.current = textRef.current ? `${textRef.current} ${clean}` : clean;
    setText(textRef.current);
  }, []);

  const transcribeWindow = useCallback(
    async (base64: string, mimeType: string) => {
      pendingRef.current += 1;
      setIsTranscribing(true);
      try {
        const { data, error } = await supabase.functions.invoke("speech-to-text", {
          body: { audio: base64, mimeType, language },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.text) appendText(data.text);
      } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : "Falha ao transcrever o áudio";
        onError?.(msg);
      } finally {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        if (pendingRef.current === 0) setIsTranscribing(false);
      }
    },
    [appendText, language, onError]
  );

  const setGain = useCallback((next: number) => {
    setGainState(next);
    storeGain(next);
    recorderRef.current?.setGain(next);
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current?.isRunning) return true;
    textRef.current = "";
    setText("");

    const recorder = new DictationRecorder({
      gain,
      windowMs: 6000,
      onWindow: ({ base64, mimeType }) => void transcribeWindow(base64, mimeType),
      onLevel: (rms) => {
        lastLevel.current = Math.min(1, rms * 12);
      },
      onError: (msg) => onError?.(msg),
      onBackgroundState: setInBackground,
    });

    const ok = await recorder.start();
    if (!ok) return false;
    recorderRef.current = recorder;
    setIsRecording(true);
    return true;
  }, [gain, onError, transcribeWindow]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setIsRecording(false);
    lastLevel.current = 0;
    await recorder?.stop();
    // Aguarda as janelas em voo terminarem
    const deadline = Date.now() + 20000;
    while (pendingRef.current > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250));
    }
    setIsTranscribing(false);
    return textRef.current;
  }, []);

  const cancel = useCallback(async () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setIsRecording(false);
    lastLevel.current = 0;
    textRef.current = "";
    setText("");
    await recorder?.stop();
  }, []);

  const reset = useCallback(() => {
    textRef.current = "";
    setText("");
  }, []);

  useEffect(() => {
    return () => {
      void recorderRef.current?.stop();
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    level,
    text,
    gain,
    setGain,
    inBackground,
    start,
    stop,
    cancel,
    reset,
  };
}
