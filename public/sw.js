self.addEventListener('fetch', event => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(async resp => {
        if (req.method === 'GET') {
          try {
            const cache = await caches.open('dynamic-cache');
            cache.put(req, resp.clone());
          } catch (e) {
            console.warn('Cache PUT falhou:', e);
          }
        }
        return resp;
      });
    })
  );
}); 