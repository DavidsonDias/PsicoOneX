import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteDraft,
  getLocalDraft,
  getRemoteDraft,
  hasDraftContent,
  logDraftEvent,
  saveDraftLocal,
  saveDraftLocalSync,
  syncDraftRemote,
  type DraftEntityType,
  type DraftSnapshot,
} from "@/lib/draft-engine";

export type DraftStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "local"
  | "synced"
  | "sync_failed"
  | "failed";

interface UseDraftRecoveryOptions<T> {
  /** Chave determinística do rascunho. Passe null para desabilitar. */
  draftKey: string | null;
  entityType: DraftEntityType;
  entityId?: string | null;
  userId?: string | null;
  /** Dados atuais do formulário (serializáveis). */
  data: T | null;
  enabled?: boolean;
  /** Debounce local após parar de digitar (ms). */
  debounceMs?: number;
  /** Intervalo mínimo de sincronização remota (ms). */
  remoteIntervalMs?: number;
  /** Rótulo humano exibido na central de rascunhos. */
  label?: string | null;
  /** Timestamp da versão oficial salva no banco (para detectar rascunho mais recente). */
  savedAt?: string | number | null;
}

export function useDraftRecovery<T>({
  draftKey,
  entityType,
  entityId,
  userId,
  data,
  enabled = true,
  debounceMs = 800,
  remoteIntervalMs = 8000,
  label,
  savedAt,
}: UseDraftRecoveryOptions<T>) {
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [lastLocalAt, setLastLocalAt] = useState<Date | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DraftSnapshot | null>(null);
  const [conflict, setConflict] = useState<DraftSnapshot | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const dataRef = useRef<T | null>(data);
  dataRef.current = data;
  const lastSerializedRef = useRef<string>("");
  const baselineRef = useRef<string>("");
  const lastRemoteSyncRef = useRef<number>(0);
  const keyRef = useRef<string | null>(draftKey);
  keyRef.current = draftKey;

  const serialized = useMemo(() => (data ? JSON.stringify(data) : ""), [data]);

  /** Define a versão de referência (após carregar/restaurar) para não marcar sujo sem motivo. */
  const setBaseline = useCallback((value: T | null) => {
    baselineRef.current = value ? JSON.stringify(value) : "";
    lastSerializedRef.current = baselineRef.current;
    setStatus("idle");
  }, []);

  const persist = useCallback(
    async (opts: { remote?: boolean } = {}) => {
      const key = keyRef.current;
      const current = dataRef.current;
      if (!enabled || !key || !current) return;
      const snap = JSON.stringify(current);
      if (snap === baselineRef.current && !lastLocalAt) return;
      if (snap === lastSerializedRef.current) return;

      setStatus("saving");
      try {
        const saved = await saveDraftLocal({
          draftKey: key,
          entityType,
          entityId: entityId ?? null,
          userId: userId ?? null,
          payload: current,
          label: label ?? null,
        });
        lastSerializedRef.current = snap;
        setLastLocalAt(new Date(saved.updatedAt));
        setStatus("local");

        const shouldSyncRemote =
          opts.remote !== false && navigator.onLine && Date.now() - lastRemoteSyncRef.current > remoteIntervalMs;
        if (shouldSyncRemote) {
          lastRemoteSyncRef.current = Date.now();
          const ok = await syncDraftRemote(saved, userId ?? null);
          if (ok) {
            setLastSyncedAt(new Date());
            setStatus("synced");
          } else {
            setStatus(navigator.onLine ? "sync_failed" : "local");
          }
        }
      } catch {
        setStatus("failed");
      }
    },
    [enabled, entityType, entityId, userId, label, remoteIntervalMs, lastLocalAt],
  );

  /** Salvamento imediato (fechar modal, trocar de rota, etc). */
  const saveNow = useCallback(async () => {
    await persist({ remote: true });
  }, [persist]);

  // Debounce a cada alteração
  useEffect(() => {
    if (!enabled || !draftKey || !serialized) return;
    if (serialized === lastSerializedRef.current) return;
    setStatus((s) => (s === "saving" ? s : "dirty"));
    const t = setTimeout(() => void persist(), debounceMs);
    return () => clearTimeout(t);
  }, [serialized, enabled, draftKey, debounceMs, persist]);

  // Eventos críticos: visibilitychange, pagehide, beforeunload, offline
  useEffect(() => {
    if (!enabled || !draftKey) return;

    const flushSync = () => {
      const current = dataRef.current;
      const key = keyRef.current;
      if (!current || !key) return;
      const snap = JSON.stringify(current);
      if (snap === lastSerializedRef.current) return;
      saveDraftLocalSync({
        draftKey: key,
        entityType,
        entityId: entityId ?? null,
        userId: userId ?? null,
        payload: current,
        label: label ?? null,
      });
      lastSerializedRef.current = snap;
      setLastLocalAt(new Date());
      setStatus("local");
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSync();
    };
    const onOnline = () => {
      setIsOnline(true);
      void persist({ remote: true });
    };
    const onOffline = () => {
      setIsOnline(false);
      flushSync();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushSync);
    window.addEventListener("beforeunload", flushSync);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushSync);
      window.removeEventListener("beforeunload", flushSync);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      flushSync();
    };
  }, [enabled, draftKey, entityType, entityId, userId, label, persist]);

  /** Busca o rascunho mais recente (local + remoto) e decide se deve ser oferecido. */
  const checkForDraft = useCallback(async () => {
    if (!draftKey) return null;
    const [local, remote] = await Promise.all([getLocalDraft(draftKey), getRemoteDraft(draftKey)]);
    const candidates = [local, remote].filter(Boolean) as DraftSnapshot[];
    if (candidates.length === 0) {
      setPendingDraft(null);
      return null;
    }
    const newest = candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0];

    // Conflito: rascunho remoto de outro dispositivo mais recente que o local
    if (
      local &&
      remote &&
      remote.deviceId !== local.deviceId &&
      Math.abs(remote.updatedAt - local.updatedAt) > 2000
    ) {
      setConflict(remote.updatedAt > local.updatedAt ? remote : local);
      logDraftEvent("draft_conflict", { key: draftKey });
    }

    const savedTs = savedAt ? new Date(savedAt).getTime() : 0;
    if (!hasDraftContent(newest.payload) || newest.updatedAt <= savedTs) {
      setPendingDraft(null);
      return null;
    }
    setPendingDraft(newest);
    return newest;
  }, [draftKey, savedAt]);

  const restore = useCallback(
    (apply: (payload: any) => void) => {
      if (!pendingDraft) return;
      apply(pendingDraft.payload);
      lastSerializedRef.current = JSON.stringify(pendingDraft.payload);
      baselineRef.current = lastSerializedRef.current;
      setLastLocalAt(new Date(pendingDraft.updatedAt));
      setStatus("local");
      setPendingDraft(null);
      logDraftEvent("draft_recovered", { key: pendingDraft.draftKey, version: pendingDraft.version });
    },
    [pendingDraft],
  );

  const discard = useCallback(async () => {
    if (!draftKey) return;
    await deleteDraft(draftKey);
    setPendingDraft(null);
    setConflict(null);
    setStatus("idle");
    setLastLocalAt(null);
    lastSerializedRef.current = "";
  }, [draftKey]);

  /** Só chame depois da confirmação real do backend. */
  const commit = useCallback(
    async (newKey?: string) => {
      const keys = [draftKey, newKey].filter(Boolean) as string[];
      for (const k of keys) await deleteDraft(k);
      setPendingDraft(null);
      setStatus("idle");
      setLastLocalAt(null);
      lastSerializedRef.current = "";
      baselineRef.current = "";
    },
    [draftKey],
  );

  return {
    status,
    isOnline,
    lastLocalAt,
    lastSyncedAt,
    pendingDraft,
    conflict,
    dismissConflict: () => setConflict(null),
    checkForDraft,
    restore,
    discard,
    commit,
    saveNow,
    setBaseline,
  };
}
