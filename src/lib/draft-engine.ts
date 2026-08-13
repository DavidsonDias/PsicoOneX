/**
 * PsicoOne — Draft Engine (Zero Data Loss Architecture)
 *
 * Camadas de persistência:
 *  1. Memória   → performance imediata
 *  2. IndexedDB → fonte principal local (sobrevive refresh/crash/PWA/offline)
 *  3. Banco     → draft remoto (tabela `drafts`, protegida por RLS por usuário)
 *
 * Nenhum conteúdo clínico é registrado em logs — apenas eventos e metadados.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  idbDraftDelete,
  idbDraftGet,
  idbDraftGetAll,
  idbDraftPut,
  type LocalDraftRecord,
} from "@/lib/offline-store";

export type DraftEntityType =
  | "patient"
  | "medical_record"
  | "appointment"
  | "financial"
  | "document"
  | "report"
  | "contract";

export type DraftMode = "new" | "edit";

export type DraftEvent =
  | "draft_created"
  | "draft_saved_local"
  | "draft_synced"
  | "draft_recovered"
  | "draft_discarded"
  | "draft_conflict"
  | "draft_sync_failed";

const DEVICE_ID_KEY = "psicoone:device-id";
const LEGACY_MIRROR_PREFIX = "psicoone:draft:";

/** Identificador estável deste dispositivo/navegador. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "dev-ephemeral";
  }
}

/** Chaves determinísticas — nunca colidem entre entidades diferentes. */
export const draftKeys = {
  patientNew: (userId: string) => `patient:new:${userId}`,
  patientEdit: (patientId: string) => `patient:edit:${patientId}`,
  medicalRecordNew: (patientId: string, userId: string) =>
    `medical-record:new:${patientId || "sem-paciente"}:${userId}`,
  medicalRecordEdit: (recordId: string) => `medical-record:edit:${recordId}`,
};

export interface DraftSnapshot {
  draftKey: string;
  entityType: DraftEntityType;
  entityId?: string | null;
  payload: any;
  version: number;
  deviceId: string;
  updatedAt: number;
  lastSyncedAt?: number | null;
  label?: string | null;
  /** true quando veio do banco (outro dispositivo) */
  remote?: boolean;
}

export function logDraftEvent(event: DraftEvent, meta: Record<string, string | number | boolean | undefined> = {}) {
  // Somente metadados — jamais conteúdo clínico.
  // eslint-disable-next-line no-console
  console.info(`[draft] ${event}`, meta);
}

// ── Camada 1: memória ──
const memory = new Map<string, DraftSnapshot>();

export function getMemoryDraft(key: string): DraftSnapshot | null {
  return memory.get(key) ?? null;
}

function toSnapshot(rec: LocalDraftRecord, remote = false): DraftSnapshot {
  return {
    draftKey: rec.draft_key,
    entityType: rec.entity_type as DraftEntityType,
    entityId: rec.entity_id ?? null,
    payload: rec.payload,
    version: rec.version,
    deviceId: rec.device_id,
    updatedAt: rec.updated_at,
    lastSyncedAt: rec.last_synced_at ?? null,
    label: rec.label ?? null,
    remote,
  };
}

// ── Camada 2: IndexedDB (+ espelho em localStorage como failsafe) ──

export interface SaveDraftInput {
  draftKey: string;
  entityType: DraftEntityType;
  entityId?: string | null;
  userId?: string | null;
  payload: any;
  label?: string | null;
}

