import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useProactiveInsights() {
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [metrics, setMetrics] = useState<StrategicMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (useAI = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("proactive-insights", {
        body: { useAI },
      });

      if (fnError) throw fnError;
      setInsights(data.insights || []);
      setMetrics(data.metrics || null);
    } catch (e: any) {
      console.error("Error fetching insights:", e);
      setError(e.message || "Erro ao carregar insights");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(true);
  }, [fetchInsights]);

  return { insights, metrics, isLoading, error, refresh: fetchInsights };
}
