'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),F=require('../auth-flow.js');
// Exercise the exact bundled SDK with a local fake HTTP service. No network or real accounts.
const sdk=new Function(fs.readFileSync(path.join(__dirname,'../vendor/supabase.js'),'utf8')+';return supabase;')();
function fixture(){
 const user={id:'11111111-1111-4111-8111-111111111111',email:'organizador@example.com',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-11-09T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-11-09T00:00:00Z'},calls=[],store=new Map();
 const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'})+'.test-signature';
 const session={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user};
 const fetch=async(input,options={})=>{const url=new URL(input),body=options.body?JSON.parse(options.body):null;calls.push({path:url.pathname,method:options.method,body});let response;
 if(url.pathname.endsWith('/verify')||url.pathname.endsWith('/token'))response=session;
 else if(url.pathname.endsWith('/user'))response=user;
 else if(url.pathname.endsWith('/recover'))response={};
 else throw Error('Unexpected fake HTTP request: '+url.pathname);
 return new Response(JSON.stringify(response),{status:200,headers:{'content-type':'application/json'}});};
 const client=sdk.createClient('https://auth-test.supabase.co','test-public-key',{global:{fetch},auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce',storageKey:'sdk-test',storage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)}}});return {client,calls,user,token};
}
test('SDK real aceita convite com fragmento, verifica usuário e atualiza somente sua senha',async()=>{const f=fixture(),state=await F.complete(f.client.auth,'https://example.com/auth.html#access_token='+f.token+'&refresh_token=test-refresh&type=invite');assert.equal(state.mode,'invite');await F.savePassword(f.client.auth,state,'SenhaSomenteTeste123','SenhaSomenteTeste123');assert.equal(state.mode,'saved');assert.ok(f.calls.some(call=>call.method==='PUT'&&call.path.endsWith('/user')));});
test('SDK real confirma TokenHash do template e devolve sessão válida',async()=>{const f=fixture(),state=await F.complete(f.client.auth,'https://example.com/auth.html?token_hash=test-hash&type=email');assert.equal(state.mode,'confirmed');assert.ok(f.calls.some(call=>call.path.endsWith('/verify')&&call.body.token_hash==='test-hash'&&call.body.type==='email'));});
test('SDK real solicita recuperação PKCE e identifica recovery ao trocar código',async()=>{const f=fixture();const request=await f.client.auth.resetPasswordForEmail('organizador@example.com',{redirectTo:'https://example.com/auth.html'});assert.equal(request.error,null);const state=await F.complete(f.client.auth,'https://example.com/auth.html?code=test-code');assert.equal(state.mode,'recovery');assert.ok(f.calls.some(call=>call.path.endsWith('/token')&&call.body.auth_code==='test-code'&&call.body.code_verifier));});
