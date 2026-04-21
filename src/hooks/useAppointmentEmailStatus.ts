import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EmailStatus = "sent" | "failed" | "queued" | "suppressed" | "never";

export interface AppointmentEmailRecord {
  status: EmailStatus;
  template_name: string;
  sent_at: string;
}

/**
 * Batch-fetches the latest email send status for a list of appointments.
 * Uses a SECURITY DEFINER function scoped to the calling psychologist.
 */
export function useAppointmentEmailStatus(appointmentIds: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, AppointmentEmailRecord>>({});
  const [loading, setLoading] = useState(false);

  const fetchStatuses = useCallback(async () => {
    if (appointmentIds.length === 0) {
      setStatusMap({});
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_appointment_email_status" as any, {
        _appointment_ids: appointmentIds,
      });
      if (error) {
        console.warn("[email-status] rpc error:", error.message);
        return;
      }
      const map: Record<string, AppointmentEmailRecord> = {};
      (data || []).forEach((row: any) => {
        map[row.appointment_id] = {
          status: row.status as EmailStatus,
          template_name: row.template_name,
          sent_at: row.sent_at,
        };
      });
      setStatusMap(map);
    } finally {
      setLoading(false);
    }
  }, [appointmentIds.join(",")]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  return { statusMap, loading, refresh: fetchStatuses };
}
