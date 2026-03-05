import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!text?.trim()) throw new Error("No text provided");

    const systemPrompt = mode === "organize"
      ? `Você é um assistente clínico especializado em psicologia. Reorganize o texto abaixo em formato clínico estruturado com as seguintes seções (use apenas as que forem aplicáveis ao conteúdo):

## Queixa Principal
## Observações Clínicas
## Intervenções Realizadas
## Evolução
## Plano Terapêutico

REGRAS IMPORTANTES:
- NÃO invente informações. Use APENAS o que está no texto original.
- Mantenha linguagem profissional e clínica.
- Se uma seção não tiver conteúdo correspondente, omita-a.
- Preserve todos os detalhes relevantes do texto original.`
      : `Você é um assistente clínico especializado em psicologia. Refine e organize o texto de prontuário psicológico abaixo.

REGRAS IMPORTANTES:
- Mantenha linguagem profissional, clara e com estrutura clínica adequada.
- NÃO invente informações. Apenas organize, corrija e melhore a redação.
- Preserve todo o conteúdo e contexto clínico original.
- Corrija erros gramaticais e de digitação.
- Melhore a coesão e clareza do texto.`;

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
