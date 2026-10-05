const CACHE_NAME='evangelizacao-pwa-v32';
const APP_SHELL=['/','/index.html','/site.webmanifest?v=32','/pwa-192.png?v=32','/pwa-512.png?v=32','/apple-touch-icon.png?v=32'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        const cache=await caches.open(CACHE_NAME);
        cache.put('/',fresh.clone()).catch(()=>{});
        return fresh;
      }catch{
        return (await caches.match(req)) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req);
      if(fresh.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }catch{
      return (await caches.match(req)) || Response.error();
    }
  })());
});
