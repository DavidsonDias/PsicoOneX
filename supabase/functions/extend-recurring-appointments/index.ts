import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Janela rolante de 90 dias para recorrências indeterminadas
const WINDOW_DAYS = 90;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Server-to-server / cron only. Prevent public callers from mass-inserting
  // recurring appointment rows across every psychologist account.
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

  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_DAYS * 86400000);

  // Buscar agendamentos-pai com recorrência indeterminada
  const { data: parents } = await supabase
    .from('appointments')
    .select('*')
    .eq('recurrence_open_ended', true)
    .is('deleted_at', null);

  let created = 0;
  for (const p of parents || []) {
    const extendedUntil = p.recurrence_extended_until
      ? new Date(p.recurrence_extended_until)
      : new Date(p.scheduled_at);

    if (extendedUntil >= horizon) continue;

    const intervalDays =
      p.recurrence_type === 'weekly' ? 7 :
      p.recurrence_type === 'biweekly' ? 14 :
      p.recurrence_type === 'monthly' ? 30 : 7;

    let cursor = new Date(extendedUntil.getTime() + intervalDays * 86400000);
    const toInsert: any[] = [];
    while (cursor <= horizon) {
      const dt = new Date(p.scheduled_at);
      const scheduled = new Date(cursor);
      scheduled.setHours(dt.getHours(), dt.getMinutes(), 0, 0);
      toInsert.push({
        psychologist_id: p.psychologist_id,
        patient_id: p.patient_id,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: p.duration_minutes,
        type: p.type,
        status: 'scheduled',
        notes: p.notes,
        recurrence_parent_id: p.id,
        recurrence_type: p.recurrence_type,
      });
      cursor = new Date(cursor.getTime() + intervalDays * 86400000);
    }

    if (toInsert.length) {
      const { error } = await supabase.from('appointments').insert(toInsert);
      if (!error) {
        created += toInsert.length;
        await supabase
          .from('appointments')
          .update({ recurrence_extended_until: horizon.toISOString().slice(0, 10) })
          .eq('id', p.id);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, created }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
