const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(__dirname + '/../supabase/functions/send-transactional-email/index.ts','utf8').replace(/^import .*\n/gm,'');
const code=stripTypeScriptTypes(source);
async function test(mode){
 let handler;const calls=[];
 const env={SUPABASE_URL:'https://jeguvjpfuyksqiqrrvyz.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake-service',EMAIL_WORKER_SECRET:'synthetic-test-secret-longer-than-32-characters',EMAIL_TEST_RECIPIENT:'tester@example.com',EMAIL_FROM:'PsicoOne <noreply@psicoone-mail.sevendevx.com>'};
 if(mode==='project')env.SUPABASE_URL='https://other.supabase.co';
 function from(table){
  calls.push(table);let op='select';
  const q={select(){return q},eq(){return q},insert(){op='insert';return q},upsert(){op='upsert';return q},maybeSingle(){return q},then(resolve){resolve({data:table==='suppressed_emails'?(mode==='suppressed'?{id:1}:null):table==='email_unsubscribe_tokens'?{token:'synthetic',used_at:null}:null,error:null})}};return q;
 }
 const db={from,rpc:async(name,args)=>{calls.push({name,args});return{error:mode==='queue-error'?{message:'fake'}:null}}};
 vm.runInNewContext(code,{Deno:{env:{get:n=>env[n]},serve:fn=>handler=fn},Response,URL,TextEncoder,crypto:webcrypto,console:{log(){},error(){},warn(){}},createClient:()=>db,React:{createElement:()=>({})},renderAsync:async()=>'<p>fake rendered template</p>',TEMPLATES:{'appointment-confirmation':{component:()=>{},subject:'Test'}},fetch:()=>{throw new Error('Unexpected outbound request')}});
 const body={templateName:mode==='template'?'unknown':'appointment-confirmation',recipientEmail:mode==='recipient'?'real-customer@example.com':'tester@example.com',templateData:{portalUrl:mode==='link'?'https://production.example.com':'https://psicoonex.vercel.app/portal'}};
 const res=await handler(new Request('https://example.com',{method:'POST',headers:{'x-email-worker-secret':mode==='auth'?'wrong':env.EMAIL_WORKER_SECRET},body:JSON.stringify(body)}));
 const result=await res.json();
 const expected={success:200,auth:401,project:503,recipient:403,link:400,template:404,suppressed:200,'queue-error':500}[mode];
 assert.equal(res.status,expected,mode);
 const queued=calls.filter(c=>c.name==='enqueue_email');
 assert.equal(queued.length,['success','queue-error'].includes(mode)?1:0,mode);
 if(mode==='success'){assert.equal(result.sent,false);assert.equal(result.manual_processing,true);assert.equal(queued[0].args.payload.from,env.EMAIL_FROM);assert.equal(queued[0].args.queue_name,'transactional_emails');assert.ok(queued[0].args.payload.queued_at)}
 if(['auth','project','recipient','link','template'].includes(mode))assert.equal(calls.length,0);
 console.log('PASS',mode);
}
(async()=>{for(const m of ['success','auth','project','recipient','link','template','suppressed','queue-error'])await test(m)})().catch(e=>{console.error(e);process.exitCode=1});