export async function saveDraftLocal(input: SaveDraftInput): Promise<DraftSnapshot> {
  const prev = memory.get(input.draftKey);
  const snapshot: DraftSnapshot = {
    draftKey: input.draftKey,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    payload: input.payload,
    version: (prev?.version ?? 0) + 1,
    deviceId: getDeviceId(),
    updatedAt: Date.now(),
    lastSyncedAt: prev?.lastSyncedAt ?? null,
    label: input.label ?? prev?.label ?? null,
  };
  memory.set(input.draftKey, snapshot);

  const record: LocalDraftRecord = {
    draft_key: snapshot.draftKey,
    entity_type: snapshot.entityType,
    entity_id: snapshot.entityId,
    user_id: input.userId ?? null,
    payload: snapshot.payload,
    version: snapshot.version,
    device_id: snapshot.deviceId,
    updated_at: snapshot.updatedAt,
    last_synced_at: snapshot.lastSyncedAt ?? null,
    label: snapshot.label,
  };

  let idbOk = true;
  try {
    await idbDraftPut(record);
  } catch (err) {
    idbOk = false;
    logDraftEvent("draft_sync_failed", { layer: "indexeddb", key: snapshot.draftKey });
  }

  // Failsafe: espelho síncrono em localStorage (sobrevive a falhas do IndexedDB
  // e a encerramentos abruptos do processo no Android).
  try {
    localStorage.setItem(LEGACY_MIRROR_PREFIX + snapshot.draftKey, JSON.stringify(record));
  } catch {
    if (!idbOk) throw new Error("Não foi possível salvar o rascunho localmente");
  }

  logDraftEvent("draft_saved_local", { key: snapshot.draftKey, version: snapshot.version });
  return snapshot;
}

/** Persistência síncrona de emergência (pagehide/beforeunload). */
export function saveDraftLocalSync(input: SaveDraftInput): void {
  const prev = memory.get(input.draftKey);
  const record: LocalDraftRecord = {
    draft_key: input.draftKey,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    user_id: input.userId ?? null,
    payload: input.payload,
    version: (prev?.version ?? 0) + 1,
    device_id: getDeviceId(),
    updated_at: Date.now(),
    last_synced_at: prev?.lastSyncedAt ?? null,
    label: input.label ?? prev?.label ?? null,
  };
  memory.set(input.draftKey, toSnapshot(record));
  try {
    localStorage.setItem(LEGACY_MIRROR_PREFIX + input.draftKey, JSON.stringify(record));
  } catch {
    /* ignore */
  }
  void idbDraftPut(record).catch(() => {});
}

