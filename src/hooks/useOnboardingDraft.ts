import { useCallback, useEffect, useRef, useState } from "react";

export type OnboardingDraftStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "local"
  | "synced"
  | "offline";

const LS_PREFIX = "psicoone:onboarding-draft:";

export interface OnboardingDraftSnapshot {
  payload: Record<string, any>;
  completion_percentage: number;
  current_step: number;
  updatedAt: string;
  remote?: boolean;
}

function lsKey(patientId: string) {
  return `${LS_PREFIX}${patientId}`;
}

/** Lê o rascunho local (camada rápida, resiste a refresh/fechamento/PWA). */
export function readLocalDraft(patientId?: string | null): OnboardingDraftSnapshot | null {
  if (!patientId) return null;
  try {
    const raw = localStorage.getItem(lsKey(patientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.payload) return null;
    return parsed as OnboardingDraftSnapshot;
  } catch {
    return null;
  }
}

export function clearLocalDraft(patientId?: string | null) {
  if (!patientId) return;
  try {
    localStorage.removeItem(lsKey(patientId));
  } catch {
    /* failsafe: nunca quebrar o fluxo do paciente */
  }
}

interface Options {
  /** Identidade do rascunho: o paciente (não o token temporário). */
  patientId?: string | null;
  /** URL da edge function pública. */
  functionUrl: string;
  token?: string;
  apiKey: string;
  /** Estado atual do formulário. */
  data: Record<string, any>;
  currentStep: number;
  completion: number;
  /** Pausa o autosave (ex.: após conclusão). */
  enabled?: boolean;
}

/**
 * Autosave em camadas para o self-onboarding do paciente:
 * memória → localStorage (imediato) → backend (debounce/intervalo).
 * O rascunho é vinculado ao patient_id, então um novo link/token recupera o mesmo progresso.
 */
export function useOnboardingDraft({
  patientId,
  functionUrl,
  token,
  apiKey,
  data,
  currentStep,
  completion,
  enabled = true,
}: Options) {
  const [status, setStatus] = useState<OnboardingDraftStatus>("idle");
  const [lastLocalAt, setLastLocalAt] = useState<Date | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const latest = useRef({ data, currentStep, completion });
  latest.current = { data, currentStep, completion };
  const pendingRemote = useRef(false);
  const debounce = useRef<number | null>(null);
  const firstRun = useRef(true);

  const saveLocal = useCallback(() => {
    if (!patientId) return;
    try {
      const snap: OnboardingDraftSnapshot = {
        payload: latest.current.data,
        completion_percentage: latest.current.completion,
        current_step: latest.current.currentStep,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(lsKey(patientId), JSON.stringify(snap));
      setLastLocalAt(new Date());
    } catch {
      /* failsafe: mantém em memória */
    }
  }, [patientId]);

  const syncRemote = useCallback(async () => {
    if (!patientId || !token) return;
    if (!navigator.onLine) {
      pendingRemote.current = true;
      setStatus("offline");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch(`${functionUrl}?token=${token}&action=draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({
          payload: latest.current.data,
          completion_percentage: latest.current.completion,
          current_step: latest.current.currentStep,
        }),
      });
      if (!res.ok) throw new Error("sync failed");
      pendingRemote.current = false;
      setLastSyncedAt(new Date());
      setStatus("synced");
    } catch {
      pendingRemote.current = true;
      setStatus("local");
    }
  }, [apiKey, functionUrl, patientId, token]);

  // Autosave com debounce: local imediato, backend após 1.2s de inatividade
  useEffect(() => {
    if (!enabled || !patientId) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus("dirty");
    saveLocal();
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      void syncRemote();
    }, 1200);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [data, currentStep, completion, enabled, patientId, saveLocal, syncRemote]);

  // Eventos críticos (mobile/PWA não garante beforeunload)
  useEffect(() => {
    if (!enabled || !patientId) return;
    const flush = () => {
      saveLocal();
      void syncRemote();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onOnline = () => {
      setIsOnline(true);
      if (pendingRemote.current) void syncRemote();
    };
    const onOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", saveLocal);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", saveLocal);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [enabled, patientId, saveLocal, syncRemote]);

  return {
    status,
    isOnline,
    lastLocalAt,
    lastSyncedAt,
    saveLocal,
    syncNow: syncRemote,
    clearDraft: () => clearLocalDraft(patientId),
  };
}
