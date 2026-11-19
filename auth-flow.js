(function(root){
'use strict';
const types=new Set(['invite','recovery','signup','email','email_change','magiclink']);
const message='Este link é inválido, expirou ou já foi utilizado. Solicite um novo link e abra o mais recente. Para recuperação por código, use o mesmo navegador em que fez o pedido.';
function fail(){return Error(message);}
function parse(value){const url=new URL(value),hash=new URLSearchParams(url.hash.slice(1)),query=url.searchParams,get=name=>hash.get(name)||query.get(name)||'';return {type:get('type'),code:query.get('code')||'',tokenHash:get('token_hash'),accessToken:hash.get('access_token')||'',refreshToken:hash.get('refresh_token')||'',error:get('error')||get('error_code')||get('error_description'),action:query.get('acao')||''};}
function hasReturn(value){const p=parse(value);return Boolean(p.code||p.tokenHash||p.accessToken||p.refreshToken||p.error);}
function markerKey(clientKey){return clientKey+':password-intent';}
function remember(storage,key,state){try{storage?.setItem(key,JSON.stringify({id:state.user.id,mode:state.mode,at:Date.now()}));}catch{}}
function forget(storage,key){try{storage?.removeItem(key);}catch{}}
function previous(storage,key,user){try{const saved=JSON.parse(storage?.getItem(key)||'null');return saved?.id===user.id&&['invite','recovery','change','confirmed'].includes(saved.mode)&&Date.now()-saved.at>=0&&Date.now()-saved.at<1800000?saved.mode:null;}catch{return null;}}
async function complete(auth,value,{storage,key='torneio-auth:password-intent',clean=()=>{}}={}){
 const p=parse(value),incoming=hasReturn(value);let mode=null,response=null;
 try{
  if(p.error)throw fail();
  if(incoming){
   forget(storage,key);
   if(p.type&&!types.has(p.type))throw fail();
   if(p.tokenHash){if(!types.has(p.type))throw fail();response=await auth.verifyOtp({token_hash:p.tokenHash,type:p.type});}
   else if(p.code)response=await auth.exchangeCodeForSession(p.code);
   else {if(!p.accessToken||!p.refreshToken)throw fail();response=await auth.setSession({access_token:p.accessToken,refresh_token:p.refreshToken});}
   if(response?.error||!response?.data?.session)throw fail();
   const type=response.data.redirectType==='recovery'?'recovery':p.type;
   mode=type==='invite'?'invite':type==='recovery'?'recovery':'confirmed';
  }
  const checked=await auth.getUser();
  if(checked.error||!checked.data?.user){if(incoming||p.action==='alterar')throw fail();forget(storage,key);return {mode:'idle',user:null};}
  const user=checked.data.user;
  if(!mode)mode=p.action==='alterar'?'change':previous(storage,key,user)||'idle';
  const state={mode,user};if(incoming||p.action==='alterar')remember(storage,key,state);return state;
 }catch(error){if(incoming)forget(storage,key);throw error;}
 finally{clean();}
}
function validatePassword(password,confirmation){if(password.length<8)throw Error('Use uma senha com pelo menos 8 caracteres.');if(password.length>128)throw Error('Use uma senha com até 128 caracteres.');if(password!==confirmation)throw Error('As senhas não conferem.');}
async function savePassword(auth,state,password,confirmation,{storage,key='torneio-auth:password-intent'}={}){
 validatePassword(password,confirmation);
 if(!['invite','recovery','change'].includes(state?.mode)||!state.user?.id)throw fail();
 const checked=await auth.getUser();if(checked.error||checked.data?.user?.id!==state.user.id)throw Error('Sua sessão mudou ou expirou. Abra um novo link ou entre novamente antes de alterar a senha.');
 const response=await auth.updateUser({password});
 if(response.error){const code=response.error.code||'';if(code==='weak_password')throw Error('Essa senha foi considerada fraca. Use uma combinação mais forte.');if(code==='same_password')throw Error('Escolha uma senha diferente da atual.');if(code==='reauthentication_needed'||code==='reauthentication_not_valid')throw Error('Entre novamente no painel e solicite a alteração de senha.');throw Error('Não foi possível salvar a senha. Confira sua conexão e as regras de senha do projeto.');}
 forget(storage,key);state.mode='saved';return state;
}
const api={parse,hasReturn,complete,savePassword,validatePassword,markerKey,forget};if(typeof module!=='undefined')module.exports=api;else root.TorneioAuthFlow=api;
})(typeof window!=='undefined'?window:globalThis);
