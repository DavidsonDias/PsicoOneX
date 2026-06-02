import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playWaitingRoomChime } from "@/lib/telehealth-sound";

interface Options {
  /** Active psychologist id. Hook only subscribes when present. */
  psychologistId: string | null | undefined;
  /** Optional callback when a patient enters any waiting room. */
  onPatientJoined?: (sessionId: string) => void;
}

/**
 * Listens (realtime) for any telehealth_sessions of the psychologist whose
 * patient_joined_at transitions to a non-null value (= patient reached the
 * waiting room) and plays a chime + toast so the host notices.
 */
export function useWaitingRoomNotifier({ psychologistId, onPatientJoined }: Options) {
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!psychologistId) return;
    const channel = supabase
      .channel(`waiting-room-${psychologistId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "telehealth_sessions",
          filter: `psychologist_id=eq.${psychologistId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (!newRow?.patient_joined_at) return;
          if (oldRow?.patient_joined_at) return; // not a transition
          if (newRow.status === "ended") return;
          if (seenRef.current.has(newRow.id)) return;
          seenRef.current.add(newRow.id);
          playWaitingRoomChime();
          toast.success("Paciente entrou na sala de espera", {
            description: "Inicie a chamada para atender agora.",
            duration: 8000,
          });
          onPatientJoined?.(newRow.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [psychologistId, onPatientJoined]);
}
