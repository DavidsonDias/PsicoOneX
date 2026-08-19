// Public endpoint used by the patient-facing room (/sala/:token) to read the
// minimal session data needed to join. telehealth_sessions is protected by RLS
// (only the owning psychologist can read it), so anonymous patients resolve the
// room through this function using the service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const roomToken: string | undefined = body?.roomToken;

    if (!roomToken || typeof roomToken !== "string" || roomToken.length < 8) {
      return json({ error: "Invalid roomToken" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("telehealth_sessions")
      .select("id, status, room_token, psychologist_id, patient_id, started_at, ended_at")
      .eq("room_token", roomToken)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: "not_found" });
    if (data.status === "ended") return json({ error: "ended" });

    // Nome do profissional (exibido na sala de espera) — sem expor outros dados
    let psychologistName: string | null = null;
    if (data.psychologist_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, clinic_name")
        .eq("id", data.psychologist_id)
        .maybeSingle();
      psychologistName = profile?.full_name ?? profile?.clinic_name ?? null;
    }

    return json({
      session: {
        id: data.id,
        status: data.status,
        room_token: data.room_token,
        started_at: data.started_at,
        psychologist_name: psychologistName,
      },
    });
  } catch (e) {
    console.error("[telehealth-room-info]", e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
