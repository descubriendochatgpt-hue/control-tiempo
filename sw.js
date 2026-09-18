/* ============================================================
   Centro de mando — trabajador de servicio
   Objetivo: que la aplicación abra sin conexión sin llegar nunca a
   servir una versión vieja cuando sí hay red.

   · El documento y el propio index.html van SIEMPRE a la red primero;
     la copia guardada solo se usa si la red falla.
   · Los recursos propios (iconos, manifiesto) se sirven de la copia y se
     refrescan por detrás.
   · Nada de terceros se guarda aquí: la tipografía y SheetJS los gestiona
     el navegador con su propia caché.

   Al publicar una versión nueva basta con cambiar VERSION: las cachés
   anteriores se borran solas. El botón «Actualizar» de la aplicación
   además da de baja este trabajador y vacía todas las cachés.
   ============================================================ */
const VERSION='cdm-v1';
const ESENCIALES=['./','./index.html','./manifest.json','./icono.svg','./icono-192.png','./icono-512.png','./icono-maskable-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION)
    .then(c=>Promise.allSettled(ESENCIALES.map(u=>c.add(new Request(u,{cache:'reload'})))))
    .then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

const esDocumento=req=>req.mode==='navigate'||(req.destination===''&&/\.html(\?|$)/.test(req.url));

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;          // terceros: que se encargue el navegador

  if(esDocumento(req)){                                  // red primero, copia como red de emergencia
    e.respondWith(
      fetch(req).then(r=>{
        if(r&&r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put('./index.html',c));}
        return r;
      }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  e.respondWith(                                         // copia primero y refresco por detrás
    caches.match(req).then(guardada=>{
      const red=fetch(req).then(r=>{
        if(r&&r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c));}
        return r;
      }).catch(()=>guardada);
      return guardada||red;
    })
  );
});
