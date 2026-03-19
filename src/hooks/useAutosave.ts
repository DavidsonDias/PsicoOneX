import { useEffect, useRef, useState, useCallback } from "react";

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  data: any;
  onSave: (data: any) => Promise<void>;
  interval?: number; // ms, default 3000
  enabled?: boolean;
}

export function useAutosave({ data, onSave, interval = 3000, enabled = true }: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const save = useCallback(async () => {
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current || savingRef.current) return;

    savingRef.current = true;
    setStatus("saving");
    try {
      await onSave(data);
      lastSavedRef.current = serialized;
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [data, onSave]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return;
    timerRef.current = setInterval(() => {
      const serialized = JSON.stringify(data);
      if (serialized !== lastSavedRef.current) {
        save();
      }
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data, save, interval, enabled]);

  // Save on page unload
  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = () => { save(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [save, enabled]);

  // Save on visibility change (tab switch)
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [save, enabled]);

  // Initialize lastSavedRef with initial data
  useEffect(() => {
    if (lastSavedRef.current === "") {
      lastSavedRef.current = JSON.stringify(data);
    }
  }, []);

  return { status, save };
}
