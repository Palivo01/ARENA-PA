(function(root){
'use strict';
// Positions depend on the bracket's feeder tree, never on match-number order.
function create(games,options={}){
 const width=options.width||236,pitch=options.pitch||228,cardHeight=options.cardHeight||176,gap=options.gap||74,step=width+gap,top=options.top??96,middleGap=options.middleGap??280;
 const byId=Object.fromEntries(games.map(g=>[g.id,g])),semis=games.filter(g=>g.side==='S').sort((a,b)=>a.id-b.id),nodes={},labels=[],entrySlots=[];
 const trees={W:[],L:[]},maxDepth={W:0,L:0};
 for(const side of ['W','L']){
  for(let half=0;half<semis.length;half++){
   const source=semis[half].refs.find(ref=>ref[0]==='V'&&byId[+ref.slice(1)]?.side===side);
   if(!source)throw Error('A semifinal precisa de um classificado de cada chave.');
   const seen=new Set();
   function visit(id,depth){if(seen.has(id))throw Error('Partida repetida na mesma metade.');seen.add(id);const game=byId[id];if(!game||game.side!==side)throw Error('Origem de partida inválida.');maxDepth[side]=Math.max(maxDepth[side],depth);const children=game.refs.filter(ref=>ref[0]==='V'&&byId[+ref.slice(1)]?.side===side).map(ref=>visit(+ref.slice(1),depth+1));return {game,depth,children,weight:Math.max(1,children.reduce((sum,child)=>sum+child.weight,0))};}
   trees[side].push(visit(+source.slice(1),0));
  }
 }
 const rows=Math.max(2,...Object.values(trees).flat().map(t=>t.weight)),halfHeight=rows*pitch,centerX=(maxDepth.W+1)*step,rightInnerX=centerX+2*step,height=top*2+halfHeight*2+middleGap,totalWidth=rightInnerX+maxDepth.L*step+width;
 function place(tree,side,half,start,end){
  const {game,depth,children}=tree,column=maxDepth[side]-depth,x=side==='W'?column*step:rightInnerX+depth*step;
  if(nodes[game.id])throw Error('Partida compartilhada entre as metades.');
  nodes[game.id]={id:game.id,side,half,column,x,y:(start+end)/2-cardHeight/2};
  if(side==='W')for(const ref of game.refs)if(ref[0]==='T')entrySlots.push({slot:+ref.slice(1),game:game.id,half,skipped:column});
  let cursor=start;for(const child of children){const next=cursor+(end-start)*child.weight/tree.weight;place(child,side,half,cursor,next);cursor=next;}
  if(children.length)nodes[game.id].y=children.reduce((sum,child)=>sum+nodes[child.game.id].y,0)/children.length;
 }
 for(let half=0;half<2;half++){
  const start=top+half*(halfHeight+middleGap),end=start+halfHeight;
  for(const side of ['W','L'])place(trees[side][half],side,half,start,end);
  nodes[semis[half].id]={id:semis[half].id,side:'S',half,x:centerX+step/2,y:(nodes[trees.W[half].game.id].y+nodes[trees.L[half].game.id].y)/2};
  labels.push({x:0,y:start-56,text:'Vencedores · Chave '+(half?'B':'A'),side:'W',labelWidth:Math.max(width,centerX-gap)});
  labels.push({x:rightInnerX,y:start-56,text:'Repescagem · Chave '+(half?'B':'A'),side:'L',labelWidth:Math.max(width,(maxDepth.L+1)*step-gap)});
 }
 const middleY=top+halfHeight+middleGap/2-cardHeight/2;
 for(const game of games.filter(g=>['F','B'].includes(g.side)))nodes[game.id]={id:game.id,side:game.side,half:null,x:centerX+(game.side==='B'?step:0),y:middleY};
 if(Object.keys(nodes).length!==games.length)throw Error('Há partida sem caminho para as semifinais.');
 return {nodes,labels,width:totalWidth,height,pitch,cardHeight,centerX,step,halfHeight,middleGap,top,entrySlots};
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.BracketLayout=api;
})(typeof window!=='undefined'?window:globalThis);
