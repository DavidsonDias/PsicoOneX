import { supabase } from "@/integrations/supabase/client";

interface SyncAppointmentData {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: string;
  notes?: string | null;
  patient_name: string;
  google_event_id?: string | null;
}

export async function syncAppointmentToGoogle(
  action: "create" | "update" | "cancel",
  appointment: SyncAppointmentData
) {
  try {
    const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action, appointment },
    });

    if (error) {
      console.error("Google Calendar sync error:", error);
      return null;
    }

    if (data?.skipped) {
      return null;
    }

    return data;
  } catch (err) {
    console.error("Google Calendar sync failed:", err);
    return null;
  }
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke("google-calendar-auth", {
      body: { action: "status" },
    });
    return data?.connected === true && data?.sync_enabled !== false;
  } catch {
    return false;
  }
}
