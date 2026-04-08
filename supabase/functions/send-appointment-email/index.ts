import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { appointmentId, patientId, token } = await req.json();

    if (!appointmentId || !patientId || !token) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios: appointmentId, patientId, token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch patient
    const { data: patient } = await supabase
      .from("patients")
      .select("full_name, email")
      .eq("id", patientId)
      .single();

    if (!patient?.email) {
      return new Response(JSON.stringify({ error: "Paciente sem e-mail cadastrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch appointment
    const { data: apt } = await supabase
      .from("appointments")
      .select("scheduled_at, duration_minutes, type, psychologist_id")
      .eq("id", appointmentId)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch psychologist name
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, clinic_name")
      .eq("id", apt.psychologist_id)
      .single();

    const date = new Date(apt.scheduled_at);
    const dateStr = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const portalUrl = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "https://psicoone.com"}/portal/${token}`;

    // Try to send via Lovable email queue (pgmq)
    const { error: emailError } = await supabase.rpc("send_email", {
      p_to: patient.email,
      p_subject: `Sessão agendada - ${dateStr}`,
      p_html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: #7c3aed; color: white; width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 20px; font-weight: bold;">P</div>
            <h1 style="margin: 10px 0 0; font-size: 24px; color: #1a1a2e;">PsicoOne</h1>
          </div>
          
          <p style="font-size: 16px; color: #333;">Olá, <strong>${patient.full_name.split(" ")[0]}</strong>!</p>
          <p style="font-size: 16px; color: #333;">Sua sessão foi agendada com sucesso.</p>
          
          <div style="background: #f8f7ff; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">📅 Data</p>
            <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1a1a2e;">${dateStr}</p>
            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">⏰ Horário</p>
            <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1a1a2e;">${timeStr} · ${apt.duration_minutes || 50} minutos</p>
            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">📍 Modalidade</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a2e;">${apt.type === "online" ? "Online (Videochamada)" : "Presencial"}</p>
            ${prof ? `<p style="margin: 16px 0 0; font-size: 14px; color: #666;">👩‍⚕️ ${prof.full_name}${prof.clinic_name ? ` · ${prof.clinic_name}` : ""}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: #7c3aed; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
              Acessar Portal da Sessão
            </a>
          </div>
          
          <p style="font-size: 13px; color: #999; text-align: center;">
            Neste portal você pode confirmar presença${apt.type === "online" ? ", entrar na videochamada" : ""} e ver os detalhes da sessão.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            🔒 PsicoOne · Plataforma Clínica Inteligente<br/>
            Este é um e-mail automático, não responda.
          </p>
        </div>
      `,
    });

    // If pgmq/send_email RPC doesn't exist yet, log and return gracefully
    if (emailError) {
      console.log("Email RPC not available yet (email infra pending):", emailError.message);
      return new Response(JSON.stringify({ 
        sent: false, 
        reason: "email_infra_pending",
        message: "Infraestrutura de e-mail ainda não configurada. O link foi gerado mas o e-mail não foi enviado." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
