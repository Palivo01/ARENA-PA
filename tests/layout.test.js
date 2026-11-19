'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../layout.js'),models=require('../templates.js');
for(const [count,model]of Object.entries(models))test(count+' duplas: duas metades, avanço linear, alinhamento e ausência de sobreposição',()=>{
 const layout=L.create(model.games),{nodes}=layout;
 assert.equal(Object.keys(nodes).length,model.games.length);
 for(const game of model.games){
  const node=nodes[game.id];assert.ok(Number.isFinite(node.x)&&Number.isFinite(node.y));
  assert.ok(node.x>=0&&node.x+236<=layout.width);assert.ok(node.y>=0&&node.y+layout.cardHeight<=layout.height);
  const parents=game.refs.filter(ref=>ref[0]==='V').map(ref=>nodes[+ref.slice(1)]).filter(p=>p.side===game.side);
  for(const parent of parents){assert.equal(parent.half,node.half,'vencedores/repescagem não podem atravessar de metade');assert.ok(game.side==='W'?parent.x<node.x:parent.x>node.x,'sempre avança em direção ao centro');}
  if(parents.length)assert.ok(Math.abs(node.y-parents.reduce((sum,p)=>sum+p.y,0)/parents.length)<.001,'partida centralizada entre os jogos que a alimentam');
 }
 const all=Object.values(nodes);
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
  const a=all[i],b=all[j],overlapX=a.x<b.x+236&&b.x<a.x+236,overlapY=a.y<b.y+176+20&&b.y<a.y+176+20;
  assert.ok(!(overlapX&&overlapY),`J${a.id}/J${b.id} sobrepostos`);
 }
 const semis=model.games.filter(g=>g.side==='S');assert.equal(nodes[semis[0].id].half,0);assert.equal(nodes[semis[1].id].half,1);
 assert.equal(layout.entrySlots.length,+count);assert.equal(new Set(layout.entrySlots.map(t=>t.slot)).size,+count);
 assert.deepEqual(layout.entrySlots.filter(t=>t.skipped>0).map(t=>t.slot).sort((a,b)=>a-b),[...model.byeSlots].sort((a,b)=>a-b));
});
test('18 duplas: caminhos superiores e inferiores seguem a planilha',()=>{
 const {nodes}=L.create(models[18].games);
 for(const id of [1,3,4,5,9,13,14,25])assert.equal(nodes[id].half,0);
 for(const id of [2,6,7,8,10,15,16,26])assert.equal(nodes[id].half,1);
 assert.equal(nodes[13].x,nodes[14].x);assert.equal(nodes[15].x,nodes[16].x);
 assert.ok(nodes[13].y<nodes[25].y&&nodes[25].y<nodes[14].y);
 assert.equal(nodes[29].half,0);assert.equal(nodes[30].half,1);
 const ref29=models[18].games.find(g=>g.id===29).refs;assert.ok(ref29.includes('P26'));
});
test('18 duplas: 4 entram na preliminar e 14 são biônicos',()=>{const {entrySlots}=L.create(models[18].games);assert.equal(entrySlots.filter(t=>t.skipped===0).length,4);assert.equal(entrySlots.filter(t=>t.skipped>0).length,14);});

test('30 duplas: 58 jogos e dois biônicos distribuídos entre as metades',()=>{const model=models[30],layout=L.create(model.games);assert.equal(model.games.length,58);assert.equal(model.games.filter(g=>g.side==='W').length,28);assert.equal(model.games.filter(g=>g.side==='L').length,26);const byes=layout.entrySlots.filter(t=>t.skipped>0);assert.equal(byes.length,2);assert.deepEqual(byes.map(t=>t.slot).sort((a,b)=>a-b),[1,16]);const opening=model.games.filter(g=>g.side==='W'&&g.refs.every(r=>r[0]==='T'));assert.equal(opening.length,14);assert.equal(opening.filter(g=>layout.nodes[g.id].half===0).length,7);assert.equal(opening.filter(g=>layout.nodes[g.id].half===1).length,7);});
