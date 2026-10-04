const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(__dirname+'/../supabase/functions/send-appointment-reminders/index.ts','utf8').replace(/^import .*;\r?\n/gm,''));
let passed=0;
async function test(name,o={},status=200){
 let handler,writes=0,calls=0,reads=0;
 const secret='synthetic-worker-secret-for-reminders';
 const env={EMAIL_WORKER_SECRET:secret,EMAIL_TEST_RECIPIENT:'test@example.invalid',SUPABASE_URL:'https://jeguvjpfuyksqiqrrvyz.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',...o.env};
 const apt={id:'synthetic-appointment',patient_id:'synthetic-patient',psychologist_id:'owner',scheduled_at:new Date(Date.now()+3600000).toISOString(),status:'scheduled',deleted_at:null,patients:{email:'test@example.invalid',full_name:'Paciente Ficticio',psychologist_id:'owner',deleted_at:null,...o.patient}};
 const rows={user_preferences:[{user_id:'owner',settings:{reminder_minutes:o.offsets??[60]}}],appointments:[apt],email_send_log:o.existing?[{id:'log',template_name:'appointment-reminder',status:'sent','metadata->>idempotency_key':'apt-rem-60-synthetic-appointment'}]:[],profiles:[{id:'owner',full_name:'Profissional'}],patient_access_links:[{token:'synthetic_access_token_123'}]};
 const db={from(table){reads++;let filters=[];const query={
 select(){return this},limit(){return this},eq(k,v){filters.push(r=>r[k]===v);return this},is(k,v){return this.eq(k,v)},in(k,v){filters.push(r=>v.includes(r[k]));return this},gte(k,v){filters.push(r=>r[k]>=v);return this},lt(k,v){filters.push(r=>r[k]<v);return this},
 insert(){writes++;return this},
 result(single=false){return {data:o.dbError===table?null:single?(rows[table].filter(r=>filters.every(f=>f(r)))[0]??null):rows[table].filter(r=>filters.every(f=>f(r))),error:o.dbError===table?{message:'private db details'}:null}},
 returns(){return Promise.resolve(this.result())},maybeSingle(){return Promise.resolve(this.result(true))},single(){return Promise.resolve(this.result(true))},then(ok,bad){return Promise.resolve(this.result()).then(ok,bad)}
 };return query}};
 vm.runInNewContext(source,{Response,Request,AbortSignal,Date,Map,Set,Deno:{env:{get:k=>env[k]},serve:f=>handler=f},createClient(){return db},async fetch(url,init){calls++;assert.equal(init.headers['x-email-worker-secret'],secret);assert.equal(init.headers.Authorization,undefined);assert.equal(init.headers.apikey,undefined);assert(init.signal);const body=JSON.parse(init.body);assert.equal(body.recipientEmail,'test@example.invalid');assert.equal(body.templateName,'appointment-reminder');if(o.throwFetch)throw Error('private network error');return new Response(JSON.stringify(o.response??{success:true,queued:true,sent:false,messageId:'test-message'}),{status:o.upstreamStatus??200})}});
 const method=o.method??'POST';const res=await handler(new Request('https://example.invalid',{method,headers:o.noAuth?{}:{'x-email-worker-secret':o.badAuth?'bad':secret},...(method==='POST'?{body:o.raw??JSON.stringify(o.body??{})}:{})}));
 const text=await res.text();assert.equal(res.status,status,name);assert(!text.includes(secret));assert(!text.includes('private'));
 assert.equal(calls,o.calls??0,name+': calls');assert.equal(writes,o.writes??0,name+': writes');
 if(o.noReads)assert.equal(reads,0);
 if(status===200){const data=JSON.parse(text);assert.equal(data.stats.sent,0);assert.equal(data.stats.queued,o.queued??0);if(o.eligible!==undefined)assert.equal(data.stats.eligible,o.eligible)}
 passed++;
}
(async()=>{
 await test('preflight',{method:'OPTIONS',noReads:true},204);await test('method',{method:'GET',noReads:true},405);
 await test('missing auth',{noAuth:true,noReads:true},403);await test('invalid auth',{badAuth:true,noReads:true},403);
 await test('missing secret',{env:{EMAIL_WORKER_SECRET:''},noReads:true},403);
 await test('wrong project',{env:{SUPABASE_URL:'https://other.invalid'},noReads:true},503);
 await test('invalid JSON',{raw:'{',noReads:true},400);await test('invalid dryrun',{body:{dry_run:'false'},noReads:true},400);
 await test('default is read-only',{eligible:1});await test('explicit simulation',{body:{dry_run:true},eligible:1});
 await test('disabled offsets',{offsets:[],eligible:0});await test('invalid offsets ignored',{offsets:[-1,'60',Infinity],eligible:0});
 await test('non-test recipient',{patient:{email:'real@example.invalid'},eligible:0,body:{dry_run:false}});
 await test('deleted patient',{patient:{deleted_at:'2030-01-01'},eligible:0,body:{dry_run:false}});
 await test('mismatched owner',{patient:{psychologist_id:'other'},eligible:0,body:{dry_run:false}});
 await test('existing reminder',{existing:true,eligible:0});
 for(const table of ['user_preferences','appointments','email_send_log','profiles'])await test('query error '+table,{dbError:table,body:{dry_run:false}},503);
 await test('link fails',{dbError:'patient_access_links',body:{dry_run:false},writes:1},503);
 await test('queue acknowledged',{body:{dry_run:false},writes:1,calls:1,queued:1});
 await test('queue incomplete',{body:{dry_run:false},writes:1,calls:1,response:{success:true}},503);
 await test('queue refused',{body:{dry_run:false},writes:1,calls:1,upstreamStatus:403},503);
 await test('network failure',{body:{dry_run:false},writes:1,calls:1,throwFetch:true},503);
 console.log(passed+' appointment reminder tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
