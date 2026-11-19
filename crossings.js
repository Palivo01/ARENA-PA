(function(root){
'use strict';
// Same match IDs, winner tree and entry rounds. Only tickets within a loser
// round are paired, preserving the number of P and V tickets in each match.
function batches(games){const levels={},groups=new Map();for(const g of games.filter(g=>g.side==='L')){const parents=g.refs.filter(r=>r[0]==='V'&&games.find(p=>p.id===+r.slice(1))?.side==='L');const level=1+Math.max(0,...parents.map(r=>levels[+r.slice(1)]));levels[g.id]=level;if(!groups.has(level))groups.set(level,[]);groups.get(level).push(g);}return [...groups.values()];}
function choose(slots,tickets,history,half){
 if(tickets.length!==slots.length*2||tickets.length>20||new Set(tickets.map(t=>t.team)).size!==tickets.length)throw Error('Classificados do cruzamento inválidos.');
 const past=new Map();for(const g of history){const key=[...g.teams].sort().join('|');past.set(key,(past.get(key)||0)+1);}
 const pairCost=(a,b,index)=>{const meetings=past.get([a.team,b.team].sort().join('|'))||0,original=slots[index].refs;
  return [Number(meetings>0),meetings,Number(half[a.team]===half[b.team]),Number(!original.includes(a.ref))+Number(!original.includes(b.ref))];};
 const add=(a,b)=>a.map((n,i)=>n+b[i]),compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
 const memo=new Map(),full=(1<<tickets.length)-1;
 function solve(mask,index){if(mask===full)return {cost:[0,0,0,0],pairs:[]};if(memo.has(mask))return memo.get(mask);let best=null;const types=slots[index].refs.map(r=>r[0]).sort().join('');
  for(let i=0;i<tickets.length;i++){if(mask&(1<<i))continue;for(let j=i+1;j<tickets.length;j++){if(mask&(1<<j))continue;const a=tickets[i],b=tickets[j];if([a.ref[0],b.ref[0]].sort().join('')!==types)continue;const next=solve(mask|(1<<i)|(1<<j),index+1);if(!next)continue;const cost=add(pairCost(a,b,index),next.cost);if(!best||compare(cost,best.cost)<0)best={cost,pairs:[[a.ref,b.ref],...next.pairs]};}
   // In homogeneous rounds the first unused ticket must be paired now. This
   // removes equivalent permutations without changing the minimum.
   if(slots.slice(index).every(s=>s.refs.every(r=>r[0]===types[0]))&&types[0]===types[1])break;
  }memo.set(mask,best);return best;
 }
 const best=solve(0,0);if(!best)throw Error('Não foi possível cruzar os classificados.');
 return {rematches:best.cost[0],pairs:best.pairs.map((pair,i)=>slots[i].refs[0][0]===pair[0][0]?pair:[pair[1],pair[0]])};
}
const api={batches,choose};if(typeof module!=='undefined')module.exports=api;else root.BracketCrossings=api;
})(typeof window!=='undefined'?window:globalThis);
