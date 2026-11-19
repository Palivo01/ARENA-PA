// Preserve email callbacks arriving at an older home/admin URL before the SDK consumes them.
(function(){
'use strict';
const query=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
const incoming=['code','token_hash','access_token','refresh_token','error','error_code','error_description'].some(key=>query.has(key)||hash.has(key));
if(!incoming)return;
const destination=new URL('auth.html',document.baseURI);destination.search=location.search;destination.hash=location.hash;
if(destination.pathname===location.pathname)return;
window.TORNEIO_AUTH_REDIRECTING=true;location.replace(destination.href);
})();