export async function getLocalDraft(draftKey: string): Promise<DraftSnapshot | null> {
  const mem = memory.get(draftKey);
  let idb: LocalDraftRecord | null = null;
  try {
    idb = await idbDraftGet(draftKey);
  } catch {
    idb = null;
  }
  let mirror: LocalDraftRecord | null = null;
  try {
    const raw = localStorage.getItem(LEGACY_MIRROR_PREFIX + draftKey);
    if (raw) mirror = JSON.parse(raw) as LocalDraftRecord;
  } catch {
    mirror = null;
  }

  const candidates: DraftSnapshot[] = [];
  if (mem) candidates.push(mem);
  if (idb) candidates.push(toSnapshot(idb));
  if (mirror) candidates.push(toSnapshot(mirror));
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function listLocalDrafts(): Promise<DraftSnapshot[]> {
  try {
    const all = await idbDraftGetAll();
    return all.map((r) => toSnapshot(r)).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

// ── Camada 3: banco (draft remoto) ──

export async function syncDraftRemote(snapshot: DraftSnapshot, userId?: string | null): Promise<boolean> {
  if (!navigator.onLine) return false;
  let uid = userId;
  if (!uid) {
    const { data } = await supabase.auth.getSession();
    uid = data.session?.user.id;
  }
  if (!uid) return false;

  const { error } = await supabase
    .from("drafts")
    .upsert(
      {
        user_id: uid,
        entity_type: snapshot.entityType,
        entity_id: snapshot.entityId ?? null,
        draft_key: snapshot.draftKey,
        payload: snapshot.payload,
        version: snapshot.version,
        device_id: snapshot.deviceId,
        status: "active",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,draft_key" },
    );

  if (error) {
    logDraftEvent("draft_sync_failed", { layer: "remote", key: snapshot.draftKey, code: error.code });
    return false;
  }

  const now = Date.now();
  const mem = memory.get(snapshot.draftKey);
  if (mem) memory.set(snapshot.draftKey, { ...mem, lastSyncedAt: now });
  try {
    const rec = await idbDraftGet(snapshot.draftKey);
    if (rec) await idbDraftPut({ ...rec, last_synced_at: now });
  } catch {
    /* ignore */
  }
  logDraftEvent("draft_synced", { key: snapshot.draftKey, version: snapshot.version });
  return true;
}

export async function getRemoteDraft(draftKey: string): Promise<DraftSnapshot | null> {
  if (!navigator.onLine) return null;
  const { data, error } = await supabase
    .from("drafts")
    .select("draft_key, entity_type, entity_id, payload, version, device_id, updated_at, last_synced_at")
    .eq("draft_key", draftKey)
    .maybeSingle();
  if (error || !data) return null;
  return {
    draftKey: data.draft_key,
    entityType: data.entity_type as DraftEntityType,
    entityId: data.entity_id,
    payload: data.payload,
    version: data.version,
    deviceId: data.device_id || "remoto",
    updatedAt: new Date(data.updated_at).getTime(),
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at).getTime() : null,
    remote: true,
  };
}

export async function listRemoteDrafts(): Promise<DraftSnapshot[]> {
  if (!navigator.onLine) return [];
  const { data, error } = await supabase
    .from("drafts")
    .select("draft_key, entity_type, entity_id, payload, version, device_id, updated_at, last_synced_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((d) => ({
    draftKey: d.draft_key,
    entityType: d.entity_type as DraftEntityType,
    entityId: d.entity_id,
    payload: d.payload,
    version: d.version,
    deviceId: d.device_id || "remoto",
    updatedAt: new Date(d.updated_at).getTime(),
    lastSyncedAt: d.last_synced_at ? new Date(d.last_synced_at).getTime() : null,
    remote: true,
  }));
}

/**
 * Remove o rascunho de TODAS as camadas.
 * Só deve ser chamado após confirmação real de que o registro oficial foi salvo.
 */
export async function deleteDraft(draftKey: string): Promise<void> {
  memory.delete(draftKey);
  try {
    localStorage.removeItem(LEGACY_MIRROR_PREFIX + draftKey);
  } catch {
    /* ignore */
  }
  try {
    await idbDraftDelete(draftKey);
  } catch {
    /* ignore */
  }
  try {
    if (navigator.onLine) await supabase.from("drafts").delete().eq("draft_key", draftKey);
  } catch {
    /* ignore */
  }
  logDraftEvent("draft_discarded", { key: draftKey });
}

// ── Utilitários ──

/** Retorna true se o payload possui algum conteúdo significativo. */
export function hasDraftContent(payload: any): boolean {
  if (!payload) return false;
  const walk = (v: any): boolean => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return false;
    if (typeof v === "boolean") return v === true;
    if (Array.isArray(v)) return v.some(walk);
    if (typeof v === "object") return Object.values(v).some(walk);
    return false;
  };
  return walk(payload);
}

export interface DraftDiffEntry {
  field: string;
  before: string;
  after: string;
  kind: "added" | "changed" | "removed";
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nome completo",
  email: "E-mail",
  phone: "Telefone",
  cpf: "CPF",
  birth_date: "Nascimento",
  address: "Endereço",
  cep: "CEP",
  street: "Rua",
  city: "Cidade",
  state: "UF",
  notes: "Observações",
  complaints: "Queixas",
  observations: "Observações",
  techniques_used: "Técnicas",
  evolution: "Evolução",
  next_steps: "Próximos passos",
  freeFormNotes: "Anotações livres",
  session_date: "Data da sessão",
  session_number: "Sessão nº",
  initial_demand: "Demanda inicial",
};

function flatten(obj: any, prefix = ""): Record<string, any> {
  const out: Record<string, any> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

export function fieldLabel(path: string): string {
  const leaf = path.split(".").pop() || path;
  return FIELD_LABELS[leaf] || leaf.replace(/_/g, " ");
}

/** Comparação campo a campo entre versão salva e rascunho. */
export function diffDrafts(saved: any, draft: any): DraftDiffEntry[] {
  const a = flatten(saved);
  const b = flatten(draft);
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  const entries: DraftDiffEntry[] = [];
  for (const k of keys) {
    const before = a[k];
    const after = b[k];
    const sBefore = before === undefined || before === null ? "" : String(before);
    const sAfter = after === undefined || after === null ? "" : String(after);
    if (sBefore === sAfter) continue;
    entries.push({
      field: fieldLabel(k),
      before: sBefore,
      after: sAfter,
      kind: !sBefore ? "added" : !sAfter ? "removed" : "changed",
    });
  }
  return entries;
}
