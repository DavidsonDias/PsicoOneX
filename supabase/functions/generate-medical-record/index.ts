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
    const { complaints, observations, techniques_used, evolution, patient_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating medical record with AI...");

    // Build prompt for AI to enhance the medical record
    const prompt = `Você é um assistente especializado em psicologia clínica. Com base nas informações fornecidas sobre a sessão do paciente ${patient_name}, gere um prontuário profissional e detalhado.

INFORMAÇÕES DA SESSÃO:
${complaints ? `Queixas: ${complaints}` : ''}
${observations ? `Observações: ${observations}` : ''}
${techniques_used ? `Técnicas: ${techniques_used}` : ''}
${evolution ? `Evolução: ${evolution}` : ''}

Gere um prontuário completo e profissional em formato JSON com os seguintes campos:
- complaints: Uma descrição clara e objetiva das queixas apresentadas
- observations: Observações clínicas detalhadas sobre estado emocional, comportamento e relatos
- techniques_used: Descrição das técnicas terapêuticas aplicadas e exercícios propostos
- evolution: Análise da evolução do tratamento e progressos observados
- next_steps: Plano terapêutico para as próximas sessões

IMPORTANTE: 
- Seja profissional e objetivo
- Use terminologia técnica apropriada
- Mantenha confidencialidade e ética profissional
- Retorne APENAS o JSON, sem texto adicional`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um assistente especializado em psicologia clínica que ajuda a gerar prontuários profissionais." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings -> Workspace -> Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log("AI Response:", aiResponse);

    // Try to parse the JSON response
    let parsedRecord;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedRecord = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback: return original data with AI response as observations
      parsedRecord = {
        complaints: complaints || "",
        observations: aiResponse,
        techniques_used: techniques_used || "",
        evolution: evolution || "",
        next_steps: ""
      };
    }

    return new Response(JSON.stringify(parsedRecord), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-medical-record function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});