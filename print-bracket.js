(function(root){
'use strict';
const A=typeof module!=='undefined'?require('./engine.js'):root.Arena,L=typeof module!=='undefined'?require('./layout.js'):root.BracketLayout,O=typeof module!=='undefined'?require('./match-origins.js'):root.MatchOrigins;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
function create(comp,c){
 if(!c?.confirmed)throw Error('Confirme o sorteio para imprimir a tabela.');
 const graph=A.isFixed(c)?A.layoutGraph(c):A.models[c.count].games,layout=L.create(graph,{width:210,pitch:92,cardHeight:76,gap:40,top:100,middleGap:96}),resolved=A.resolve(c),byId=Object.fromEntries(graph.map(g=>[g.id,g])),offset=22;
 const text=(x,y,value,size=11,weight=400,color='#173247',width)=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}"${width&&String(value).length*size*.55>width?` textLength="${width}" lengthAdjust="spacingAndGlyphs"`:''}>${esc(value)}</text>`;
 const source=ref=>ref==='R'?'Cruzamento a definir':ref==='Q'?'Classificado da repescagem':ref[0]==='T'?'Dupla a definir':(ref[0]==='V'?'Vencedor':'Perdedor')+' do J'+ref.slice(1);
 let paths='';
 for(const game of Object.values(resolved)){const target=layout.nodes[game.id];game.refs.forEach((ref,i)=>{if(!['V','P'].includes(ref[0])||ref[0]==='P'&&game.side!=='B')return;const from=layout.nodes[+ref.slice(1)];if(!from)return;const reverse=from.x>target.x,x1=from.x+(reverse?0:210)+offset,x2=target.x+(reverse?210:0)+offset,y1=from.y+38,y2=target.y+28+i*29,mid=(x1+x2)/2;paths+=`<path data-source="${+ref.slice(1)}" data-target="${game.id}" d="M${x1} ${y1} H${mid} V${y2} H${x2}" fill="none" stroke="${game.side==='L'?'#8d771c':'#34758e'}" stroke-width="1.1"${ref[0]==='P'?' stroke-dasharray="3 3"':''}/>`;});}
 const nodes=graph.map(game=>{const pos=layout.nodes[game.id],m=resolved[game.id],x=pos.x+offset,y=pos.y,side={W:'VENCEDORES',L:'REPESCAGEM',S:'SEMIFINAL',F:'FINAL',B:'3º / 4º LUGAR'}[game.side],fill=game.side==='L'?'#fff9df':['S','F','B'].includes(game.side)?'#f0f5ed':'#eef8fc';
 const rows=m.teams.map((id,i)=>{const t=c.teams.find(t=>t.id===id),base=y+27+i*29,win=m.done&&m.winner===id;const origin=O.row(c,m,i);const name=t?text(x+7,base,t.a,10,win?700:400,'#102b3d',169)+text(x+7,base+10,t.b,10,win?700:400,'#102b3d',169):origin.pending?text(x+7,base+2,origin.code,9,700,'#526572',169)+text(x+7,base+13,'Cruzamento a definir · '+(origin.refs[0]?.[0]==='P'?'Perdedores':'Vencedores'),7,400,'#526572',169):text(x+7,base+5,source(m.refs[i]),9,400,'#526572',169);const score=m.done?(m.method==='wo'?(win?'W.O.':'·'):m.score[i]):'·';return name+(t&&/^[VP]\d+$/.test(m.refs[i])?text(x+7,base+18,m.refs[i],7,400,'#526572',169):'')+text(x+184,base+6,score,11,700,win?'#08716c':'#364c60',22);}).join('');
 return `<g data-game="${game.id}"><rect x="${x}" y="${y}" width="210" height="76" rx="5" fill="${fill}" stroke="#527184" stroke-width=".9"/><path d="M${x} ${y+16} H${x+210} M${x} ${y+46} H${x+210}" stroke="#c2d1d9" stroke-width=".6"/>${text(x+7,y+11,'J'+String(game.id).padStart(2,'0')+' · '+side,8,700)}${rows}</g>`;
 }).join('');
 const labels=layout.labels.map(label=>text(label.x+offset,label.y+14,label.text,12,700,label.side==='L'?'#8d771c':'#075d79')).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width+offset*2} ${layout.height+10}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Chaveamento completo de ${esc(c.name)}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial,Helvetica,sans-serif">${text(offset,25,comp.name+' · '+c.name,21,700,'#102b3d',layout.width)}${text(offset,45,c.count+' duplas · '+graph.length+' partidas · '+(c.semifinalCrossed?'Semifinais cruzadas':'Tabela completa'),12)}${paths}${labels}${nodes}</g></svg>`;
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.BracketPrint=api;
})(typeof window!=='undefined'?window:globalThis);
