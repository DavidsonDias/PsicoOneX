const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../supabase/functions/create-checkout/index.ts', 'utf8');
const selectors = ['price_1T9mRHAoMppjN4nr2UaJUpFD','price_1T9mRmAoMppjN4nrQUuyWzu9','price_1T9mSFAoMppjN4nrbsE6vHIW'];
const products = ['prod_VJRCMaTkKJwey5','prod_VJRDobs98Gd8d8','prod_VJRDP4cdzq4dUb'];
async function run(o = {}) {
  let handler; const calls = [];
  const env = { SUPABASE_URL:'https://jeguvjpfuyksqiqrrvyz.supabase.co', SUPABASE_ANON_KEY:'anon-test-fixture', STRIPE_TEST_SECRET_KEY:'sk_test_fixture', ...o.env };
  const index = o.index || 0;
  const price = { id:'price_test_fixture',product:products[index],livemode:false,active:true,currency:'brl',unit_amount:[3900,7900,14900][index],billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},...o.price };
  vm.runInNewContext(source, {Deno:{env:{get:k=>env[k]},serve:h=>handler=h},Response,URL,URLSearchParams,AbortSignal,fetch:async(url,options)=>{
    calls.push({url,options});
    if(url.includes('/auth/v1/user')) return Response.json({id:'user-fixture',email:'test@example.com'},{status:o.authStatus||200});
    if(url.includes('/v1/prices?')) return Response.json({data:o.duplicate?[price,price]:[price],has_more:false});
    return Response.json({id:'cs_test_fixture',livemode:false,url:'https://checkout.stripe.com/c/pay/cs_test_fixture',...o.session});
  }});
  const method=o.method||'POST';
  const headers={authorization:'Bearer fixture',origin:'https://psicoonex.vercel.app',...o.headers};
  const request = new Request('https://example.com',{method,headers,...(method==='POST'?{body:o.raw||JSON.stringify({priceId:selectors[index],...o.body})}:{})});
  const response=await handler(request);
  return {response,calls};
}
(async()=>{
  let count=0;
  for(let index=0;index<3;index++) {
    const r=await run({index}); assert.equal(r.response.status,200);
    const params=new URLSearchParams(r.calls[2].options.body);
    assert.equal(params.get('line_items[0][price]'),'price_test_fixture');
    assert.equal(params.get('success_url'),'https://psicoonex.vercel.app/dashboard?checkout=test_completed');
    assert.equal(params.get('metadata[environment]'),'staging_test'); count++;
  }
  const rejected = [
    [{headers:{authorization:''}},401,0], [{authStatus:401},401,1],
    [{env:{STRIPE_TEST_SECRET_KEY:'sk_live_fixture'}},503,0],
    [{env:{SUPABASE_URL:'https://original.supabase.co'}},503,0],
    [{body:{priceId:'price_unknown'}},400,1], [{raw:'{'},400,1],
    [{headers:{origin:'https://evil.example'}},403,0],
    [{price:{livemode:true}},503,2], [{price:{unit_amount:1}},503,2],
    [{price:{currency:'usd'}},503,2], [{duplicate:true},503,2],
    [{session:{livemode:true}},502,3], [{session:{url:'https://evil.example'}},502,3],
    [{method:'GET'},405,0], [{method:'OPTIONS'},204,0],
  ];
  for(const [o,status,calls] of rejected) {const r=await run(o);assert.equal(r.response.status,status,JSON.stringify(o));assert.equal(r.calls.length,calls);count++;}
  console.log(`${count} checks passed. No network or database writes performed.`);
})().catch(e=>{console.error(e);process.exitCode=1});
