import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecordVersion {
  id: string;
  record_id: string;
  version_number: number;
  content: any;
  title: string | null;
  change_reason: string | null;
  created_by: string;
  created_at: string;
}

export interface VersionSnapshotInput {
  recordId: string;
  content: Record<string, any>;
  changeReason?: string;
}

/**
 * Hook para gestão de versões de prontuário.
 * - listVersions(recordId)
 * - saveVersion({ recordId, content }) → snapshot incremental
 * - restoreVersion(version) → devolve o conteúdo para reaplicar no editor
 */
export function useRecordVersions(recordId?: string | null) {
  const [versions, setVersions] = useState<RecordVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const listVersions = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_record_versions" as any)
      .select("*")
      .eq("record_id", id)
      .order("version_number", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("[useRecordVersions]", error);
      return [];
    }
    const list = (data || []) as unknown as RecordVersion[];
    setVersions(list);
    return list;
  }, []);

  useEffect(() => {
    if (recordId) listVersions(recordId);
  }, [recordId, listVersions]);

  const saveVersion = useCallback(async ({ recordId, content, changeReason }: VersionSnapshotInput) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Next version number
    const { data: last } = await supabase
      .from("medical_record_versions" as any)
      .select("version_number")
      .eq("record_id", recordId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const next = ((last as any)?.version_number ?? 0) + 1;

    const { data, error } = await supabase
      .from("medical_record_versions" as any)
      .insert({
        record_id: recordId,
        version_number: next,
        content,
        change_reason: changeReason || null,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[saveVersion]", error);
      return null;
    }
    return data as unknown as RecordVersion;
  }, []);

  const restoreVersion = useCallback(async (version: RecordVersion) => {
    const content = version.content || {};
    const { error } = await supabase
      .from("medical_records")
      .update({
        complaints: content.complaints ?? null,
        observations: content.observations ?? null,
        techniques_used: content.techniques_used ?? null,
        evolution: content.evolution ?? null,
        next_steps: content.next_steps ?? null,
      })
      .eq("id", version.record_id);
    if (error) {
      toast.error("Não foi possível restaurar essa versão");
      return false;
    }
    toast.success(`Versão #${version.version_number} restaurada`);
    return true;
  }, []);

  return { versions, loading, listVersions, saveVersion, restoreVersion };
}
