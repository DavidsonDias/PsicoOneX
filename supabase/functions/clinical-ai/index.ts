import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/require-auth.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders); if ('error' in auth) return auth.error;


  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const body = await req.json();
    const { type } = body;

    /** Contexto enxuto: mantém o clinicamente relevante, corta desperdício. */
    const clip = (value: unknown, max: number) => {
      const t = String(value ?? '').replace(/\s+/g, ' ').trim();
      return t.length > max ? `${t.slice(0, max)}…` : t;
    };
    const sessionLine = (r: any, max: number) =>
      `S${r.session ?? '?'} ${r.date}: ${clip(
        [r.complaints, r.observations, r.evolution, r.techniques, r.nextSteps].filter(Boolean).join(' | '),
        max
      )}`;

    let systemPrompt = '';
    let userContent = '';
    let model = 'google/gemini-2.5-flash';
    let maxTokens = 700;

    if (type === 'clinical-profile') {
      const { patientName, records } = body;
      systemPrompt = `Assistente clínico para psicólogos. Gere o perfil clínico a partir dos prontuários.
Responda só JSON: {"summary":"2-4 frases","patterns":["..."],"evolution":"...","tags":["..."],"riskLevel":"low|medium|high","recommendations":["..."]}
Objetivo, linguagem profissional. Máximo 4 itens por lista.`;

      // Sessões mais recentes primeiro, limitadas: o histórico completo não
      // muda o perfil e multiplica tokens.
      const recent = (records as any[]).slice(-24);
      userContent = `Paciente: ${patientName}\nSessões (${recent.length} de ${records.length}):\n${recent
        .map((r) => sessionLine(r, 700))
        .join('\n')}`;
    } else if (type === 'search-records') {
      const { query, records } = body;
      model = 'google/gemini-2.5-flash-lite';
      maxTokens = 400;
      systemPrompt = `Busca semântica em prontuários de psicologia. Consulta: "${query}"
Responda só JSON: {"matchingIds":["..."],"summary":"1-2 frases","relatedThemes":["..."]}
Considere temas, sintomas e técnicas, não só texto literal.`;

      userContent = (records as any[])
        .slice(0, 60)
        .map((r) => `[${r.id}] S${r.session} ${r.date}: ${clip(r.content, 500)}`)
        .join('\n');
    } else if (type === 'period-summary') {
      const { patientName, periodDays, records } = body;
      systemPrompt = `Assistente clínico. Resumo executivo dos últimos ${periodDays} dias.
Responda só JSON: {"headline":"1 linha","summary":"3-5 frases","progress":"positive|neutral|negative","keyThemes":["..."],"techniquesUsed":["..."],"alerts":["..."],"suggestedFocus":["..."]}
Objetivo e clínico. Máximo 4 itens por lista. Sem dados suficientes, diga em summary.`;

      const recent = (records as any[]).slice(-24);
      userContent = `Paciente: ${patientName}\nSessões (${recent.length}):\n${recent
        .map((r) => sessionLine(r, 700))
        .join('\n')}`;
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
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
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
