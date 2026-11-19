(function(){
'use strict';
const flow=window.TorneioAuthFlow,cfg=window.TORNEIO_CONFIG||{},container=document.querySelector('#auth-content');
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const storageKey='torneio-auth-'+(cfg.tournamentId||'principal'),key=flow.markerKey(storageKey);let client,state,busy=false;
function frame(title,description,body=''){document.title=title+' | Roteirizze Torneios';container.innerHTML='<p class="kicker">ACESSO DA ORGANIZAÇÃO</p><h1>'+esc(title)+'</h1><p class="muted">'+esc(description)+'</p>'+body;}
const links='<div class="actions"><a class="btn primary" href="admin.html">Ir para o painel</a><a class="btn" href="index.html">Acompanhar torneio</a></div>';
function requestForm(){return '<form id="request-password"><label>E-mail da sua conta<input type="email" name="email" autocomplete="email" required></label><p class="error-text" id="auth-error" role="alert"></p><p class="help" id="auth-message" role="status"></p><button class="primary" type="submit">Enviar novo link de senha</button></form><p class="help">Se o convite venceu, peça ao administrador um novo convite. A recuperação de senha também pode ser usada se a conta já estiver confirmada.</p>'+links;}
function show(){
 if(['invite','recovery','change'].includes(state.mode)){
  const title=state.mode==='invite'?'Crie sua senha':state.mode==='change'?'Alterar senha':'Defina sua nova senha';
  frame(title,state.mode==='invite'?'Seu convite foi confirmado. Escolha uma senha para acessar o painel.':'Escolha e confirme a senha que você vai usar para entrar.',`<p class="auth-account">${esc(state.user.email||'Conta autenticada')}</p><form id="set-password"><label>Nova senha<input type="password" name="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><label>Confirme a nova senha<input type="password" name="confirmation" autocomplete="new-password" minlength="8" maxlength="128" required></label><p class="help">Use pelo menos 8 caracteres. Prefira uma combinação única de letras, números e símbolos.</p><p class="error-text" id="auth-error" role="alert"></p><button class="primary" type="submit">${state.mode==='invite'?'Criar minha senha':'Salvar nova senha'}</button></form><a class="auth-public" href="admin.html">Voltar ao painel</a>`);
 }else if(state.mode==='confirmed')frame('E-mail confirmado','A confirmação foi concluída. Você pode entrar no painel com suas credenciais.','<p class="help">A confirmação do e-mail não libera a gestão de torneios sozinha. O administrador da Roteirizze precisa autorizar seu e-mail em Organizadores.</p>'+links);
 else if(state.mode==='saved')frame('Senha salva','Sua senha foi atualizada com sucesso.','<p class="help">Se você acabou de receber um convite, seu e-mail ainda precisa ser autorizado em Organizadores para gerir competições.</p>'+links);
 else frame('Acesso da organização','Entre no painel ou solicite um link para definir uma nova senha.',requestForm());
}
async function start(){
 frame('Conferindo seu acesso','Aguarde enquanto validamos o link recebido por e-mail.');
 try{
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey||!window.supabase?.createClient)throw Error('Não foi possível carregar a conexão do site. Atualize a página.');
  const incoming=location.href;
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce',storageKey}});
  state=await flow.complete(client.auth,incoming,{storage:window.sessionStorage,key,clean:()=>history.replaceState(null,'',new URL('auth.html',document.baseURI).pathname)});show();
 }catch(error){history.replaceState(null,'',new URL('auth.html',document.baseURI).pathname);frame('Não foi possível confirmar o acesso',error.message,requestForm());}
}
container.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;const form=event.target,button=form.querySelector('[type="submit"]'),fields=new FormData(form);busy=true;button.disabled=true;document.querySelector('#auth-error').textContent='';
 try{
  if(!client)throw Error('Atualize a página para tentar novamente.');
  if(form.id==='set-password'){await flow.savePassword(client.auth,state,String(fields.get('password')||''),String(fields.get('confirmation')||''),{storage:window.sessionStorage,key});form.reset();show();}
  else if(form.id==='request-password'){
   const redirect=new URL('auth.html',document.baseURI);const response=await client.auth.resetPasswordForEmail(String(fields.get('email')||'').trim(),{redirectTo:redirect.href});
   if(response.error)throw Error('Não foi possível enviar o link agora. Confira sua conexão ou tente novamente em alguns minutos.');
   document.querySelector('#auth-message').textContent='Se o e-mail estiver cadastrado, você receberá um link. Confira também o spam e abra o link mais recente neste mesmo navegador.';
  }
 }catch(error){document.querySelector('#auth-error').textContent=error.message;}
 finally{busy=false;if(button.isConnected)button.disabled=false;}
});
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
start();
})();
