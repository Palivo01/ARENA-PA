(function(root){
'use strict';
const A=typeof module!=='undefined'?require('./engine.js'):root.Arena;
const C=typeof module!=='undefined'?require('./crossings.js'):root.BracketCrossings;
// Presentation only: never plan, resolve again, assign or mutate a category.
function compact(refs){
 const items=[...new Set(refs)].sort((a,b)=>a[0].localeCompare(b[0])||+a.slice(1)-+b.slice(1)),out=[];
 for(let i=0;i<items.length;i++){
  let j=i;while(j+1<items.length&&items[j+1][0]===items[i][0]&&+items[j+1].slice(1)===+items[j].slice(1)+1)j++;
  if(j-i>=2){out.push(items[i]+' a '+items[j]);i=j;}else out.push(items[i]);
 }
 return out.join(' ou ');
}
function row(c,m,index){
 const ref=m.refs[index];
 if(ref!=='R'||m.side!=='L'||!A.modern(c))return {pending:false,refs:[ref],code:ref,text:ref==='R'?'Aguardando cruzamento':ref==='Q'?'Classificado da repescagem':ref[0]==='T'?'Biônico':(ref[0]==='P'?'Perdedor':'Vencedor')+' do J'+ref.slice(1),hint:''};
 const group=C.batches(A.models[c.count].games).find(gs=>gs.some(g=>g.id===m.id)),definition=group?.find(g=>g.id===m.id);
 if(!definition)return {pending:true,refs:[],code:'',text:'Aguardando cruzamento',hint:''};
 const type=definition.refs[index][0],refs=[...new Set(group.flatMap(g=>g.refs).filter(r=>r[0]===type))].sort((a,b)=>+a.slice(1)-+b.slice(1));
 return {pending:true,refs,code:compact(refs),text:compact(refs),hint:(type==='P'?'Perdedor':'Vencedor')+' de um destes jogos · A definir'};
}
const api={row,compact};if(typeof module!=='undefined')module.exports=api;else root.MatchOrigins=api;
})(typeof window!=='undefined'?window:globalThis);
