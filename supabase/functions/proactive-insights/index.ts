import { unvalidatedIntegrationResponse } from "../_shared/staging-isolation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  const migrationPause = unvalidatedIntegrationResponse(req);
  if (migrationPause) return migrationPause;

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const userId = user.id;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Parallel DB queries for insights
    const [
      patientsRes,
      appointmentsRes,
      transactionsRes,
      recentAppointmentsRes,
      inactivePatientsRes,
    ] = await Promise.all([
      supabase.from('patients').select('id, full_name, status, created_at, default_session_value')
        .eq('psychologist_id', userId).is('deleted_at', null),
      supabase.from('appointments').select('id, scheduled_at, status, patient_id, session_value')
        .eq('psychologist_id', userId).is('deleted_at', null)
        .gte('scheduled_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),
      supabase.from('financial_transactions').select('id, amount, status, type, due_date, patient_id, paid_date')
        .eq('psychologist_id', userId).is('deleted_at', null),
      supabase.from('appointments').select('id, scheduled_at, status, patient_id, patients(full_name)')
        .eq('psychologist_id', userId).is('deleted_at', null)
        .order('scheduled_at', { ascending: false }).limit(200),
      // Patients with no appointments in last 14 days
      supabase.from('patients').select('id, full_name, status')
        .eq('psychologist_id', userId).eq('status', 'active').is('deleted_at', null),
    ]);

    const patients = patientsRes.data || [];
    const appointments = appointmentsRes.data || [];
    const transactions = transactionsRes.data || [];
    const recentApts = recentAppointmentsRes.data || [];
    const activePatients = inactivePatientsRes.data || [];

    const insights: any[] = [];

    // 1. Inactive patients (no appointment in 14+ days)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const patientLastApt: Record<string, Date> = {};
    for (const apt of recentApts) {
      const pid = apt.patient_id;
      const d = new Date(apt.scheduled_at);
      if (!patientLastApt[pid] || d > patientLastApt[pid]) {
        patientLastApt[pid] = d;
      }
    }
    const inactiveRisk = activePatients.filter(p => {
      const last = patientLastApt[p.id];
      return !last || last < fourteenDaysAgo;
    });
    if (inactiveRisk.length > 0) {
      insights.push({
        id: 'inactive-patients',
        type: 'warning',
        category: 'agenda',
        title: `${inactiveRisk.length} paciente${inactiveRisk.length > 1 ? 's' : ''} com risco de abandono`,
        description: `Pacientes sem sessão há mais de 14 dias: ${inactiveRisk.slice(0, 3).map(p => p.full_name).join(', ')}${inactiveRisk.length > 3 ? ` e mais ${inactiveRisk.length - 3}` : ''}`,
        action: { label: 'Ver pacientes', path: '/pacientes' },
        priority: 'high',
      });
    }

    // 2. Overdue payments
    const overdue = transactions.filter(t => 
      t.type === 'income' && t.status === 'pending' && t.due_date && new Date(t.due_date) < now
    );
    const overdueTotal = overdue.reduce((s, t) => s + Number(t.amount), 0);
    if (overdue.length > 0) {
      insights.push({
        id: 'overdue-payments',
        type: 'critical',
        category: 'financial',
        title: `${overdue.length} pagamento${overdue.length > 1 ? 's' : ''} atrasado${overdue.length > 1 ? 's' : ''}`,
        description: `Total de R$ ${overdueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em atraso`,
        action: { label: 'Ver financeiro', path: '/financeiro' },
        metric: `R$ ${overdueTotal.toFixed(0)}`,
        priority: 'high',
      });
    }

    // 3. Revenue prediction based on scheduled appointments
    const futureApts = appointments.filter(a => 
      new Date(a.scheduled_at) >= now && a.status !== 'cancelled'
    );
    const predictedRevenue = futureApts.reduce((s, a) => s + Number(a.session_value || 200), 0);
    const paidThisMonth = transactions.filter(t => {
      if (t.type !== 'income' || t.status !== 'paid') return false;
      const d = new Date(t.paid_date || t.due_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + Number(t.amount), 0);

    insights.push({
      id: 'revenue-prediction',
      type: 'trend',
      category: 'financial',
      title: 'Previsão de receita do mês',
      description: `Já recebido: R$ ${paidThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Previsto: R$ ${(paidThisMonth + predictedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      metric: `R$ ${(paidThisMonth + predictedRevenue).toFixed(0)}`,
      priority: 'medium',
    });

    // 4. Attendance rate
    const completedApts = appointments.filter(a => a.status === 'completed').length;
    const cancelledApts = appointments.filter(a => a.status === 'cancelled').length;
    const totalRelevant = completedApts + cancelledApts;
    const attendanceRate = totalRelevant > 0 ? (completedApts / totalRelevant) * 100 : 100;
    if (totalRelevant > 0) {
      insights.push({
        id: 'attendance-rate',
        type: attendanceRate >= 80 ? 'success' : 'warning',
        category: 'agenda',
        title: 'Taxa de comparecimento',
        description: `${attendanceRate.toFixed(0)}% este mês (${completedApts} realizadas, ${cancelledApts} canceladas)`,
        metric: `${attendanceRate.toFixed(0)}%`,
        priority: attendanceRate < 70 ? 'high' : 'low',
      });
    }

    // 5. Active vs inactive patients
    const activeCount = patients.filter(p => p.status === 'active').length;
    const inactiveCount = patients.filter(p => p.status === 'inactive').length;
    if (patients.length > 0) {
      insights.push({
        id: 'patient-distribution',
        type: 'info',
        category: 'patients',
        title: 'Distribuição de pacientes',
        description: `${activeCount} ativos, ${inactiveCount} inativos de ${patients.length} total`,
        metric: `${activeCount}/${patients.length}`,
        priority: 'low',
      });
    }

    // 6. Today's schedule summary
    const todayApts = recentApts.filter(a => {
      const d = new Date(a.scheduled_at).toISOString().split('T')[0];
      return d === today;
    });
    if (todayApts.length > 0) {
      const pending = todayApts.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
      insights.push({
        id: 'today-schedule',
        type: 'info',
        category: 'agenda',
        title: `${todayApts.length} sessão${todayApts.length > 1 ? 'ões' : ''} hoje`,
        description: `${pending} pendente${pending !== 1 ? 's' : ''} de realização`,
        action: { label: 'Ver agenda', path: '/agenda' },
        priority: 'medium',
      });
    }

    // 7. Use AI for clinical pattern analysis if requested
    const { useAI } = await req.json().catch(() => ({ useAI: false }));
    
    if (useAI && insights.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              temperature: 0.3,
              max_tokens: 220,
              messages: [
                {
                  role: "system",
                  content: `Gestão clínica para psicólogos. Gere 1-2 recomendações estratégicas curtas (máx 80 caracteres cada). Só JSON: {"recommendations":[{"title":"...","description":"..."}]}`
                },
                {
                  role: "user",
                  content: JSON.stringify({
                    activePatients: activeCount,
                    inactivePatients: inactiveCount,
                    inactiveRisk: inactiveRisk.length,
                    overduePayments: overdue.length,
                    attendanceRate: attendanceRate.toFixed(0),
                    predictedRevenue: paidThisMonth + predictedRevenue,
                    paidRevenue: paidThisMonth,
                  })
                }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content;
            if (content) {
              try {
                const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleaned);
                if (parsed.recommendations) {
                  for (const rec of parsed.recommendations.slice(0, 2)) {
                    insights.push({
                      id: `ai-rec-${Math.random().toString(36).slice(2)}`,
                      type: 'ai',
                      category: 'ai',
                      title: rec.title,
                      description: rec.description,
                      priority: 'medium',
                    });
                  }
                }
              } catch { /* ignore parse errors */ }
            }
          }
        } catch { /* ignore AI errors - insights still work without AI */ }
      }
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));

    // Also return strategic metrics
    const metrics = {
      predictedRevenue: paidThisMonth + predictedRevenue,
      paidRevenue: paidThisMonth,
      pendingRevenue: transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0),
      overdueRevenue: overdueTotal,
      attendanceRate,
      activePatients: activeCount,
      inactivePatients: inactiveCount,
      totalPatients: patients.length,
      appointmentsThisMonth: appointments.length,
      completedThisMonth: completedApts,
      cancelledThisMonth: cancelledApts,
      inactiveRiskCount: inactiveRisk.length,
    };

    return new Response(JSON.stringify({ insights, metrics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('proactive-insights error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
