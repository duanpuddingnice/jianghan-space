// 版本号升级，清空之前的错误缓存
const CACHE_NAME = 'jianghan-v3';

// 只缓存最核心的框架，不强行缓存图片和音频！
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 只预加载核心文件，避免首次打开卡顿
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 【策略 1】HTML 走网络优先，保证能拿到最新代码
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // 【策略 2】图片和音频：用到哪张，缓存哪张（极速响应，不会卡死）
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached; // 如果有缓存，直接返回（秒开）
      
      return fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const copy = res.clone();
        // 玩家看到图/听到歌的瞬间，后台悄悄把它存下来，下次秒开
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      });
    })
  );
});