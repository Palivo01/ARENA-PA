(function(root){
'use strict';
function create(storage){
 const key=context=>context?.competition&&context?.scope?'roteirizze:last-category:'+JSON.stringify([context.scope,context.competition]):null;
 function read(context){try{const name=key(context);return name?storage().getItem(name):null;}catch{return null;}}
 function remember(context,id){try{const name=key(context);if(name&&id)storage().setItem(name,id);}catch{}}
 function choose(categories,requested,context){return categories.find(c=>c.id===requested)||categories.find(c=>c.id===read(context))||categories[0]||null;}
 function ordered(categories,selected){return [...categories.filter(c=>c.id===selected),...categories.filter(c=>c.id!==selected)];}
 return {choose,remember,ordered};
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.CategoryMemory=api;
})(typeof window!=='undefined'?window:globalThis);
