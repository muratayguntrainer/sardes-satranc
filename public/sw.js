// Sardes Satranç - basit PWA service worker.
// Vite her derlemede JS/CSS dosyalarına yeni hash'li isimler verdiği için
// (ör. index-abc123.js), burada dosya adlarını sabit olarak önbelleğe almıyoruz.
// Bunun yerine: sayfa gezintilerinde önce ağı dene (kullanıcı hep en güncel
// sürümü görsün), statik dosyalarda önbellekten hızlı yanıt verip arka planda
// güncelle. Böylece hem "Ana Ekrana Ekle" ile normal bir uygulama gibi açılır
// hem de internet kesildiğinde daha önce ziyaret edilen sayfalar çalışmaya
// devam eder. Supabase/Stockfish gibi başka adreslere giden isteklere hiç
// dokunmuyoruz — onlar doğrudan ağa gider.

const CACHE_NAME = 'sardes-satranc-v1'
const APP_SHELL = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // sadece kendi sitemiz; Supabase/CDN'e dokunma

  // Sayfa gezintileri: önce ağ (en güncel sürüm), olmazsa (çevrimdışı) önbellek.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // Diğer statik dosyalar (js/css/görsel/font): önbellekten hızlı yanıt ver,
  // arka planda ağdan tazele.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || fetchPromise
      })
    )
  )
})
