const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const code=stripTypeScriptTypes(fs.readFileSync(__dirname+'/../supabase/functions/admin-account-emails/index.ts','utf8').replace(/^import.*\n/,''));
const id='11111111-1111-4111-8111-111111111111';
let checks=0;
async function run(options, expected, reads=0) {
  let handler, lookups=0, roles=0;
  const query={select(){return this},eq(k,v){if(k==='user_id')assert.equal(v,'verified-caller');return this},async maybeSingle(){roles++;return {data:options.role===false?null:{role:'super_admin'},error:options.roleError?{}:null}}};
  const client = {
    from(t) { assert.equal(t, 'user_roles'); return query; },
    auth: {
      async getUser(token) {
        assert.equal(token, 'synthetic');
        return {data: {user: {id: 'verified-caller', user_metadata: {role: 'super_admin'}}}, error: options.invalidAuth ? {} : null};
      },
      admin: {
        async getUserById(uid) {
          lookups++;
          return {data: {user: {id: uid, email: 'synthetic@example.invalid', private_metadata: 'must-not-return'}}, error: options.lookupError ? {} : null};
        },
      },
    },
  };
  vm.runInNewContext(code, {
    Request, Response, Set,
    Deno: {env: {get: k => k === 'SUPABASE_URL' ? (options.wrongProject ? 'https://wrong.invalid' : 'https://jeguvjpfuyksqiqrrvyz.supabase.co') : 'synthetic'}, serve: h => handler = h},
    createClient: () => client,
  });
  const method=options.method||'POST';
  const r=await handler(new Request('https://example.invalid',{method,headers:options.noAuth?{}:{Authorization:'Bearer synthetic'},...(method==='POST'?{body:options.raw??JSON.stringify(options.body??{userIds:[id]})}:{})}));
  assert.equal(r.status,expected);assert.equal(lookups,reads);assert.equal(r.headers.get('cache-control'),'no-store');
  const text=await r.text();assert(!text.includes('private_metadata'));if(expected===200)assert.deepEqual(JSON.parse(text),{users:reads?[{id,email:'synthetic@example.invalid'}]:[]});
  if(options.noAuth||options.invalidAuth)assert.equal(roles,0);
  checks++;
}
(async()=>{
 await run({method:'OPTIONS'},204);await run({method:'GET'},405);
 await run({noAuth:true},401);await run({invalidAuth:true},401);
 await run({wrongProject:true},503);await run({role:false},403);
 await run({roleError:true},503);await run({raw:'{'},400);
 await run({body:{userIds:['bad-id']}},400);await run({body:{userIds:Array(101).fill(id)}},400);
 await run({body:{userIds:[]}},200);await run({body:{userIds:[id,id]}},200,1);
 await run({lookupError:true},503,1);await run({},200,1);
 console.log(`PASS ${checks} authorization, input and privacy scenarios; synthetic data only.`);
})().catch(e=>{console.error(e);process.exitCode=1});
