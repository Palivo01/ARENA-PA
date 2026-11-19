(function(root){
'use strict';
const clamp=value=>Math.max(.06,Math.min(3,value));
function anchoredZoom(oldZoom,newZoom,scroll,point,padding=16){return (scroll+point-padding)*newZoom/oldZoom-point+padding;}
function fitZoom(width,height,viewportWidth,viewportHeight,padding=16){return clamp(Math.min((viewportWidth-padding*2)/width,(viewportHeight-padding*2)/height));}
class Controller{
 constructor(viewport,graph,surface,scale,onZoom){
  Object.assign(this,{el:viewport,graph,surface,scale,onZoom,zoom:1,x:16,y:16,frame:0,dragged:false});this.points=new Map();this.abort=new AbortController();this.lastLabel=null;this.useTouch='ontouchstart' in viewport;
  const options={signal:this.abort.signal};if(this.useTouch)for(const name of ['touchstart','touchmove','touchend','touchcancel'])viewport.addEventListener(name,this.touch.bind(this),{...options,passive:false});for(const [name,fn]of Object.entries({pointerdown:this.down,pointermove:this.move,pointerup:this.up,pointercancel:this.up,lostpointercapture:this.up,wheel:this.wheel,keydown:this.key}))viewport.addEventListener(name,fn.bind(this),{...options,passive:false});
  viewport.addEventListener('click',event=>{if(Date.now()<(this.suppressUntil||0)){event.preventDefault();event.stopImmediatePropagation();}},{...options,capture:true});
 }
 point(event){const rect=this.el.getBoundingClientRect(),ratio=rect.width/this.el.offsetWidth||1;return {x:(event.clientX-rect.left)/ratio,y:(event.clientY-rect.top)/ratio};}
 snapshot(){return {zoom:this.zoom,x:this.x,y:this.y};}
 restore(view){if(!view)return this.fit();this.zoom=clamp(view.zoom);this.x=Number.isFinite(view.x)?view.x:16;this.y=Number.isFinite(view.y)?view.y:16;this.paint();}
 paint(){cancelAnimationFrame(this.frame);this.frame=0;this.scale.style.transform=`translate3d(${this.x}px,${this.y}px,0) scale(${this.zoom})`;if(this.lastLabel!==this.zoom){this.onZoom(this.zoom);this.lastLabel=this.zoom;}}
 schedule(){if(!this.frame)this.frame=requestAnimationFrame(()=>this.paint());}
 apply(value){this.zoom=clamp(value);this.paint();}
 limitPan(){// Keep a reachable part of the table, even when it fits inside the viewport.
  this.x=Math.max(Math.min(16,64-this.graph.offsetWidth*this.zoom),Math.min(Math.max(16,this.el.clientWidth-64),this.x));
  this.y=Math.max(Math.min(16,64-this.graph.offsetHeight*this.zoom),Math.min(Math.max(16,this.el.clientHeight-64),this.y));
 }
 setZoom(value,point={x:this.el.clientWidth/2,y:this.el.clientHeight/2}){const next=clamp(value),ratio=next/this.zoom;this.x=point.x-(point.x-this.x)*ratio;this.y=point.y-(point.y-this.y)*ratio;this.zoom=next;this.limitPan();this.paint();}
 fit(){this.zoom=fitZoom(this.graph.offsetWidth,this.graph.offsetHeight,this.el.clientWidth,this.el.clientHeight);this.x=(this.el.clientWidth-this.graph.offsetWidth*this.zoom)/2;this.y=(this.el.clientHeight-this.graph.offsetHeight*this.zoom)/2;this.paint();}
 readable(){this.zoom=1;this.x=this.y=16;this.paint();}
 rebase(){const pts=[...this.points.values()];this.origin={...pts[0],view:this.snapshot()};if(pts.length>1){const center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};this.origin.distance=Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y));this.origin.world={x:(center.x-this.x)/this.zoom,y:(center.y-this.y)/this.zoom};}}
 down(event){if(this.useTouch&&event.pointerType==='touch'&&!event.fromTouch)return;if(event.pointerType==='mouse'&&event.button!==0||event.target.closest('input,select,textarea'))return;if(this.points.size>=2)return;this.points.set(event.pointerId,this.point(event));if(this.points.size===1)this.dragged=false;this.rebase();document.body.classList.add('bracket-gesture');if(this.points.size>1){this.dragged=true;for(const id of this.points.keys())this.capture(id);}}
 move(event){if(this.useTouch&&event.pointerType==='touch'&&!event.fromTouch)return;if(!this.points.has(event.pointerId))return;const point=this.point(event);this.points.set(event.pointerId,point);const pts=[...this.points.values()],origin=this.origin;if(!origin)return;
  if(pts.length>1){event.preventDefault();this.dragged=true;const center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};this.zoom=clamp(origin.view.zoom*Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)/origin.distance);this.x=center.x-origin.world.x*this.zoom;this.y=center.y-origin.world.y*this.zoom;}
  else{if(!this.dragged&&Math.hypot(point.x-origin.x,point.y-origin.y)<3)return;event.preventDefault();this.dragged=true;this.capture(event.pointerId);this.x=origin.view.x+point.x-origin.x;this.y=origin.view.y+point.y-origin.y;}
  this.limitPan();this.schedule();
 }
 touch(event){
  const changed=Array.from(event.changedTouches||[]),touches=Array.from(event.touches||[]);
  const asPointer=t=>({pointerId:t.identifier,pointerType:'touch',fromTouch:true,clientX:t.clientX,clientY:t.clientY,target:event.target,type:event.type==='touchcancel'?'pointercancel':'pointerup',preventDefault:()=>event.preventDefault()});
  if(event.type==='touchstart'){this.nativeTouchActive=true;for(const t of changed)this.down(asPointer(t));if(this.points.size>1)event.preventDefault();return;}
  if(event.type==='touchmove'){if(!this.points.size)return;event.preventDefault();for(const t of touches)if(this.points.has(t.identifier))this.points.set(t.identifier,this.point(asPointer(t)));const current=touches.find(t=>this.points.has(t.identifier));if(current)this.move(asPointer(current));return;}
  for(const t of changed)this.up(asPointer(t));
  if(!this.points.size)this.nativeTouchActive=false;
 }
 capture(id){if(this.nativeTouchActive)return;try{if(!this.el.hasPointerCapture(id))this.el.setPointerCapture(id);}catch{}}
 up(event){if(this.useTouch&&event.pointerType==='touch'&&!event.fromTouch)return;if(event.type==='lostpointercapture'&&event.target!==this.el)return;if(!this.points.has(event.pointerId))return;this.points.delete(event.pointerId);try{if(this.el.hasPointerCapture(event.pointerId))this.el.releasePointerCapture(event.pointerId);}catch{}if(this.dragged)this.suppressUntil=Date.now()+250;this.paint();if(this.points.size){this.rebase();return;}this.origin=null;document.body.classList.remove('bracket-gesture');}
 stop(){cancelAnimationFrame(this.frame);this.frame=0;if(!this.points.size)document.body.classList.remove('bracket-gesture');}
 wheel(event){event.preventDefault();if(event.ctrlKey||event.metaKey)this.setZoom(this.zoom*Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.004),this.point(event));else{const unit=event.deltaMode===1?16:event.deltaMode===2?this.el.clientHeight:1;this.x-=(event.shiftKey&&!event.deltaX?event.deltaY:event.deltaX)*unit;this.y-=(event.shiftKey&&!event.deltaX?0:event.deltaY)*unit;this.limitPan();this.schedule();}}
 key(event){if(event.target!==this.el)return;const moves={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};if(moves[event.key]){event.preventDefault();this.x+=moves[event.key][0];this.y+=moves[event.key][1];this.limitPan();this.paint();}if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')this.fit();else this.setZoom(this.zoom*(event.key==='-'?1/1.2:1.2));}}
 destroy(){this.points.clear();this.stop();this.abort.abort();}
}
const api={clamp,anchoredZoom,fitZoom,Controller};if(typeof module!=='undefined')module.exports=api;else root.BracketViewport=api;
})(typeof window!=='undefined'?window:globalThis);
