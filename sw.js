// Guarda a app no aparelho para funcionar sem internet.
// Ao mudar algum ficheiro, sobe a versão para os telemóveis receberem a atualização.
const VERSAO="caderno-v2";
const FICHEIROS=["./","index.html","estilo.css","dados.js","logica.js","app.js","ecras.js","manifest.webmanifest",
  "icones/icone-180.png","icones/icone-192.png","icones/icone-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(FICHEIROS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// Com rede vai buscar a versão mais recente (e guarda-a); sem rede usa a cópia guardada.
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(caches.open(VERSAO).then(async c=>{
    try{
      const r=await Promise.race([fetch(e.request,{cache:"no-cache"}),new Promise((_,rej)=>setTimeout(rej,4000))]);
      if(r.ok)c.put(e.request,r.clone());return r;
    }catch{
      return (await c.match(e.request,{ignoreSearch:true}))||(e.request.mode==="navigate"?c.match("index.html"):Response.error());
    }
  }));
});
