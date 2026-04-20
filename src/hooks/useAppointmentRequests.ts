import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AppointmentRequest {
  id: string;
  appointment_id: string;
  patient_id: string;
  psychologist_id: string;
  request_type: "cancel" | "reschedule" | "message" | "confirm";
  status: "pending" | "approved" | "rejected" | "acknowledged";
  proposed_date: string | null;
  reason: string | null;
  message: string | null;
  psychologist_response: string | null;
  responded_at: string | null;
  created_at: string;
  patient_name?: string;
}

/**
 * Realtime hook for psychologist-side appointment requests panel.
 * Returns only requests requiring action (pending) by default.
 */
export function useAppointmentRequests(psychologistId: string | undefined) {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!psychologistId) return;
    const { data, error } = await supabase
      .from("appointment_requests")
      .select("*, patients(full_name)")
      .eq("psychologist_id", psychologistId)
      .in("status", ["pending"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[useAppointmentRequests]", error);
      setLoading(false);
      return;
    }
    const mapped = (data || []).map((r: any) => ({
      ...r,
      patient_name: r.patients?.full_name,
    }));
    setRequests(mapped);
    setLoading(false);
  }, [psychologistId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!psychologistId) return;
    const channel = supabase
      .channel(`appointment-requests-${psychologistId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointment_requests",
          filter: `psychologist_id=eq.${psychologistId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as any;
            // Show toast for new pending requests
            if (r.status === "pending") {
              const labels: Record<string, string> = {
                cancel: "❌ Sessão cancelada pelo paciente",
                reschedule: "🔄 Solicitação de reagendamento",
                message: "💬 Nova mensagem do paciente",
                confirm: "✅ Presença confirmada",
              };
              toast.info(labels[r.request_type] || "Nova ação do paciente", {
                description: r.message || r.reason || "Veja na agenda",
              });
            }
          }
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [psychologistId, load]);

  const approveReschedule = async (request: AppointmentRequest) => {
    if (!request.proposed_date) return;
    // Update appointment to new date
    const { error: aptErr } = await supabase
      .from("appointments")
      .update({
        scheduled_at: request.proposed_date,
        status: "rescheduled",
      })
      .eq("id", request.appointment_id);

    if (aptErr) {
      toast.error("Erro ao reagendar");
      return;
    }

    await supabase
      .from("appointment_requests")
      .update({
        status: "approved",
        responded_at: new Date().toISOString(),
        responded_by: psychologistId,
      })
      .eq("id", request.id);

    toast.success("Reagendamento aprovado");
    load();
  };

  const rejectRequest = async (requestId: string, response?: string) => {
    await supabase
      .from("appointment_requests")
      .update({
        status: "rejected",
        responded_at: new Date().toISOString(),
        responded_by: psychologistId,
        psychologist_response: response || null,
      })
      .eq("id", requestId);
    toast.success("Solicitação recusada");
    load();
  };

  const acknowledge = async (requestId: string) => {
    await supabase
      .from("appointment_requests")
      .update({
        status: "acknowledged",
        responded_at: new Date().toISOString(),
        responded_by: psychologistId,
      })
      .eq("id", requestId);
    load();
  };

  return {
    requests,
    loading,
    pendingCount: requests.length,
    approveReschedule,
    rejectRequest,
    acknowledge,
    refresh: load,
  };
}
