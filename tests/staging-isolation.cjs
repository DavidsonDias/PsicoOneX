const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const names = require('./staging-blocked-functions.json');
const source = name => fs.readFileSync(path.join(root, 'supabase/functions', name), 'utf8');
const helper = stripTypeScriptTypes(source('_shared/staging-isolation.ts').replace('export function', 'function'));
let checks = 0;
async function run() {
  for (const name of names) {
    for (const populated of [false, true]) {
      let handler;
      const attempted = [];
      const forbidden = label => () => { attempted.push(label); throw Error('Unexpected effect: ' + label); };
      // Remote imports are replaced with tripwires; no module download or real network is allowed.
      const code = stripTypeScriptTypes(source(name + '/index.ts').replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, ''));
      const context = {
        Deno: { env: { get: key => populated ? (key === 'SUPABASE_URL' ? 'https://jeguvjpfuyksqiqrrvyz.supabase.co' : 'synthetic-credential') : undefined }, serve: h => handler = h },
        serve: h => handler = h,
        Request, Response, URL, URLSearchParams, TextEncoder, TextDecoder, AbortSignal,
        console, corsHeaders: {}, fetch: forbidden('network'), createClient: forbidden('database/auth'),
        Stripe: forbidden('stripe'), webpush: { setVapidDetails: forbidden('vapid'), sendNotification: forbidden('push') },
        requireUser: forbidden('auth'), requireInternalSecret: forbidden('internal auth'),
      };
      vm.runInNewContext(helper + '\n' + code, context, { filename: name });
      assert.equal(typeof handler, 'function', name);
      for (const method of ['GET', 'POST', 'OPTIONS']) {
        const request = new Request('https://example.invalid/functions/' + name, { method, headers: { Authorization: 'Bearer synthetic', Origin: 'https://untrusted.invalid' } });
        const response = await handler(request);
        assert.equal(response.status, method === 'OPTIONS' ? 204 : 503, name);
        assert.equal(response.headers.get('access-control-allow-origin'), 'https://psicoonex.vercel.app');
        if (method !== 'OPTIONS') assert.equal((await response.json()).code, 'STAGING_INTEGRATION_PAUSED');
        assert.deepEqual(attempted, [], name + ' must not access services');
        checks++;
      }
    }
  }
  console.log('PASS: ' + checks + ' requests across ' + names.length + ' handlers; zero network/database effects.');
}
run().catch(e => { console.error(e); process.exitCode = 1; });
