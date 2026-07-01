import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Server-to-server / cron only. Never allow regular JWT holders to trigger
  // billing generation across all psychologists.
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    || req.headers.get('x-cron-secret')
    || req.headers.get('x-internal-secret');
  const allowed = new Set(
    [
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      Deno.env.get('INTERNAL_FUNCTION_SECRET'),
      Deno.env.get('CRON_SECRET'),
    ].filter(Boolean) as string[],
  );
  if (!token || !allowed.has(token)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const { data: plans, error } = await supabase
    .from('patient_billing_plans')
    .select('*')
    .eq('active', true)
    .is('deleted_at', null);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let created = 0;
  for (const plan of plans || []) {
    if (plan.end_date && plan.end_date < todayISO) continue;
    if (plan.start_date && plan.start_date > todayISO) continue;

    const last = plan.last_generated_at ? new Date(plan.last_generated_at) : null;
    let shouldGenerate = false;
    let dueDate = new Date(today);

    if (plan.billing_type === 'monthly') {
      const day = plan.day_of_month || 1;
      dueDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (!last || last.getMonth() !== today.getMonth() || last.getFullYear() !== today.getFullYear()) {
        shouldGenerate = today.getDate() >= day - 3; // gera até 3 dias antes
      }
    } else if (plan.billing_type === 'weekly') {
      shouldGenerate = !last || (today.getTime() - last.getTime()) >= 7 * 86400000;
      dueDate = new Date(today.getTime() + 7 * 86400000);
    } else if (plan.billing_type === 'biweekly') {
      shouldGenerate = !last || (today.getTime() - last.getTime()) >= 14 * 86400000;
      dueDate = new Date(today.getTime() + 14 * 86400000);
    }
    // per_session: gerado por trigger de appointment, não aqui

    if (!shouldGenerate) continue;

    const { error: insErr } = await supabase.from('financial_transactions').insert({
      psychologist_id: plan.psychologist_id,
      patient_id: plan.patient_id,
      type: 'income',
      status: 'pending',
      amount: plan.amount,
      due_date: dueDate.toISOString().slice(0, 10),
      description: plan.description || `Cobrança ${plan.billing_type}`,
      payment_method: plan.payment_method,
      category: 'session',
    });

    if (!insErr) {
      created++;
      await supabase
        .from('patient_billing_plans')
        .update({ last_generated_at: today.toISOString() })
        .eq('id', plan.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, created, plans: plans?.length || 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
