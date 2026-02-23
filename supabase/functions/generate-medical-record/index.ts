import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_PROMPT_VERSION = "2.0_ENTERPRISE";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { complaints, observations, techniques_used, evolution, patient_name, free_notes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating medical record with AI (prompt version: ${AI_PROMPT_VERSION})...`);

    const prompt = `Você é um assistente especializado em psicologia clínica. Com base nas informações fornecidas sobre a sessão do paciente ${patient_name}, gere um prontuário clínico estruturado em formato livre, seguindo boas práticas da psicologia.

INFORMAÇÕES DA SESSÃO:
${complaints ? `Queixas: ${complaints}` : ''}
${observations ? `Observações: ${observations}` : ''}
${techniques_used ? `Técnicas: ${techniques_used}` : ''}
${evolution ? `Evolução: ${evolution}` : ''}
${free_notes ? `Anotações livres do profissional: ${free_notes}` : ''}

Gere um prontuário clínico completo e profissional em formato JSON com os seguintes campos:

- complaints: Descrição clara e contextualizada das queixas e demandas apresentadas pelo paciente na sessão
- observations: Observações clínicas detalhadas incluindo:
  • Estado emocional e afetivo observado
  • Comportamento e postura durante a sessão
  • Relatos significativos do paciente
  • Análise do discurso e temas predominantes
  • Dinâmica relacional (transferência/contratransferência quando aplicável)
- techniques_used: Intervenções realizadas durante a sessão:
  • Técnicas terapêuticas aplicadas e sua fundamentação
  • Exercícios propostos (em sessão e/ou para casa)
  • Recursos utilizados (escalas, materiais, etc.)
- evolution: Análise da evolução clínica:
  • Progressos observados em relação aos objetivos terapêuticos
  • Comparativo com sessões anteriores
  • Indicadores de melhora ou pontos de atenção
- next_steps: Plano terapêutico:
  • Direcionamento para próximas sessões
  • Hipóteses clínicas a explorar
  • Encaminhamentos se necessário
  • Reavaliação de objetivos quando pertinente

IMPORTANTE: 
- Seja profissional, objetivo e ético
- Use terminologia técnica adequada à psicologia clínica
- Mantenha o sigilo e a confidencialidade
- Formato fluido e profissional, pronto para registro clínico
- Retorne APENAS o JSON válido, sem texto adicional
- NÃO use modelo fixo pré-definido com campos rígidos`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um assistente especializado em psicologia clínica que ajuda a gerar prontuários profissionais em formato livre e estruturado. Sempre retorne JSON válido." },
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
    
    console.log("AI Response received, prompt version:", AI_PROMPT_VERSION);

    let parsedRecord;
    try {
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedRecord = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      parsedRecord = {
        complaints: complaints || "",
        observations: aiResponse,
        techniques_used: techniques_used || "",
        evolution: evolution || "",
        next_steps: ""
      };
    }

    // Add prompt version metadata
    parsedRecord._prompt_version = AI_PROMPT_VERSION;

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
