import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const body = await req.json();
    const { type } = body;

    let systemPrompt = '';
    let userContent = '';

    if (type === 'clinical-profile') {
      const { patientName, records } = body;
      systemPrompt = `Você é um assistente clínico para psicólogos. Analise os prontuários do paciente e gere um perfil clínico completo.
Responda APENAS em JSON válido com esta estrutura:
{
  "summary": "Resumo clínico geral do paciente (2-4 frases)",
  "patterns": ["padrão comportamental 1", "padrão 2"],
  "evolution": "Descrição da evolução clínica ao longo das sessões",
  "tags": ["ansiedade", "relacionamento", "autoestima"],
  "riskLevel": "low|medium|high",
  "recommendations": ["recomendação terapêutica 1", "recomendação 2"]
}
Seja objetivo e clinicamente relevante. Use linguagem profissional.`;

      userContent = `Paciente: ${patientName}\n\nProntuários (${records.length} sessões):\n${
        records.map((r: any) =>
          `Sessão ${r.session || '?'} (${r.date}): ${[r.complaints, r.observations, r.evolution, r.techniques, r.nextSteps].filter(Boolean).join(' | ')}`
        ).join('\n')
      }`;
    } else if (type === 'search-records') {
      const { query, records } = body;
      systemPrompt = `Você é um assistente de busca inteligente para prontuários clínicos de psicologia.
O profissional buscou: "${query}"
Analise os prontuários e retorne APENAS em JSON:
{
  "matchingIds": ["id1", "id2"],
  "summary": "Resumo dos resultados encontrados",
  "relatedThemes": ["tema1", "tema2"]
}
Busque por temas, sintomas, técnicas e conteúdo semântico — não apenas texto literal.`;

      userContent = `Prontuários:\n${records.map((r: any) => `[${r.id}] Sessão ${r.session} (${r.date}): ${r.content}`).join('\n')}`;
    } else {
      throw new Error(`Unknown insight type: ${type}`);
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('clinical-ai error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
