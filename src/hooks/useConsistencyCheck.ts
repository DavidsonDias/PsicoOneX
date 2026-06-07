import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConsistencyIssue {
  field?: string;
  severity: "info" | "warning" | "error";
  message: string;
  suggestion?: string;
  suggested_value?: any;
}

export type ValidationKind = "patient" | "appointment" | "billing_plan";

export function useConsistencyCheck() {
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async (kind: ValidationKind, data: any, useAI = false) => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("validate-consistency", {
        body: { kind, data, useAI },
      });
      if (error) throw error;
      const list = (res?.issues || []) as ConsistencyIssue[];
      setIssues(list);
      return list;
    } catch (e) {
      console.error("[consistency]", e);
      setIssues([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setIssues([]), []);

  return { issues, loading, check, clear };
}
