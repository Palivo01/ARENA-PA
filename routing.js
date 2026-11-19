/* Routes may arrive with or without .html on static hosts. */
(function(root){
'use strict';
const pages=new Set(['index','admin','inscricoes','chaveamento','auth']);
function pageFromPath(pathname){let leaf=String(pathname||'/').replace(/\/+$/,'').split('/').pop()||'index';try{leaf=decodeURIComponent(leaf);}catch{}leaf=leaf.toLowerCase().replace(/\.html$/,'');return pages.has(leaf)?leaf+'.html':'index.html';}
const api={pageFromPath};if(typeof module!=='undefined')module.exports=api;else root.SiteRouting=api;
})(typeof window!=='undefined'?window:globalThis);
