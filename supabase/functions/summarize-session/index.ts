import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/require-auth.ts";


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

const refineInstructions: Record<string, string> = {
  technical: "Reescreva o texto abaixo usando linguagem técnica e acadêmica, mantendo precisão clínica e terminologia profissional da psicologia.",
  simplify: "Reescreva o texto abaixo usando linguagem simples e acessível, sem perder o conteúdo clínico essencial. Evite jargões.",
  empathetic: "Reescreva o texto abaixo com tom mais empático e humanizado, mantendo o conteúdo clínico mas adicionando sensibilidade na linguagem.",
  approach: "Reescreva o texto abaixo adaptando completamente ao estilo e vocabulário da abordagem clínica indicada.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders); if ('error' in auth) return auth.error;


  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const {
      patientName, duration, chatMessages, clinicalApproach,
      outputType, refineAction, patientHistory,
    } = await req.json();

    const approach = approachPrompts[clinicalApproach] || approachPrompts.neutral;
    const type = outputType || "summary";

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "refine" && refineAction) {
      const instruction = refineInstructions[refineAction] || refineInstructions.technical;
      systemPrompt = `Você é um redator clínico especializado em psicologia. Seu trabalho é reescrever textos clínicos mantendo fidelidade absoluta ao conteúdo original. ${approach}`;
      userPrompt = `${instruction}

Texto original:
${chatMessages}

REGRAS INVIOLÁVEIS:
- NÃO invente informações que não existam no texto original
- NÃO adicione interpretações ou diagnósticos
- NÃO remova informações relevantes
- Mantenha o conteúdo original, ajuste APENAS o estilo
- Responda em português brasileiro
- Retorne APENAS o texto reescrito, sem explicações ou metadados`;
    } else {
      systemPrompt = `Você é um psicólogo clínico experiente auxiliando na documentação de sessões de teleatendimento.

${approach}

PRINCÍPIOS FUNDAMENTAIS:
1. FIDELIDADE: Use APENAS informações presentes na transcrição/chat. Nunca invente.
2. PRECISÃO: Se um conteúdo não foi mencionado, escreva "Não abordado nesta sessão" no campo correspondente.
3. ÉTICA: Nunca faça diagnósticos automáticos. Use linguagem como "o paciente relata", "foi observado que".
4. PROFISSIONALISMO: Escreva em terceira pessoa, como registro clínico formal.
5. COERÊNCIA: Cada afirmação deve ter base direta no conteúdo da sessão.
6. TRANSCRIÇÃO AUTOMÁTICA: o conteúdo vem de fala transcrita por IA. Remova hesitações e repetições, corrija a pontuação da oralidade e marque trechos ininteligíveis como [inaudível]. Nunca complete lacunas com conteúdo inventado.
7. TEMPERATURA ZERO: se a transcrição for curta ou ruidosa, produza um registro curto e honesto em vez de expandir com suposições.`;

      let instruction = "";


      if (type === "structured") {
        instruction = `Gere um prontuário clínico estruturado com os seguintes campos obrigatórios:

## Queixa Principal
(Motivo da consulta / demanda apresentada pelo paciente — use citações diretas quando possível)

## Contexto Apresentado
(Situação relatada pelo paciente, fatos e circunstâncias mencionados)

## Intervenções Realizadas
(O que foi trabalhado durante a sessão, técnicas e estratégias utilizadas)

## Respostas do Paciente
(Como o paciente reagiu às intervenções — comportamento verbal e não-verbal observável)

## Evolução Observada
(Progresso, mudanças percebidas ou estabilidade em relação a sessões anteriores)

## Plano Terapêutico
(Próximos passos, encaminhamentos, tarefas para casa, objetivos para próxima sessão)

Se algum campo não tiver informação suficiente na transcrição, escreva: "Informação não disponível nesta sessão — preencher manualmente."`;
      } else {
        instruction = `Gere um resumo clínico profissional da sessão contendo:

1. **Contexto da sessão**: Tipo de atendimento (teleatendimento), duração e configuração
2. **Demanda principal**: O que o paciente trouxe como foco (use citações diretas quando possível)
3. **Pontos-chave discutidos**: Liste os temas específicos abordados
4. **Observações clínicas**: Impressões baseadas EXCLUSIVAMENTE no conteúdo observável
5. **Próximos passos**: Recomendações e encaminhamentos discutidos na sessão

FORMATO: Texto corrido em parágrafos, linguagem técnica mas acessível, entre 150-300 palavras.`;
      }

      const historySection = patientHistory
        ? `\n\nHISTÓRICO CLÍNICO RECENTE (últimas sessões):\n${patientHistory}\n\nUse este histórico para:\n- Contextualizar a evolução do paciente\n- Identificar padrões recorrentes\n- Avaliar progresso terapêutico\n- NÃO repita informações do histórico como se fossem da sessão atual`
        : "";

      userPrompt = `Dados da sessão:
- Paciente: ${patientName}
- Duração: ${duration} minutos
- Tipo: Teleatendimento

Conteúdo da sessão (transcrição/chat):
---
${chatMessages}
---
${historySection}

${instruction}`;
    }

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
          { role: "user", content: userPrompt },
        ],
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
