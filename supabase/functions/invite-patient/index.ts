import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Validate caller (psychologist) JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const psychologistId = userData.user.id

    const body = await req.json().catch(() => ({}))
    const { patient_id } = body as { patient_id?: string }
    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Verify the patient belongs to this psychologist & has email
    const { data: patient, error: patientErr } = await admin
      .from('patients')
      .select('id, full_name, email, psychologist_id, user_id')
      .eq('id', patient_id)
      .single()

    if (patientErr || !patient) {
      return new Response(JSON.stringify({ error: 'Paciente não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (patient.psychologist_id !== psychologistId) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!patient.email) {
      return new Response(JSON.stringify({ error: 'Paciente não tem e-mail cadastrado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (patient.user_id) {
      return new Response(JSON.stringify({ error: 'Paciente já tem acesso ativo ao portal' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get psychologist name
    const { data: psyProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', psychologistId)
      .single()

    // Revoke any pending invites for this patient
    await admin
      .from('patient_invites')
      .update({ is_revoked: true })
      .eq('patient_id', patient_id)
      .is('accepted_at', null)
      .eq('is_revoked', false)

    // Create new invite
    const { data: invite, error: inviteErr } = await admin
      .from('patient_invites')
      .insert({
        patient_id,
        psychologist_id: psychologistId,
        email: patient.email,
      })
      .select('token, expires_at')
      .single()

    if (inviteErr || !invite) {
      console.error('Invite create error:', inviteErr)
      return new Response(JSON.stringify({ error: 'Falha ao criar convite' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build invite URL — use Origin header for proper environment
    const origin =
      req.headers.get('origin') ||
      req.headers.get('x-forwarded-host')?.startsWith('http')
        ? req.headers.get('origin') || ''
        : 'https://psicoone.app'
    const inviteUrl = `${origin || 'https://psicoone.app'}/portal/aceitar-convite/${invite.token}`

    // Send email via send-transactional-email
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: 'patient-portal-invite',
        to: patient.email,
        data: {
          patientName: patient.full_name,
          psychologistName: psyProfile?.full_name || 'Seu profissional',
          inviteUrl,
          expiresInDays: 7,
        },
        metadata: { patient_id, invite_token: invite.token },
      }),
    })

    if (!emailRes.ok) {
      const txt = await emailRes.text()
      console.error('Email send failed:', txt)
    }

    return new Response(
      JSON.stringify({
        success: true,
        invite_url: inviteUrl,
        expires_at: invite.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('invite-patient error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
