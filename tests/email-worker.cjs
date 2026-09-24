const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const code = fs.readFileSync(__dirname + '/../supabase/functions/process-email-queue/index.ts', 'utf8');
async function run(mode) {
  let handler; const calls = [];
  const env = {
    SUPABASE_URL: 'https://jeguvjpfuyksqiqrrvyz.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', RESEND_API_KEY: 'test-resend-key',
    EMAIL_FROM: 'PsicoOne <noreply@psicoone-mail.sevendevx.com>',
    EMAIL_TEST_RECIPIENT: 'tester@example.com',
    EMAIL_WORKER_SECRET: 'synthetic-worker-secret-for-local-tests-only',
  };
  if (mode === 'wrong-project') env.SUPABASE_URL = 'https://other.supabase.co';
  if (mode === 'missing-secret') delete env.EMAIL_WORKER_SECRET;
  const payload = {
    message_id: '12345678-1234-4234-8234-123456789abc',
    queued_at: new Date().toISOString(), to: 'tester@example.com',
    from: 'attacker@example.com', bcc: ['other@example.com'], subject: 'Test', text: 'Synthetic test',
  };
  if (mode === 'blocked') payload.to = 'customer@example.com';
  if (mode === 'expired') payload.queued_at = '2000-01-01T00:00:00Z';
  const response = (data, status = 200) => new Response(JSON.stringify(data), {status});
  const fetch = async (url, opts) => {
    calls.push({url, body: opts.body ? JSON.parse(opts.body) : null, headers: opts.headers});
    if (url === 'https://api.resend.com/emails') return response({id:'fake-id'}, mode === 'rate-limit' ? 429 : 200);
    if (url.includes('email_send_state?')) return response([]);
    if (url.includes('rpc/read_email_batch')) return response(mode === 'empty' ? [] : [{msg_id:1, read_ct:1, message:payload}]);
    if (url.includes('email_send_log?')) {
      if (mode === 'db-error') return response({}, 500);
      return response(mode === 'duplicate' ? [{status:'sent'}] : mode === 'retries' ? Array(5).fill({status:'failed'}) : []);
    }
    if (url.includes('suppressed_emails?')) return response(mode === 'suppressed' ? [{id:1}] : []);
    return response(true);
  };
  vm.runInNewContext(code, {Deno:{env:{get:n=>env[n]},serve:fn=>handler=fn}, fetch,
    Response, AbortSignal, TextEncoder, crypto:webcrypto, console:{error:()=>{}}});
  const headers = {Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY};
  if (mode !== 'missing-header') headers['x-email-worker-secret'] = mode === 'unauthorized' ? 'wrong-secret' : (env.EMAIL_WORKER_SECRET || '');
  const res = await handler(new Request('https://example.com', {method:'POST', headers}));
  const sent = calls.filter(c=>c.url === 'https://api.resend.com/emails');
  if (mode === 'success' || mode === 'rate-limit') assert.equal(sent.length, 1);
  else assert.equal(sent.length, 0, mode);
  if (mode === 'success') {
    assert.equal(res.status, 200);
    assert.deepEqual(sent[0].body.to, ['tester@example.com']);
    assert.equal(sent[0].body.from, env.EMAIL_FROM);
    assert.equal(sent[0].body.bcc, undefined);
    assert.ok(sent[0].headers['Idempotency-Key']);
    assert.ok(calls.some(c=>c.url.includes('rpc/delete_email')));
  }
  if (mode === 'rate-limit') {
    assert.equal(res.status, 429);
    assert.ok(!calls.some(c=>c.url.includes('rpc/delete_email')));
  }
  if (mode === 'unauthorized') { assert.equal(res.status,401); assert.equal(calls.length,0); }
  if (mode === 'missing-header') { assert.equal(res.status,401); assert.equal(calls.length,0); }
  if (mode === 'missing-secret') { assert.equal(res.status,503); assert.equal(calls.length,0); }
  if (mode === 'wrong-project') { assert.equal(res.status,503); assert.equal(calls.length,0); }
  if (mode === 'db-error') assert.equal(res.status,500);
  assert.ok(calls.every(c=>!JSON.stringify(c.body).includes('auth_emails')));
  console.log('PASS', mode);
}
(async()=>{for(const mode of ['success','blocked','expired','duplicate','retries','suppressed','empty','unauthorized','wrong-project','db-error','rate-limit','missing-header','missing-secret']) await run(mode)})().catch(e=>{console.error(e);process.exitCode=1});
