'use strict';
// Build-time derivation only. Existing tables are never regenerated.
// Start with the established 32-pair tree. Remove evenly distributed entry
// positions, then bypass matches with only one real entrant. A skipped match
// produces no loser, so its loser ticket is removed from the repechage too.
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../templates.js'),models=require(file),Layout=require('../layout.js');
const counts=[25,26,27,29,31],emptyOrder=[2,18,10,26,6,22,14];
function derive(n){
 const absent=new Set(emptyOrder.slice(0,32-n)),tickets=new Map(),games=[];let slot=0;
 for(let i=1;i<=32;i++)tickets.set('T'+i,absent.has(i)?null:'T'+(++slot));
 for(const original of models[32].games){
  const refs=original.refs.map(ref=>{if(!tickets.has(ref))throw Error('Origem fora de ordem: '+ref);return tickets.get(ref);}).filter(Boolean);
  if(refs.length===2){games.push({...original,refs});tickets.set('V'+original.id,'V'+original.id);tickets.set('P'+original.id,'P'+original.id);}
  else{if(!['W','L'].includes(original.side))throw Error('Decisão incompleta');tickets.set('V'+original.id,refs[0]||null);tickets.set('P'+original.id,null);}
 }
 const ids=new Map(games.map((g,i)=>[g.id,i+1]));
 const compact=games.map(g=>({id:ids.get(g.id),side:g.side,refs:g.refs.map(ref=>ref[0]==='T'?ref:ref[0]+ids.get(+ref.slice(1)))}));
 const layout=Layout.create(compact),byeSlots=layout.entrySlots.filter(t=>t.skipped>0).map(t=>t.slot).sort((a,b)=>a-b);
 if(compact.length!==2*n-2||byeSlots.length!==32-n)throw Error('Quantidade inconsistente');
 return {n,games:compact,label:n+' duplas',order:compact.map(g=>g.id),byeSlots};
}
if(require.main===module){for(const n of counts)models[n]=derive(n);const sorted=Object.fromEntries(Object.entries(models).sort((a,b)=>+a[0]-b[0]));fs.writeFileSync(file,'const BRACKET_MODELS = '+JSON.stringify(sorted)+';\nif(typeof module!=="undefined")module.exports=BRACKET_MODELS;\n');console.log('Tabelas adicionadas: '+counts.join(', '));}
module.exports={derive,counts};
