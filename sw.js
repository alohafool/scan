// 離線快取：頁面 + 解碼器。改版時把 VERSION 加一，舊快取會被清掉。
const VERSION = 'pcmap-scan-v5';
const FILES = ['./', './index.html', './vendor/zxing-reader.js', './vendor/share.js', './vendor/zxing_reader.wasm', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 同源檔案：有網路就拿最新的並更新快取；沒網路或 3 秒內沒回應就用快取（實驗室訊號差時不會卡住）。
// 其他來源（8th Wall、Tesseract 的 CDN）不攔。
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (!hit) return net.catch(() => new Response('offline', { status: 503 }));
    const timeout = new Promise(res => setTimeout(() => res(null), 3000));
    return (await Promise.race([net.catch(() => null), timeout])) || hit;
  })());
});
