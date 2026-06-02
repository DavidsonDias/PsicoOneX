// Public signal endpoint used by the patient-facing room (/sala/:token)
// to mark the moment the patient joins the waiting room so the psychologist
// receives a realtime notification.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const roomToken: string | undefined = body?.roomToken;
    const event: string = body?.event || "joined";

    if (!roomToken || typeof roomToken !== "string" || roomToken.length < 8) {
      return new Response(JSON.stringify({ error: "Invalid roomToken" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const patch: Record<string, unknown> = {};
    if (event === "joined") {
      patch.patient_joined_at = new Date().toISOString();
    } else if (event === "left") {
      patch.patient_joined_at = null;
    }

    const { error } = await supabase
      .from("telehealth_sessions")
      .update(patch)
      .eq("room_token", roomToken)
      .in("status", ["waiting", "active"]);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[telehealth-room-signal]", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
