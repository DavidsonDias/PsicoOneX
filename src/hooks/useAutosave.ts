import { useEffect, useRef, useState, useCallback } from "react";

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  data: any;
  onSave: (data: any, signal: AbortSignal) => Promise<void>;
  interval?: number;
  enabled?: boolean;
  retries?: number;
  /** localStorage key for fallback persistence */
  localStorageKey?: string;
}

export function useAutosave({
  data,
  onSave,
  interval = 3000,
  enabled = true,
  retries = 2,
  localStorageKey,
}: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSavedRef = useRef<string>("");
  const savingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Persist to localStorage as fallback
  useEffect(() => {
    if (!enabled || !localStorageKey || !data) return;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(data));
    } catch { /* quota exceeded – ignore */ }
  }, [data, enabled, localStorageKey]);

  const save = useCallback(async () => {
    const currentData = dataRef.current;
    if (!currentData) return;
    const serialized = JSON.stringify(currentData);
    if (serialized === lastSavedRef.current || savingRef.current) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    savingRef.current = true;
    setStatus("saving");

    try {
      await onSave(currentData, controller.signal);
      lastSavedRef.current = serialized;
      retryCountRef.current = 0;
      setStatus("saved");
      setLastSavedAt(new Date());
      // Clear localStorage on successful save
      if (localStorageKey) {
        try { localStorage.removeItem(localStorageKey); } catch { /* ignore */ }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        savingRef.current = false;
        return;
      }
      if (retryCountRef.current < retries) {
        retryCountRef.current++;
        setStatus("error");
        setTimeout(() => {
          savingRef.current = false;
          save();
        }, 2000);
        return;
      }
      retryCountRef.current = 0;
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [onSave, retries, localStorageKey]);

  // Periodic save
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (JSON.stringify(dataRef.current) !== lastSavedRef.current) save();
    }, interval);
    return () => clearInterval(timer);
  }, [save, interval, enabled]);

  // Save on page unload
  useEffect(() => {
    if (!enabled) return;
    const h = () => save();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save, enabled]);

  // Save on visibility change (tab switch)
  useEffect(() => {
    if (!enabled) return;
    const h = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [save, enabled]);

  // Initialize lastSavedRef so first identical state doesn't trigger save
  useEffect(() => {
    if (!enabled) return;
    if (lastSavedRef.current === "" && data) {
      lastSavedRef.current = JSON.stringify(data);
    }
  }, [data, enabled]);

  // Cleanup abort on unmount
  useEffect(() => () => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return { status, save, lastSavedAt };
}

/** Recover a draft from localStorage */
export function recoverDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Clear a draft from localStorage */
export function clearDraft(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
