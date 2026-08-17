import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Issue {
  field?: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  suggested_value?: any;
}

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

function localValidate(payload: any): Issue[] {
  const issues: Issue[] = [];
  const { kind, data } = payload || {};

  if (kind === 'patient') {
    if (!data.full_name || String(data.full_name).trim().length < 2) {
      issues.push({ field: 'full_name', severity: 'error', message: 'Informe o nome do paciente' });
    }
    const primaryPhone = data.phone || data.whatsapp_phone;
    if (!primaryPhone || String(primaryPhone).replace(/\D/g, '').length < 10) {
      issues.push({ field: 'phone', severity: 'error', message: 'Informe um telefone ou WhatsApp válido' });
    }
    if (data.cpf && !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(String(data.cpf))) {
      issues.push({ field: 'cpf', severity: 'warning', message: 'CPF parece inválido' });
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      issues.push({ field: 'email', severity: 'warning', message: 'Email inválido' });
    }
    if (data.zip_code && String(data.zip_code).replace(/\D/g, '').length !== 8) {
      issues.push({ field: 'zip_code', severity: 'warning', message: 'CEP inválido' });
    }
  }

  if (kind === 'appointment') {
    const dt = new Date(data.scheduled_at);
    const hour = dt.getHours();
    if (hour < 7 || hour >= 22) {
      issues.push({
        field: 'scheduled_at',
        severity: 'warning',
        message: `Horário incomum (${hour.toString().padStart(2, '0')}h). Deseja continuar?`,
      });
    }
    if (data.duration_minutes && (data.duration_minutes < 20 || data.duration_minutes > 180)) {
      issues.push({
        field: 'duration_minutes',
        severity: 'warning',
        message: 'Duração fora do padrão clínico (20–180 min)',
      });
    }
  }

  if (kind === 'billing_plan') {
    const { billing_type, amount, session_value, sessions_per_cycle } = data;
    if (billing_type === 'monthly' && session_value && sessions_per_cycle) {
      const expected = Number(session_value) * Number(sessions_per_cycle);
      if (Math.abs(expected - Number(amount)) > 0.5) {
        issues.push({
          field: 'amount',
          severity: 'warning',
          message: `${sessions_per_cycle} sessões × R$ ${session_value} = R$ ${expected.toFixed(2)}. Valor mensal informado: R$ ${Number(amount).toFixed(2)}.`,
          suggestion: 'Corrigir automaticamente',
          suggested_value: expected,
        });
      }
    }
  }

  return issues;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const payload = await req.json();
    const issues = localValidate(payload);

    // Optional AI enrichment (best-effort, non-blocking failure)
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (apiKey && payload.useAI) {
      try {
        const r = await fetch(LOVABLE_AI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              {
                role: 'system',
                content:
                  'Você é validador clínico do PsicoOne. Retorne JSON {"issues":[{"severity":"info|warning","message":"..."}]}. No cadastro de paciente, SOMENTE nome e telefone/WhatsApp são obrigatórios. CPF, email, nascimento, endereço, contatos de emergência e todos os demais campos são opcionais e sua ausência nunca deve gerar issue. Não repita validações existentes.',
              },
              { role: 'user', content: JSON.stringify({ payload, existing: issues }) },
            ],
            response_format: { type: 'json_object' },
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const content = j.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.issues)) issues.push(...parsed.issues);
          }
        }
      } catch (_) { /* ignore AI errors */ }
    }

    return new Response(JSON.stringify({ ok: true, issues }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
