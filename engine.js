(function(root){
'use strict';
const Crossing=typeof module!=='undefined'?require('./crossings.js'):BracketCrossings;
const models=typeof module!=='undefined'?require('./templates.js'):BRACKET_MODELS;
const uid=()=>{if(typeof crypto!=='undefined'&&crypto.randomUUID)return crypto.randomUUID();const bytes=new Uint8Array(16);if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);else bytes.forEach((_,i)=>bytes[i]=Math.floor(Math.random()*256));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);};
const normalize=s=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase();
const fresh=()=>({version:3,created:false,name:'Nova competição',courts:1,categories:[],updated:null});
function category(name,count){if(!models[count])throw Error('Quantidade de duplas indisponível.');return {id:uid(),name:name.trim(),count:Number(count),bracketMode:'fixed',routingVersion:2,crossingRoutes:{},teams:Array.from({length:Number(count)},()=>({id:uid(),a:'',b:''})),draw:[],confirmed:false,drawAt:null,results:{},routes:{}};}
const teamName=t=>t?[t.a,t.b].filter(Boolean).join(' / '):'A definir';
function validateTeams(c){if(!c.name.trim())throw Error('Informe o nome da categoria.');if(c.teams.length!==c.count||c.teams.some(t=>!t.a.trim()||!t.b.trim()))throw Error('Preencha os dois atletas de todas as duplas.');const names=c.teams.flatMap(t=>[normalize(t.a),normalize(t.b)]);if(new Set(names).size!==names.length)throw Error('Há um atleta repetido. Diferencie os homônimos com nome completo ou um identificador.');}
function saveTeams(c,name,count,teams){
 name=String(name).trim();count=Number(count);
 if(!name||name.length>80)throw Error('Informe o nome da categoria com até 80 caracteres.');
 if(!models[count]||!Array.isArray(teams)||teams.length!==count)throw Error('Quantidade de duplas inválida.');
 if(c.confirmed&&(count!==c.count||teams.some((t,i)=>t.id!==c.teams[i].id)))throw Error('O sorteio e a identificação das duplas devem ser preservados.');
 const candidate={...c,name,count,teams:teams.map(t=>({id:t.id,a:String(t.a).trim(),b:String(t.b).trim()}))};
 if(candidate.teams.some(t=>!t.id||t.a.length>60||t.b.length>60)||new Set(candidate.teams.map(t=>t.id)).size!==count)throw Error('Confira os nomes das duplas.');
 if(c.confirmed)validateTeams(candidate);
 Object.assign(c,candidate);return c;
}
function deleteCategory(comp,id){const c=comp.categories.find(c=>c.id===id);if(!c)throw Error('Categoria não encontrada.');if(Object.values(resolve(c)).some(m=>m.status==='live'))throw Error('Encerre ou reabra os jogos em quadra antes de excluir a categoria.');comp.categories=comp.categories.filter(c=>c.id!==id);return comp;}
function randomIndex(max){if(typeof crypto==='undefined'||!crypto.getRandomValues)throw Error('Use um navegador atualizado para realizar o sorteio.');const a=new Uint32Array(1),limit=Math.floor(4294967296/max)*max;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%max;}
function draw(c){validateTeams(c);if(c.confirmed)throw Error('Zere a categoria para sortear novamente.');c.draw=c.teams.map(t=>t.id);for(let i=c.draw.length-1;i>0;i--){const j=randomIndex(i+1);[c.draw[i],c.draw[j]]=[c.draw[j],c.draw[i]];}c.drawAt=new Date().toISOString();c.routingVersion=2;c.crossingRoutes={};c.semifinalCrossed=false;c.results={};c.routes={};c.bracketMode='fixed';return c;}
const isFixed=c=>c.bracketMode==='fixed';
// Match numbers follow the supplied tables. Final and bronze share one block.
function blocks(c){const out=[];for(const g of [...models[c.count].games].sort((a,b)=>a.id-b.id)){const side=['B','F'].includes(g.side)?'D':g.side;let block=out[out.length-1];if(!block||block.side!==side){block={side,ids:[]};out.push(block);}block.ids.push(g.id);}return out;}
function previousGames(c,id){const sequence=blocks(c),index=sequence.findIndex(b=>b.ids.includes(id));return sequence.slice(0,index).flatMap(b=>b.ids);}
const modern=c=>isFixed(c)&&c.routingVersion===2;
function layoutGraph(c){const semis=models[c.count].games.filter(g=>g.side==='S');return models[c.count].games.map(g=>({...g,refs:isFixed(c)?(g.side==='S'&&c.semifinalCrossed?[g.refs[0],semis.find(x=>x.id!==g.id).refs[1]]:modern(c)&&g.side==='L'?(c.crossingRoutes?.[g.id]||g.refs):g.refs):g.side==='L'?(c.routes[g.id]||['R','R']):g.side==='S'?(c.routes[g.id]||[g.refs[0],'Q']):g.refs}));}
function graph(c){return layoutGraph(c).map(g=>modern(c)&&g.side==='L'&&!c.crossingRoutes?.[g.id]?{...g,refs:['R','R']}:g);}
function planCrossings(c){
 if(!c.confirmed||!modern(c))return;
 const defs=models[c.count].games,half=halves(c).teams;
 for(const group of Crossing.batches(defs)){
  if(group.every(g=>c.crossingRoutes[g.id]))continue;
  const resolved=resolve(c);if(Object.values(resolved).some(g=>g.conflict))return;
  const refs=group.flatMap(g=>g.refs),tickets=refs.map(ref=>{const g=resolved[+ref.slice(1)];return g?.done?{ref,team:ref[0]==='P'?g.loser:g.winner}:null;});
  if(tickets.some(t=>!t))continue;
  const history=Object.values(resolved).filter(g=>g.done&&['W','L'].includes(g.side)),chosen=Crossing.choose(group,tickets,history,half);
  group.forEach((g,i)=>c.crossingRoutes[g.id]=chosen.pairs[i]);
 }
 const proposal=semifinalProposal(c);if(proposal.available)c.semifinalCrossed=!c.semifinalCrossed;
}

