'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../engine.js');
function fixture(n=18){const comp=A.fresh();comp.created=true;comp.courts=3;const c=A.category('Categoria',n);c.routingVersion=1;c.teams.forEach((t,i)=>{t.a='Atleta '+(2*i+1);t.b='Atleta '+(2*i+2);});c.draw=c.teams.map(t=>t.id);c.confirmed=true;comp.categories=[c];return {comp,c};}
function finish(comp,c,id,winner=0){A.mutate(comp,c,id,{status:'done',court:1,score:winner?[10,18]:[18,10]});}
const ready=c=>Object.values(A.resolve(c)).filter(g=>g.status==='ready').map(g=>g.id);
test('18 duplas: cruzamentos fixos e liberdade para qualquer partida definida',()=>{
 const {comp,c}=fixture();
 for(let i=1;i<=8;i++)finish(comp,c,i);
 assert.deepEqual(ready(c),[9,10,14,15,18,19]);
 finish(comp,c,14);assert.ok(A.resolve(c)[14].done);assert.ok(!A.resolve(c)[9].done);
 finish(comp,c,9);assert.ok(A.resolve(c)[11].ready);assert.ok(!A.resolve(c)[10].done);
 assert.deepEqual(A.graph(c).find(g=>g.id===11).refs,['P2','P9']);
 assert.deepEqual(A.graph(c).find(g=>g.id===12).refs,['P10','P1']);assert.deepEqual(c.routes,{});
});
test('28 duplas: blocos da referência',()=>{const {c}=fixture(28);assert.deepEqual(A.blocks(c).map(b=>[b.ids[0],b.ids.at(-1)]),[[1,20],[21,32],[33,36],[37,40],[41,42],[43,50],[51,52],[53,54]]);});
test('Todos os tamanhos: participantes, duas derrotas, W.O., finais e backups',()=>{
 for(const n of Object.keys(A.models).map(Number))for(let seed=0;seed<6;seed++){
  let {comp,c}=fixture(n);const losses=new Map(),seen=new Set();
  for(const definition of A.models[n].games){const g=A.resolve(c)[definition.id];assert.ok(g.ready,`${n} J${g.id} bloqueado`);assert.notEqual(...g.teams);for(const id of g.teams)if(g.side==='W')assert.equal(losses.get(id)||0,0);else if(g.side==='L')assert.equal(losses.get(id)||0,1);
   if(seed===0&&g.id%3===0)A.mutate(comp,c,g.id,{status:'done',court:1,method:'wo',woWinner:g.teams[0]});else finish(comp,c,g.id,(g.id+seed)%2);
   const done=A.resolve(c)[g.id];losses.set(done.loser,(losses.get(done.loser)||0)+1);seen.add(g.id);
   comp=A.validate(JSON.parse(JSON.stringify(comp)));c=comp.categories[0];
  }
  assert.equal(seen.size,2*n-2);assert.ok(Object.values(A.resolve(c)).every(g=>g.done));
 }
});
test('Salvar cadastro incompleto, recarregar e retomar sem sorteio',()=>{let {comp,c}=fixture();A.resetCategory(c);const t=c.teams.map(t=>({...t,a:'',b:''}));t[0].a='Paulo';A.saveTeams(c,'Inscrições',18,t);comp=A.validate(JSON.parse(JSON.stringify(comp)));c=comp.categories[0];assert.equal(c.teams[0].a,'Paulo');assert.equal(c.teams[0].b,'');assert.equal(c.confirmed,false);assert.deepEqual(c.draw,[]);assert.throws(()=>A.draw(c),/Preencha/);});
test('Editar nomes mantém IDs, sorteio, rotas e resultados, inclusive após a final',()=>{const {comp,c}=fixture(8);for(const g of A.models[8].games)finish(comp,c,g.id);const before=JSON.stringify([c.draw,c.results,c.routes]);const ids=c.teams.map(t=>t.id);const teams=c.teams.map(t=>({...t}));teams[0].a='Paulo Ivan';A.saveTeams(c,c.name,c.count,teams);assert.equal(JSON.stringify([c.draw,c.results,c.routes]),before);assert.deepEqual(c.teams.map(t=>t.id),ids);assert.equal(A.validate(comp).categories[0].teams[0].a,'Paulo Ivan');teams[0].a=teams[1].a;assert.throws(()=>A.saveTeams(c,c.name,c.count,teams),/repetido/);});
test('Excluir somente a categoria escolhida e impedir exclusão com jogo ao vivo',()=>{const {comp,c}=fixture();const other=A.category('Outra',8);comp.categories.push(other);A.mutate(comp,c,1,{status:'live',court:1});assert.throws(()=>A.deleteCategory(comp,c.id),/quadra/);A.mutate(comp,c,1,{status:'ready',court:1});A.deleteCategory(comp,c.id);assert.deepEqual(comp.categories.map(c=>c.id),[other.id]);assert.equal(A.validate(comp).categories.length,1);});
test('Backup antigo sem jogos migra para tabela fixa; categoria em andamento mantém formato',()=>{const {comp,c}=fixture();delete c.bracketMode;assert.equal(A.validate(comp).categories[0].bracketMode,'fixed');c.bracketMode='legacy';finish(comp,c,1);const original=JSON.stringify(c.results);delete c.bracketMode;const imported=A.validate(comp);assert.equal(imported.categories[0].bracketMode,'legacy');assert.equal(JSON.stringify(imported.categories[0].results),original);});
test('Reabertura preserva jogos independentes e mantém backup válido',()=>{const {comp,c}=fixture();for(let i=1;i<=16;i++)finish(comp,c,i);const saved=JSON.stringify(c.results[14]);assert.ok(!A.descendants(c,11).includes(14));A.mutate(comp,c,11,{status:'ready',court:1});assert.equal(JSON.stringify(c.results[14]),saved);assert.ok(A.resolve(c)[14].done);assert.ok(!c.results[11]);assert.doesNotThrow(()=>A.validate(comp));});
