(function(root){
'use strict';
const cfg=root.TORNEIO_CONFIG||{};
const configured=Boolean(/^https:\/\/[^/]+/.test(cfg.supabaseUrl||'')&&cfg.supabasePublishableKey);
let client=null,revision=null,session=null,role=null,context={admin:false,id:null,token:null};
function getClient(){
 if(!configured)throw Error('Configure a conexão do projeto.');
 if(!root.supabase?.createClient)throw Error('Não foi possível carregar a conexão.');
 if(!client){client=root.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'torneio-auth-'+(cfg.tournamentId||'principal')}});client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){session=null;role=null;root.dispatchEvent(new CustomEvent('torneio-signed-out'));}if(event==='PASSWORD_RECOVERY')root.dispatchEvent(new CustomEvent('torneio-recovery'));});}
 return client;
}
function backendError(error){if(!error)return;if(['42P01','PGRST202','PGRST205','42883'].includes(error.code))throw Error('Execute o SQL complementar necessário: 003 para logos, 004 para o portal e 005 para a versão 5.3.');throw Error(error.message||'Não foi possível acessar o servidor.');}
async function rpc(name,args){const r=await getClient().rpc(name,args);backendError(r.error);return r.data;}
const first=data=>Array.isArray(data)?data[0]||null:data;
function configure(value){context={admin:Boolean(value.admin),id:value.id||null,token:value.token||null};revision=null;}
async function identify(){const db=getClient(),stored=await db.auth.getSession();backendError(stored.error);session=stored.data.session;role=null;if(session){const checked=await db.auth.getUser();if(checked.error){await db.auth.signOut({scope:'local'});session=null;}else{const profile=await rpc('rt_profile');role=profile?.role||null;}}return {session,role,admin:Boolean(role)};}
async function directory(){return await rpc('rt_public_directory')||[];}
async function list(){if(!role)throw Error('Entre com uma conta autorizada.');return await rpc('rt_list_competitions_v51')||[];}
async function load(){
 let row;
 if(context.admin){if(!context.id)return null;row=first(await rpc('rt_get_competition_v53',{p_id:context.id}));}
 else{if(!context.token)context.token=await rpc('rt_default_public');if(!context.token)return null;row=first(await rpc('rt_public_competition_v53',{p_token:context.token}));}
 if(!row)throw Error('Competição não encontrada ou acompanhamento indisponível.');
 context.id=row.id;if(row.public_token)context.token=row.public_token;return row;
}
function acceptRevision(value){revision=value===null?null:Number(value);}
async function loadIfChanged(){
 const current=context.admin?await rpc('rt_revision',{p_id:context.id}):await rpc('rt_public_revision',{p_token:context.token});
 if(current===null)throw Error('O acesso a esta competição não está disponível.');
 if(Number(current)===revision)return null;
 return load();
}
async function create(payload,requestId){const row=first(await rpc('rt_create_competition',{p_payload:payload,p_id:requestId}));if(!row?.id)throw Error('Não foi possível criar a competição.');return row;}
async function save(payload){if(!session||!role||!context.admin||!context.id)throw Error('Entre com uma conta autorizada para salvar.');const next=await rpc('rt_save_competition_v53',{p_id:context.id,p_payload:payload,p_expected_revision:revision,p_state:root.Arena.competitionState(payload)});acceptRevision(next);return revision;}
async function organizers(){return await rpc('rt_list_organizers')||[];}
async function setOrganizer(email,active){return rpc('rt_set_organizer',{p_email:email,p_active:active});}
function logoUrl(path){if(!path||!/^[a-zA-Z0-9_-]{1,80}\/[a-f0-9-]{36}\.(webp|png|jpg)$/.test(path))return '';return cfg.supabaseUrl.replace(/\/$/,'')+'/storage/v1/object/public/competition-logos/'+path;}
async function uploadLogo(blob){if(!session||!role||!context.admin||!context.id)throw Error('Entre na competição para enviar sua logo.');if(!blob||blob.size>2097152||!['image/webp','image/png','image/jpeg'].includes(blob.type))throw Error('Envie uma imagem válida de até 2 MB.');const extension=blob.type==='image/webp'?'webp':blob.type==='image/png'?'png':'jpg',path=context.id+'/'+root.Arena.uid()+'.'+extension;const r=await getClient().storage.from('competition-logos').upload(path,blob,{cacheControl:'31536000',contentType:blob.type,upsert:false});if(r.error)throw Error('Não foi possível enviar a logo. Confira a conexão e execute o SQL 003 de configuração das logos.');return path;}
async function removeLogo(path){if(!logoUrl(path)||path.split('/')[0]!==context.id)throw Error('Logo inválida.');const r=await getClient().storage.from('competition-logos').remove([path]);backendError(r.error);}
async function login(email,password){const r=await getClient().auth.signInWithPassword({email,password});if(r.error)throw Error('Não foi possível entrar. Confira e-mail, senha e conexão.');return identify();}
async function logout(){const r=await getClient().auth.signOut({scope:'local'});backendError(r.error);session=null;role=null;}
async function resetPassword(email){const redirect=new URL('auth.html',document.baseURI);redirect.search='';redirect.hash='';const r=await getClient().auth.resetPasswordForEmail(email,{redirectTo:redirect.href});backendError(r.error);}
async function changePassword(password){const r=await getClient().auth.updateUser({password});backendError(r.error);}
root.TorneioCloud={directory,logoUrl,uploadLogo,removeLogo,configured,configure,identify,list,load,loadIfChanged,create,save,organizers,setOrganizer,acceptRevision,login,logout,resetPassword,changePassword,get revision(){return revision;},get session(){return session;},get role(){return role;},get context(){return {...context};}};
})(window);
