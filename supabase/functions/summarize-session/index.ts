import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const approachPrompts: Record<string, string> = {
  tcc: `Utilize a perspectiva Cognitivo-Comportamental (TCC). Foque em:
- Pensamentos automáticos identificados
- Crenças centrais e intermediárias
- Distorções cognitivas observadas
- Padrões comportamentais
- Técnicas utilizadas (registro de pensamentos, reestruturação cognitiva, etc.)`,
  psychoanalysis: `Utilize a perspectiva Psicanalítica. Foque em:
- Conteúdos manifestos e latentes
- Transferência e contratransferência
- Mecanismos de defesa observados
- Associações livres relevantes
- Dinâmica inconsciente`,
  phenomenological: `Utilize a perspectiva Fenomenológica Existencial. Foque em:
- Experiência vivida (Dasein) do paciente
- Significado subjetivo atribuído às vivências
- Temas existenciais (liberdade, responsabilidade, finitude, isolamento)
- Intencionalidade e modos de ser-no-mundo
- Epoché e redução fenomenológica na escuta`,
  humanistic: `Utilize a perspectiva Humanista. Foque em:
- Tendência atualizante e crescimento pessoal
- Congruência e autenticidade
- Empatia e aceitação incondicional
- Autoconceito e experiência organísmica
- Recursos internos do paciente`,
  systemic: `Utilize a perspectiva Sistêmica. Foque em:
- Dinâmica relacional e padrões interacionais
- Contexto familiar e social
- Circularidade e retroalimentação
- Papéis e fronteiras no sistema
- Comunicação e metacomunicação`,
  gestalt: `Utilize a perspectiva da Gestalt-terapia. Foque em:
- Awareness e contato no aqui-e-agora
- Ciclo de contato e interrupções
- Figuras e fundos emergentes
- Polaridades e conflitos internos
- Experimentos realizados na sessão`,
  neutral: `Mantenha uma perspectiva clínica geral e integrada, sem favorecer uma abordagem específica.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { patientName, duration, chatMessages, clinicalApproach, outputType } = await req.json();

    const approach = approachPrompts[clinicalApproach] || approachPrompts.neutral;
    const type = outputType || "summary"; // summary | structured | transcript_summary

    let instruction = "";

    if (type === "structured") {
      instruction = `Gere um prontuário clínico estruturado com os seguintes campos:

## Queixa Principal
(Motivo da consulta / demanda apresentada)

## Contexto Apresentado
(Situação relatada pelo paciente)

## Intervenções Realizadas
(O que foi trabalhado durante a sessão)

## Respostas do Paciente
(Como o paciente reagiu às intervenções)

## Evolução Observada
(Progresso ou mudanças percebidas)

## Plano Terapêutico
(Próximos passos e encaminhamentos)`;
    } else {
      instruction = `Gere um resumo clínico profissional da sessão, incluindo:
1. **Contexto da sessão**: Tipo de atendimento e duração
2. **Pontos principais discutidos**: Baseado nas informações disponíveis
3. **Observações clínicas**: Impressões gerais
4. **Próximos passos sugeridos**: Recomendações para acompanhamento`;
    }

    const prompt = `Você é um psicólogo clínico auxiliando na documentação de uma sessão de teleatendimento.

${approach}

Dados da sessão:
- Paciente: ${patientName}
- Duração: ${duration} minutos
- Mensagens/notas da sessão:
${chatMessages}

${instruction}

REGRAS IMPORTANTES:
- NÃO invente informações que não estejam nos dados
- NÃO faça diagnósticos automáticos
- Mantenha linguagem profissional e ética
- Escreva em terceira pessoa, como registro clínico
- Se não houver informações suficientes, indique os campos para preenchimento manual
- Responda em português brasileiro`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-session error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
