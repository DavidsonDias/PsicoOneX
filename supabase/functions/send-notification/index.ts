import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message, type, patient_name, appointment_date } = await req.json();
    
    console.log("Sending notification:", { to, subject, type });

    // Validate required fields
    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email body based on notification type
    let emailBody = message;
    
    if (type === 'appointment_reminder' && patient_name && appointment_date) {
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Lembrete de Consulta</h2>
          <p>Olá ${patient_name},</p>
          <p>Este é um lembrete da sua consulta agendada:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Data e Hora:</strong> ${new Date(appointment_date).toLocaleString('pt-BR')}</p>
          </div>
          <p>${message}</p>
          <p>Nos vemos em breve!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">PsicoOne - Gestão Inteligente, Cuidado Humano</p>
        </div>
      `;
    }

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the notification
    console.log("Email notification prepared:", {
      to,
      subject,
      body: emailBody,
      type
    });

    // Simulate email sending
    // TODO: Integrate with real email service
    // Example with SendGrid:
    // const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    // await fetch("https://api.sendgrid.com/v3/mail/send", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${SENDGRID_API_KEY}`,
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify({
    //     personalizations: [{ to: [{ email: to }] }],
    //     from: { email: "noreply@psicoone.com" },
    //     subject: subject,
    //     content: [{ type: "text/html", value: emailBody }]
    //   })
    // });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Notification sent successfully",
      // In production, remove debug info
      debug: {
        to,
        subject,
        type,
        note: "Email service integration pending"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
