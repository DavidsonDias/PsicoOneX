import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DAY_MS, readAiCache, writeAiCache } from "@/lib/ai-cache";

export interface ProactiveInsight {
  id: string;
  type: "success" | "warning" | "critical" | "trend" | "info" | "ai";
  category: "agenda" | "financial" | "patients" | "ai";
  title: string;
  description: string;
  action?: { label: string; path: string };
  metric?: string;
  priority: "high" | "medium" | "low";
}

export interface StrategicMetrics {
  predictedRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  attendanceRate: number;
  activePatients: number;
  inactivePatients: number;
  totalPatients: number;
  appointmentsThisMonth: number;
  completedThisMonth: number;
  cancelledThisMonth: number;
  inactiveRiskCount: number;
}

const AI_CACHE_KEY = "dashboard-insights";

export function useProactiveInsights() {
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [metrics, setMetrics] = useState<StrategicMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aiInsights = useRef<ProactiveInsight[]>([]);

  const merge = useCallback((base: ProactiveInsight[]) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...base, ...aiInsights.current].sort(
      (a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    );
  }, []);

  /**
   * useAI = false (padrão): apenas os insights determinísticos, sem nenhuma
   * chamada de IA. useAI = true: ação explícita do profissional, com cache
   * diário — enquanto o cache é válido a IA não é chamada novamente.
   */
  const fetchInsights = useCallback(
    async (useAI = false) => {
      if (useAI) setIsAnalyzing(true);
      else setIsLoading(true);
      setError(null);
      try {
        let wantAI = false;
        if (useAI) {
          const cached = readAiCache<ProactiveInsight[]>(AI_CACHE_KEY, "v1", DAY_MS);
          if (cached && !cached.stale) {
            aiInsights.current = cached.value;
            setAiGeneratedAt(cached.savedAt);
          } else {
            wantAI = true;
          }
        }

        const { data, error: fnError } = await supabase.functions.invoke("proactive-insights", {
          body: { useAI: wantAI },
        });

        if (fnError) throw fnError;
        const all = (data?.insights || []) as ProactiveInsight[];
        const base = all.filter((i) => i.type !== "ai");

        if (wantAI) {
          const fresh = all.filter((i) => i.type === "ai");
          aiInsights.current = fresh;
          writeAiCache(AI_CACHE_KEY, "v1", fresh);
          setAiGeneratedAt(Date.now());
        }

        setInsights(merge(base));
        setMetrics(data?.metrics || null);
      } catch (e: any) {
        console.error("Error fetching insights:", e);
        setError(e.message || "Erro ao carregar insights");
      } finally {
        setIsLoading(false);
        setIsAnalyzing(false);
      }
    },
    [merge]
  );

  useEffect(() => {
    // Restaura análise de IA já paga (cache diário) sem nova chamada
    const cached = readAiCache<ProactiveInsight[]>(AI_CACHE_KEY, "v1", DAY_MS);
    if (cached && !cached.stale) {
      aiInsights.current = cached.value;
      setAiGeneratedAt(cached.savedAt);
    }
    fetchInsights(false);
  }, [fetchInsights]);

  return {
    insights,
    metrics,
    isLoading,
    isAnalyzing,
    aiGeneratedAt,
    hasAiAnalysis: aiInsights.current.length > 0,
    error,
    refresh: fetchInsights,
  };
}
