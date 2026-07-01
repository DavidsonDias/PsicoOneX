import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/require-auth.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APPROACH_PROMPTS: Record<string, string> = {
  tcc: "Use linguagem da Terapia Cognitivo-Comportamental (TCC). Foque em pensamentos automáticos, crenças centrais, distorções cognitivas, comportamentos observáveis, registros de pensamento e técnicas comportamentais.",
  psychoanalytic: "Use linguagem psicanalítica. Foque em processos inconscientes, transferência, contratransferência, mecanismos de defesa, conflitos internos, simbolismo, associação livre e dinâmica pulsional.",
  humanistic: "Use linguagem humanista/centrada na pessoa. Foque em experiência subjetiva, autenticidade, congruência, empatia incondicional, tendência atualizante, autoconceito e relação terapêutica.",
  systemic: "Use linguagem sistêmica. Foque em padrões relacionais, dinâmicas familiares, circularidade, fronteiras, alianças, triangulações e contexto sociofamiliar.",
  integrative: "Use linguagem integrativa, combinando elementos de diferentes abordagens conforme adequado ao conteúdo clínico.",
  neutral: "Use linguagem clínica neutra e técnica, sem se restringir a uma abordagem específica. Mantenha objetividade e clareza profissional.",
  phenomenological: "Use linguagem fenomenológico-existencial. Foque em vivência, experiência imediata, intencionalidade da consciência, sentido de existência, angústia existencial, liberdade, responsabilidade, autenticidade, ser-no-mundo (Dasein), temporalidade e encontro terapêutico. Valorize a descrição fenomenológica da experiência sem reduzi-la a categorias diagnósticas.",
};

const ACTION_PROMPTS: Record<string, string> = {
  refine: "Refine e melhore a redação do texto, mantendo o conteúdo original. Corrija gramática, melhore coesão e clareza.",
  organize: `Reorganize o texto em formato clínico estruturado com as seções aplicáveis:
## Queixa Principal
## Observações Clínicas
## Intervenções Realizadas
## Evolução
## Plano Terapêutico
Omita seções sem conteúdo correspondente.`,
  summarize: "Resuma os principais pontos da sessão de forma concisa e objetiva, mantendo as informações clinicamente relevantes.",
  clinical: "Torne a linguagem mais clínica e profissional, adequada para documentação em prontuário psicológico.",
  objective: "Torne o texto mais objetivo e direto, removendo redundâncias e mantendo apenas as informações essenciais.",
  grammar: "Corrija apenas erros gramaticais, ortográficos e de pontuação. Não altere o conteúdo ou estilo do texto.",
  expand: "Expanda a reflexão clínica do texto, aprofundando observações e análises sem inventar informações novas.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { text, mode, action, approach, customInstruction, chatMessages } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Chat mode — conversational AI assistant
    if (chatMessages && Array.isArray(chatMessages)) {
      const systemPrompt = `Você é um assistente clínico especializado em psicologia para prontuários (PEP).
${approach && APPROACH_PROMPTS[approach] ? APPROACH_PROMPTS[approach] : APPROACH_PROMPTS.neutral}

REGRAS FUNDAMENTAIS:
- NÃO gere diagnósticos. Você auxilia na organização e refinamento do texto.
- NÃO substitua a avaliação profissional.
- Mantenha sigilo clínico e linguagem ética.
- Responda em português brasileiro.
- Seja conciso e profissional.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...chatMessages,
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI gateway error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Action mode — single refinement
    if (!text?.trim()) throw new Error("No text provided");

    const resolvedAction = action || (mode === "organize" ? "organize" : "refine");
    const actionPrompt = ACTION_PROMPTS[resolvedAction] || ACTION_PROMPTS.refine;
    const approachPrompt = approach && APPROACH_PROMPTS[approach] ? APPROACH_PROMPTS[approach] : APPROACH_PROMPTS.neutral;

    let systemPrompt = `Você é um assistente clínico especializado em psicologia para prontuários (PEP).

TAREFA: ${actionPrompt}

ABORDAGEM: ${approachPrompt}

${customInstruction ? `INSTRUÇÃO ADICIONAL DO PROFISSIONAL: ${customInstruction}` : ""}

REGRAS FUNDAMENTAIS:
- NÃO invente informações. Use APENAS o que está no texto original.
- NÃO gere diagnósticos automáticos.
- Preserve todos os detalhes relevantes do texto original.
- Responda apenas com o texto processado, sem explicações adicionais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const refined = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ refined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refine-record error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
