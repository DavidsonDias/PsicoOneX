import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, action } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch link
    const { data: link, error: linkErr } = await supabase
      .from("patient_access_links")
      .select("*")
      .eq("token", token)
      .single();

    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: "Link não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.is_revoked) {
      return new Response(JSON.stringify({ error: "Link revogado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link expirado" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle confirm action
    if (action === "confirm") {
      await supabase
        .from("patient_access_links")
        .update({ used_at: new Date().toISOString() })
        .eq("id", link.id);

      if (link.appointment_id) {
        await supabase
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", link.appointment_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle join session action
    if (action === "join") {
      if (!link.appointment_id) {
        return new Response(JSON.stringify({ error: "Sem agendamento vinculado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: session } = await supabase
        .from("telehealth_sessions")
        .select("room_token")
        .eq("appointment_id", link.appointment_id)
        .in("status", ["waiting", "active"])
        .single();

      return new Response(JSON.stringify({ room_token: session?.room_token || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: return portal data
    let appointment = null;
    let patient = null;
    let psychologist = null;

    if (link.appointment_id) {
      const { data: apt } = await supabase
        .from("appointments")
        .select("id, scheduled_at, duration_minutes, type, status, notes, psychologist_id")
        .eq("id", link.appointment_id)
        .single();
      appointment = apt;

      if (apt?.psychologist_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, specialty, clinic_name")
          .eq("id", apt.psychologist_id)
          .single();
        psychologist = prof;
      }
    }

    const { data: pat } = await supabase
      .from("patients")
      .select("full_name, email, phone")
      .eq("id", link.patient_id)
      .single();
    patient = pat;

    return new Response(
      JSON.stringify({
        link: { id: link.id, expires_at: link.expires_at, used_at: link.used_at },
        appointment,
        patient,
        psychologist,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
