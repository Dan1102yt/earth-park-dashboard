// Service worker mínimo para que el dashboard se pueda instalar como app.
// Estrategia: siempre intenta la red (datos frescos); si no hay internet, muestra la última versión guardada
// de la página y sus archivos. Nunca guarda llamadas a APIs (Worker, Supabase, Google, ElevenLabs).
const CACHE = "earthpark-app-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // APIs y otros dominios: directo a la red
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch {
      const guardada = await caches.match(req);
      if (guardada) return guardada;
      if (req.mode === "navigate") return caches.match(self.registration.scope);
      throw new Error("Sin conexión");
    }
  })());
});
