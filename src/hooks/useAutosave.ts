import { useEffect, useRef, useState, useCallback } from "react";

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  data: any;
  onSave: (data: any, signal: AbortSignal) => Promise<void>;
  interval?: number;
  enabled?: boolean;
  retries?: number;
}

export function useAutosave({ data, onSave, interval = 3000, enabled = true, retries = 2 }: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastSavedRef = useRef<string>("");
  const savingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const save = useCallback(async () => {
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current || savingRef.current) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    savingRef.current = true;
    setStatus("saving");

    try {
      await onSave(data, controller.signal);
      lastSavedRef.current = serialized;
      retryCountRef.current = 0;
      setStatus("saved");
    } catch (err: any) {
      if (err?.name === "AbortError") { savingRef.current = false; return; }
      if (retryCountRef.current < retries) {
        retryCountRef.current++;
        setStatus("error");
        setTimeout(() => { savingRef.current = false; save(); }, 2000);
        return;
      }
      retryCountRef.current = 0;
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [data, onSave, retries]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (JSON.stringify(data) !== lastSavedRef.current) save();
    }, interval);
    return () => clearInterval(timer);
  }, [data, save, interval, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const h = () => { save(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const h = () => { if (document.visibilityState === "hidden") save(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [save, enabled]);

  useEffect(() => {
    if (lastSavedRef.current === "") lastSavedRef.current = JSON.stringify(data);
  }, []);

  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  return { status, save };
}
