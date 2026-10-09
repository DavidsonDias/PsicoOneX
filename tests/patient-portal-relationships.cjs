const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {stripTypeScriptTypes} = require('node:module');
const source = stripTypeScriptTypes(fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/patient-portal/index.ts'),'utf8').replace(/^import .*;\r?\n/gm,''));
async function run(edit, action, status, dbError) {
 const rows = {
 patient_access_links:{id:'link',token:'synthetic',patient_id:'patient',appointment_id:'appointment',created_by:'owner',expires_at:'2099-01-01',is_revoked:false},
 patients:{id:'patient',psychologist_id:'owner',deleted_at:null,full_name:'Synthetic'},
 appointments:{id:'appointment',patient_id:'patient',psychologist_id:'owner',deleted_at:null},
 profiles:{full_name:'Synthetic'}
 };
 edit(rows); let handler; let writes=0; let lookups=0;
 const db={from(table){return {select(){return this},eq(){return this},
 async single(){lookups++; return {data:rows[table],error:dbError===table?{message:'PRIVATE'}:null}},
 update(){writes++;throw Error('Unexpected write')},insert(){writes++;throw Error('Unexpected write')}
 }}};
 vm.runInNewContext(source,{Request,Response,console:{error(){},warn(){}},createClient:()=>db,Deno:{env:{get:()=> 'synthetic'},serve:fn=>handler=fn}});
 const res=await handler(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({token:'synthetic',action})}));
 assert.equal(res.status,status); assert.equal(writes,0); assert(!((await res.text()).includes('PRIVATE')));
 return lookups;
}
(async()=>{
 let passed=0;
 const invalid=[
 r=>r.patients.psychologist_id='other',
 r=>r.appointments.patient_id='other',
 r=>r.appointments.psychologist_id='other',
 r=>r.patients.deleted_at='2026-01-01',
 r=>r.appointments.deleted_at='2026-01-01',
 r=>r.patient_access_links.created_by=null,
 ];
 for(const edit of invalid) for(const action of [undefined,'confirm','cancel','reschedule','message','join']) {await run(edit,action,403);passed++;}
 for(const table of ['patients','appointments']) {await run(()=>{},'confirm',500,table);passed++;}
 await run(r=>r.patient_access_links.expires_at='invalid',undefined,410);passed++;
 await run(r=>r.patient_access_links.expires_at='2020-01-01',undefined,410);passed++;
 await run(r=>r.patient_access_links.is_revoked=true,undefined,403);passed++;
 await run(()=>{},undefined,200);passed++;
 await run(r=>r.patient_access_links.appointment_id=null,undefined,200);passed++;
 console.log(passed+' portal relationship tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