function order(c){const defs=graph(c),pending=[...defs],done=new Set(),out=[];while(pending.length){let changed=false;for(let i=0;i<pending.length;){const g=pending[i];if(g.refs.every(r=>!['V','P'].includes(r[0])||done.has(+r.slice(1)))){out.push(g);done.add(g.id);pending.splice(i,1);changed=true;}else i++;}if(!changed)throw Error('Cruzamento inválido ou circular.');}return out;}
const validScore=r=>Array.isArray(r.score)&&r.score.length===2&&r.score.every(n=>Number.isInteger(n)&&n>=0&&n<=999)&&r.score[0]!==r.score[1];
function resolve(c){
 const out={};
 for(const g of order(c)){
  const teams=g.refs.map(ref=>{const n=+ref.slice(1);if(ref[0]==='T')return c.draw[n-1]||null;const previous=out[n];return previous?.done?(ref[0]==='V'?previous.winner:ref[0]==='P'?previous.loser:null):null;});
  const r=c.results[g.id],defined=Boolean(c.confirmed&&teams.every(Boolean)),playedTeams=r?.participants||teams;
  const conflict=Boolean(r&&(!defined||playedTeams.length!==2||pairKey(...playedTeams)!==pairKey(...teams)));
  const ready=defined&&!conflict,wo=r?.method==='wo',score=r?.score&&ready?teams.map(id=>r.score[playedTeams.indexOf(id)]):null;
  const done=Boolean(ready&&r?.status==='done'&&(wo?teams.includes(r.woWinner):validScore({score})));
  const winner=done?(wo?r.woWinner:teams[score[0]>score[1]?0:1]):null;
  out[g.id]={...g,teams,defined,ready,conflict,playedTeams:[...playedTeams],savedScore:r?.score||null,savedMethod:r?.method||null,savedStatus:r?.status||null,done,status:conflict?'conflict':done?'done':ready&&r?.status==='live'?'live':ready?'ready':'waiting',method:done?(wo?'wo':'score'):null,score:done&&!wo?score:null,court:r?.court||null,endedAt:r?.endedAt||null,winner,loser:done?teams.find(t=>t!==winner):null};
 }
 return out;
}
function halves(c){const gs=models[c.count].games.filter(g=>g.side==='W'),used=new Set(gs.flatMap(g=>g.refs.filter(r=>r[0]==='V').map(r=>+r.slice(1)))),roots=gs.filter(g=>!used.has(g.id)),byId=Object.fromEntries(gs.map(g=>[g.id,g])),out={};function visit(g,side){for(const r of g.refs)if(r[0]==='T')out[c.draw[+r.slice(1)-1]]=side;else visit(byId[+r.slice(1)],side);}roots.forEach((g,i)=>visit(g,i));return {teams:out,roots};}
const pairKey=(a,b)=>[a,b].sort().join('|');
function encountered(resolved,a,b,exclude){return Object.values(resolved).some(g=>g.id!==exclude&&g.done&&pairKey(...g.teams)===pairKey(a,b));}
function plan(c){if(modern(c)){planCrossings(c);return;}if(!c.confirmed||isFixed(c))return;const resolved=resolve(c),defs=models[c.count].games,losers=defs.filter(g=>g.side==='L').sort((a,b)=>a.id-b.id),rank={};for(const id of models[c.count].order){const g=defs.find(g=>g.id===id);if(g.side==='W')rank[id]=1+Math.max(0,...g.refs.filter(r=>r[0]==='V').map(r=>rank[+r.slice(1)]||0));}
// Keep each batch stable; its winner tickets enter the next crossing only after that batch finishes.
if(losers.some(g=>c.routes[g.id]&&!resolved[g.id].done))return;
const released=id=>defs.filter(g=>g.side==='W'&&rank[g.id]===rank[id]).every(g=>resolved[g.id].done);
const consumed=new Set(losers.flatMap(g=>c.routes[g.id]||[]));
let tickets=Object.values(resolved).filter(g=>g.done&&(g.side==='L'||g.side==='W'&&released(g.id))).map(g=>({ref:(g.side==='W'?'P':'V')+g.id,team:g.side==='W'?g.loser:g.winner})).filter(t=>!consumed.has(t.ref));
const allW=defs.filter(g=>g.side==='W').every(g=>resolved[g.id].done),slots=losers.filter(g=>!c.routes[g.id]),half=halves(c).teams;
if(slots.length&&(!allW&&tickets.length<=2))return;
for(const slot of slots){let best=null;for(let i=0;i<tickets.length;i++)for(let j=i+1;j<tickets.length;j++){const a=tickets[i],b=tickets[j];if(a.team===b.team||encountered(resolved,a.team,b.team))continue;const cost=half[a.team]===half[b.team]?1:0;if(!best||cost<best.cost)best={i,j,cost};}if(!best)break;const a=tickets[best.i],b=tickets[best.j];c.routes[slot.id]=[a.ref,b.ref];tickets=tickets.filter((t,i)=>i!==best.i&&i!==best.j);}
if(losers.every(g=>resolve(c)[g.id].done)&&allW){const now=resolve(c),usedTickets=new Set(losers.flatMap(g=>c.routes[g.id]||[]));const qualifiers=Object.values(now).filter(g=>g.done&&['W','L'].includes(g.side)).map(g=>({ref:(g.side==='W'?'P':'V')+g.id,team:g.side==='W'?g.loser:g.winner})).filter(t=>!usedTickets.has(t.ref));if(qualifiers.length!==2)throw Error('Não foi possível definir os semifinalistas.');const semis=defs.filter(g=>g.side==='S');for(const s of semis){if(c.routes[s.id])continue;const wref=s.refs[0],winner=now[+wref.slice(1)].winner;let i=qualifiers.findIndex(t=>half[t.team]!==half[winner]);if(i<0)i=0;const ticket=qualifiers.splice(i,1)[0];c.routes[s.id]=[wref,ticket.ref];}}
}
function semifinalProposal(c){
 const matches=resolve(c),semis=graph(c).filter(g=>g.side==='S'),locked=Object.values(matches).some(g=>['S','F','B'].includes(g.side)&&c.results[g.id]);
 if(!isFixed(c)||semis.length!==2)return {available:false,reason:'A análise está disponível nas tabelas fixas.'};
 if(locked)return {available:false,reason:'As semifinais ou decisões já possuem lançamentos. O cruzamento foi preservado.'};
 const teams=semis.map(g=>matches[g.id].teams);
 if(teams.flat().some(t=>!t))return {available:false,reason:'A análise será liberada quando os quatro semifinalistas estiverem definidos.'};
 const history=Object.values(matches).filter(g=>g.done&&['W','L'].includes(g.side));
 const seen=(a,b)=>history.some(g=>pairKey(...g.teams)===pairKey(a,b));
 const current=teams.reduce((n,p)=>n+Number(seen(...p)),0),proposed=[[teams[0][0],teams[1][1]],[teams[1][0],teams[0][1]]],alternative=proposed.reduce((n,p)=>n+Number(seen(...p)),0);
 return {available:alternative<current,current,alternative,proposed,ids:semis.map(g=>g.id),reason:alternative<current?'Este cruzamento reduz os reencontros nas semifinais.':current?'Não há uma combinação com menos reencontros entre os quatro classificados.':'As semifinais atuais já não repetem confrontos anteriores.'};
}
function crossSemifinals(c){const proposal=semifinalProposal(c);if(!proposal.available)throw Error(proposal.reason);c.semifinalCrossed=!c.semifinalCrossed;return c;}
function openingDraw(c){if(!c.confirmed)throw Error('Confirme e salve o sorteio antes de apresentá-lo.');const games=graph(c).filter(g=>g.side==='W'&&g.refs.some(r=>r[0]==='T')).map(g=>({id:g.id,refs:[...g.refs],teams:g.refs.map(r=>r[0]==='T'?c.draw[+r.slice(1)-1]:null)}));return {games,drawAt:c.drawAt};}
function descendants(c,id){const found=new Set();let changed=true;while(changed){changed=false;for(const g of graph(c))if(!found.has(g.id)&&g.refs.some(ref=>['V','P'].includes(ref[0])&&(+ref.slice(1)===id||found.has(+ref.slice(1))))){found.add(g.id);changed=true;}}return [...found].filter(n=>n!==id);}
function players(c,ids){return new Set(ids.flatMap(id=>{const t=c.teams.find(t=>t.id===id);return t?[normalize(t.a),normalize(t.b)]:[];}));}
function active(comp){return comp.categories.flatMap(c=>Object.values(resolve(c)).filter(m=>m.status==='live').map(m=>({c,m,players:players(c,m.teams)})));}
function availability(comp,c,id,court,now=Date.now()){const m=resolve(c)[id];if(!m?.ready)return 'Aguarde a definição das duas duplas.';if(!Number.isInteger(court)||court<1||court>comp.courts)return 'Escolha uma quadra.';const p=players(c,m.teams);for(const live of active(comp)){if(live.c.id===c.id&&live.m.id===id)continue;if(live.m.court===court)return 'A quadra '+court+' já está ocupada.';if([...p].some(x=>live.players.has(x)))return 'Um dos atletas já está em outra partida.';}return null;}
function prepareChange(comp,c,id,result){
 const before=resolve(c),m=before[id];
 if(!m||(!m.ready&&!(m.conflict&&(result.status==='ready'||result.review&&m.defined))))throw Error('Este jogo depende da definição dos adversários.');
 if(!['ready','live','done'].includes(result.status))throw Error('Situação inválida.');
 if(result.status==='done'){
  if(result.method==='wo'){if(!m.teams.includes(result.woWinner))throw Error('Escolha a dupla vencedora por W.O.');}
  else if(!validScore(result))throw Error('Preencha dois placares inteiros diferentes, de 0 a 999.');
 }
 if(result.status!=='ready'&&(!Number.isInteger(result.court)||result.court<1||result.court>comp.courts))throw Error('Selecione a quadra.');
 if(result.status==='live'){const error=availability(comp,c,id,result.court);if(error)throw Error(error);}
 const candidate=JSON.parse(JSON.stringify(c));
 // Freeze actual participants before changing an old source result. No score is moved to a different pair.
 for(const [key,r] of Object.entries(candidate.results))if(!r.participants&&before[key]?.defined)r.participants=[...before[key].teams];
 if(result.status==='ready')delete candidate.results[id];
 else candidate.results[id]={status:result.status,court:result.court,participants:[...m.teams],...(result.status==='done'?{method:result.method==='wo'?'wo':'score',...(result.method==='wo'?{woWinner:result.woWinner}:{score:[...result.score]}),endedAt:new Date().toISOString()}:{startedAt:new Date().toISOString()})};
 let after=resolve(candidate);
 const liveConflicts=Object.values(after).filter(g=>g.conflict&&candidate.results[g.id]?.status==='live');
 if(liveConflicts.length)throw Error('A correção altera os adversários de '+liveConflicts.map(g=>'J'+g.id).join(', ')+', em quadra. Encerre ou reabra essas partidas antes.');
 if(!Object.values(after).some(g=>g.conflict))plan(candidate);
 after=resolve(candidate);
 const conflicts=Object.values(after).filter(g=>g.conflict).map(g=>g.id),newConflicts=conflicts.filter(n=>!before[n]?.conflict);
 const preserved=Object.values(before).filter(g=>g.id!==id&&g.done&&after[g.id]?.done&&g.winner===after[g.id].winner).length;
 return {candidate,conflicts,newConflicts,preserved};
}
function previewChange(comp,c,id,result){const {candidate,...impact}=prepareChange(comp,c,id,result);return impact;}
function mutate(comp,c,id,result){const change=prepareChange(comp,c,id,result);Object.assign(c,change.candidate);return c;}
function assign(comp,c,id,court){const m=resolve(c)[id];if(m?.status!=='ready')throw Error('Escolha um jogo pronto.');if(!Number.isInteger(court)||court<1||court>comp.courts)throw Error('Quadra inválida.');c.results[id]={status:'queued',court,participants:[...m.teams]};}
function competitionState(comp){const categories=comp.categories||[];if(!categories.length||!categories.some(c=>c.confirmed))return 'preparation';return categories.every(c=>Object.values(resolve(c)).every(g=>g.done))?'finished':'active';}
function redrawCategory(c,confirmation){
 if(String(confirmation).trim()!=='SORTEAR')throw Error('Digite SORTEAR para confirmar.');
 if(!c.confirmed)throw Error('Esta categoria ainda não possui sorteio confirmado.');
 if(Object.values(c.results).some(r=>r.status==='live'))throw Error('Encerre ou reabra os jogos em quadra antes de sortear novamente.');
 validateTeams(c);
 // Prepare the new draw before replacing the current one, so failures keep its history intact.
 const candidate={...c};resetCategory(candidate);draw(candidate);candidate.confirmed=true;plan(candidate);
 Object.assign(c,candidate);return c;
}
function resetCategory(c){c.routingVersion=2;c.crossingRoutes={};c.semifinalCrossed=false;c.bracketMode='fixed';c.results={};c.routes={};c.draw=[];c.confirmed=false;c.drawAt=null;}
function validate(x){
 if(!x||x.version!==3)throw Error('Selecione um backup no formato V3.');
 if(typeof x.created!=='boolean'||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||!Number.isInteger(x.courts)||x.courts<1||x.courts>3||!Array.isArray(x.categories)||x.categories.length>100)throw Error('Backup inválido.');
 const out=fresh();Object.assign(out,{created:x.created,name:x.name,courts:x.courts,updated:typeof x.updated==='string'&&Number.isFinite(Date.parse(x.updated))?x.updated:null});
 if(x.logoPath!==undefined){if(typeof x.logoPath!=='string'||(x.logoPath&&!/^[a-zA-Z0-9_-]{1,80}\/[a-f0-9-]{36}\.(webp|png|jpg)$/.test(x.logoPath)))throw Error('Logo inválida.');out.logoPath=x.logoPath;}
 if(!out.created&&x.categories.length)throw Error('Competição inválida.');const categoryIds=new Set();
 for(const c of x.categories){
  if(!c||typeof c.id!=='string'||!c.id||categoryIds.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||!Number.isInteger(c.count)||!models[c.count]||!Array.isArray(c.teams)||c.teams.length!==c.count||typeof c.confirmed!=='boolean'||!Array.isArray(c.draw)||!c.results||typeof c.results!=='object'||Array.isArray(c.results)||!c.routes||typeof c.routes!=='object'||Array.isArray(c.routes))throw Error('Categoria inválida.');
  categoryIds.add(c.id);const clean=category(c.name,c.count);clean.id=c.id;
  if(c.bracketMode!==undefined&&!['fixed','legacy'].includes(c.bracketMode))throw Error('Formato de chaveamento inválido.');
  clean.routingVersion=c.routingVersion===undefined?1:c.routingVersion;if(![1,2].includes(clean.routingVersion))throw Error('Versão do cruzamento inválida.');clean.crossingRoutes={};
  clean.bracketMode=c.bracketMode==='fixed'||(!Object.keys(c.results).length&&!Object.keys(c.routes).length)?'fixed':'legacy';
  if(isFixed(clean)&&Object.keys(c.routes).length)throw Error('A tabela fixa não aceita cruzamentos dinâmicos.');
  if(c.semifinalCrossed!==undefined&&typeof c.semifinalCrossed!=='boolean')throw Error('Cruzamento de semifinal inválido.');if(c.semifinalCrossed&&!isFixed(clean))throw Error('Cruzamento disponível apenas na tabela fixa.');if(c.semifinalCrossed!==undefined)clean.semifinalCrossed=c.semifinalCrossed;
  if(c.crossingRoutes!==undefined&&(!c.crossingRoutes||typeof c.crossingRoutes!=='object'||Array.isArray(c.crossingRoutes)))throw Error('Cruzamentos inválidos.');
  const supplied=c.crossingRoutes||{};
  if(!modern(clean)&&Object.keys(supplied).length)throw Error('Cruzamento incompatível com a tabela.');
  const allowed=new Set();for(const group of Crossing.batches(models[c.count].games)){
   const present=group.filter(g=>supplied[g.id]);if(!present.length)continue;
   if(present.length!==group.length)throw Error('Etapa de cruzamento incompleta.');
   const expected=group.flatMap(g=>g.refs).sort(),actual=[];
   for(const g of group){const refs=supplied[g.id];if(!Array.isArray(refs)||refs.length!==2||!refs.every(r=>typeof r==='string')||refs.map(r=>r[0]).sort().join('')!==g.refs.map(r=>r[0]).sort().join(''))throw Error('Cruzamento inválido.');actual.push(...refs);allowed.add(String(g.id));clean.crossingRoutes[g.id]=[...refs];}
   if(JSON.stringify(actual.sort())!==JSON.stringify(expected))throw Error('Classificado duplicado ou fora da etapa.');
  }
  if(Object.keys(supplied).some(id=>!allowed.has(id)))throw Error('Jogo de cruzamento desconhecido.');
  clean.teams=[];const ids=new Set();
  for(const t of c.teams){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.a!=='string'||typeof t.b!=='string'||t.a.length>60||t.b.length>60)throw Error('Dupla inválida.');ids.add(t.id);clean.teams.push({id:t.id,a:t.a,b:t.b});}
  if(c.draw.length){if(c.draw.length!==c.count||new Set(c.draw).size!==c.count||!c.draw.every(id=>ids.has(id)))throw Error('Sorteio inválido.');clean.draw=[...c.draw];validateTeams(clean);}else if(c.confirmed)throw Error('Categoria sem sorteio.');
  clean.confirmed=c.confirmed;clean.drawAt=typeof c.drawAt==='string'?c.drawAt:null;
  const defs=models[c.count].games,used=new Set();
  for(const [key,refs]of Object.entries(c.routes)){
   const g=defs.find(g=>String(g.id)===key);
   if(!g||!['L','S'].includes(g.side)||!Array.isArray(refs)||refs.length!==2||!refs.every(ref=>typeof ref==='string'&&/^[VP]\d+$/.test(ref)&&defs.some(d=>d.id===+ref.slice(1))))throw Error('Cruzamento inválido.');
   if(g.side==='S'&&refs[0]!==g.refs[0])throw Error('Semifinal inválida.');
   for(const ref of refs.slice(g.side==='S'?1:0)){const source=defs.find(d=>d.id===+ref.slice(1));if(!(ref[0]==='P'&&source.side==='W'||ref[0]==='V'&&source.side==='L')||used.has(ref))throw Error('Classificado duplicado ou inválido.');used.add(ref);}
   clean.routes[key]=[...refs];
  }
  for(const key of Object.keys(c.results))if(!defs.some(g=>String(g.id)===key))throw Error('Jogo desconhecido.');
  for(const g of order(clean)){
   const r=c.results[g.id];if(!r)continue;if(modern(clean)&&g.side==='L'&&!clean.crossingRoutes[g.id])throw Error('Resultado sem cruzamento definido.');
   if(!['queued','live','done'].includes(r.status)||!Number.isInteger(r.court)||r.court<1||r.court>out.courts)throw Error('Resultado inconsistente.');
   const expected=resolve(clean)[g.id],participants=r.participants||expected.teams;
   if(!Array.isArray(participants)||participants.length!==2||participants[0]===participants[1]||!participants.every(id=>ids.has(id)))throw Error('Participantes inválidos no resultado.');
   const copy={status:r.status,court:r.court,participants:[...participants]};
   if(r.status==='done'){
    if(r.method==='wo'){if(!participants.includes(r.woWinner))throw Error('W.O. inválido.');Object.assign(copy,{method:'wo',woWinner:r.woWinner});}
    else {if(!validScore(r))throw Error('Placar inválido.');Object.assign(copy,{method:'score',score:[...r.score]});}
    copy.endedAt=typeof r.endedAt==='string'&&Number.isFinite(Date.parse(r.endedAt))?r.endedAt:null;
   }else if(r.status==='live')copy.startedAt=typeof r.startedAt==='string'?r.startedAt:null;
   clean.results[g.id]=copy;
  }
  if(Object.values(resolve(clean)).some(g=>g.conflict&&clean.results[g.id]?.status==='live'))throw Error('Há partida em quadra com adversários pendentes de revisão.');
  out.categories.push(clean);
 }
 const lives=active(out);for(let i=0;i<lives.length;i++)for(let j=i+1;j<lives.length;j++)if(lives[i].m.court===lives[j].m.court||[...lives[i].players].some(p=>lives[j].players.has(p)))throw Error('Há jogos simultâneos incompatíveis.');
 return out;
}
const api={modern,layoutGraph,planCrossings,semifinalProposal,crossSemifinals,openingDraw,models,uid,normalize,fresh,category,teamName,validateTeams,saveTeams,deleteCategory,draw,isFixed,blocks,previousGames,graph,order,resolve,plan,descendants,players,active,availability,previewChange,mutate,assign,competitionState,redrawCategory,resetCategory,validate,encountered,pairKey};if(typeof module!=='undefined')module.exports=api;else root.Arena=api;
})(typeof window!=='undefined'?window:globalThis);
