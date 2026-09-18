// PsicoOneX STAGING ONLY. Manual worker: one transactional message per call.
// No cron, no auth email queue, no changes to other Edge Functions.
// Native fetch avoids third-party runtime dependencies.
const STAGING_URL = 'https://jeguvjpfuyksqiqrrvyz.supabase.co'
const QUEUE = 'transactional_emails'
const MAX_RETRIES = 5

const reply = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'POST required' })
  const url = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const workerSecret = Deno.env.get('EMAIL_WORKER_SECRET')
  const from = Deno.env.get('EMAIL_FROM')?.trim()
  const recipient = Deno.env.get('EMAIL_TEST_RECIPIENT')?.trim().toLowerCase()
  if (url !== STAGING_URL || !key || !apiKey || !workerSecret || workerSecret.length < 32 || !from || !recipient ||
      !/^[^\s<>;,]+@[^\s<>;,]+\.[^\s<>;,]+$/.test(recipient) ||
      !/^(?:[^<>\r\n]+\s*<)?noreply@psicoone-mail\.sevendevx\.com>?$/.test(from)) {
    return reply(503, { error: 'Invalid staging configuration' })
  }

  // Dedicated worker credential; independent of platform JWT/key representation.
  // Keep gateway verification enabled. Never trust decoded unsigned JWT claims.
  const supplied = req.headers.get('x-email-worker-secret') || ''
  const digest = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  const [a, b] = await Promise.all([digest(supplied), digest(workerSecret)])
  let different = 0
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i]
  if (different !== 0) return reply(401, { error: 'Worker secret required' })

  async function db(path, body = undefined) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`Database operation failed (${response.status})`)
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }
  const rpc = (name, body) => db(`rpc/${name}`, body)
  let msg
  let payload
  async function log(status, reason = undefined) {
    await db('email_send_log', {
      message_id: payload.message_id,
      template_name: typeof payload.label === 'string' ? payload.label : QUEUE,
      recipient_email: payload.to,
      status,
      ...(reason ? { error_message: reason } : {}),
    })
  }
  async function quarantine(reason) {
    // Move first; a logging failure must not leave a blocked message eligible.
    await rpc('move_to_dlq', {
      source_queue: QUEUE, dlq_name: `${QUEUE}_dlq`,
      message_id: msg.msg_id, payload: msg.message,
    })
    if (typeof payload?.to === 'string' && typeof payload?.message_id === 'string') {
      await log('dlq', reason)
    }
    return reply(200, { processed: 0, quarantined: true, reason })
  }

  try {
    const states = await db('email_send_state?id=eq.1&select=retry_after_until')
    if (states[0]?.retry_after_until && Date.parse(states[0].retry_after_until) > Date.now()) {
      return reply(200, { processed: 0, reason: 'rate_limited' })
    }
    const messages = await rpc('read_email_batch', { queue_name: QUEUE, batch_size: 1, vt: 180 })
    if (!messages?.length) return reply(200, { processed: 0, reason: 'queue_empty' })
    msg = messages[0]
    payload = msg.message
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return await quarantine('Invalid payload')
    // Never redirect real customer messages to the tester. Reject them instead.
    if (typeof payload.to !== 'string' || payload.to.trim().toLowerCase() !== recipient) {
      return await quarantine('Recipient blocked by staging allowlist')
    }
    if (typeof payload.message_id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.message_id) ||
        typeof payload.subject !== 'string' || !payload.subject.trim() ||
        !(typeof payload.html === 'string' && payload.html.trim() || typeof payload.text === 'string' && payload.text.trim())) {
      return await quarantine('Invalid message ID or email content')
    }
    // The restored read_email_batch does not return enqueued_at: require queued_at.
    const queuedAt = typeof payload.queued_at === 'string' ? Date.parse(payload.queued_at) : NaN
    const age = Date.now() - queuedAt
    if (!Number.isFinite(age) || age < -60000 || age > 3600000) {
      return await quarantine('Missing, invalid or expired queued_at (maximum 60 minutes)')
    }
    const history = await db(`email_send_log?message_id=eq.${encodeURIComponent(payload.message_id)}&select=status`)
    if (history.some((row) => row.status === 'sent')) {
      await rpc('delete_email', { queue_name: QUEUE, message_id: msg.msg_id })
      return reply(200, { processed: 0, reason: 'already_sent' })
    }
    if (history.filter((row) => row.status === 'failed').length >= MAX_RETRIES) return await quarantine('Retry limit reached')
    const suppressed = await db(`suppressed_emails?email=eq.${encodeURIComponent(recipient)}&select=id&limit=1`)
    if (suppressed.length) return await quarantine('Recipient is suppressed')

    // Send only explicit fields. Payload from/cc/bcc cannot override the guard.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `psicoonex-${QUEUE}-${msg.msg_id}-${payload.message_id}`,
      },
      body: JSON.stringify({
        from, to: [recipient], subject: payload.subject,
        ...(typeof payload.html === 'string' ? { html: payload.html } : {}),
        ...(typeof payload.text === 'string' ? { text: payload.text } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      if (response.status === 429) {
        await log('rate_limited', 'Resend rate limit; wait before invoking again')
        return reply(429, { processed: 0, reason: 'resend_rate_limit', retry_after: response.headers.get('retry-after') || '60' })
      }
      await log('failed', `Resend HTTP ${response.status}`)
      return reply(502, { processed: 0, error: 'Resend rejected request', provider_status: response.status })
    }
    const result = await response.json()
    if (typeof result.id !== 'string' || !result.id) throw new Error('Invalid Resend response')
    // Only remove after a durable success log. Retry uses the same idempotency key.
    await log('sent')
    await rpc('delete_email', { queue_name: QUEUE, message_id: msg.msg_id })
    return reply(200, { processed: 1, resend_id: result.id })
  } catch (error) {
    // Ambiguous transport/database errors leave the message for a manual retry.
    // No tokens, body, recipient or raw provider error are written to console.
    console.error('Staging email worker failed', error instanceof Error ? error.name : 'UnknownError')
    return reply(500, { error: 'Processing failed; message retained unless already quarantined or deleted' })
  }
})
