// 【修改点 1】版本号递增！不递增的话旧缓存不会清
const CACHE_NAME = 'jianghan-v2';

// 【修改点 2】核心资源（HTML/清单/图标）
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 【修改点 3】媒体资源（背景/头像/海报/音频）—— 想离线可玩就都列上
const MEDIA_ASSETS = [
  './date_bg.jpg',
  './jianghan.png',
  './1.png',
  './2.png',
  './3.png',
  './4.png',
  './5.png',
  './6.png',
  './7.png',
  './8.png',
  './9.png',
  './10.png',
  './11.jpg',
  './1.mp3',
  './2.mp3',
  './3.mp3',
  './kiku.mp3'
];

const ASSETS = [...CORE_ASSETS, ...MEDIA_ASSETS];

// ============ install：预缓存 ============
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 【修改点 4】逐个 add 并 catch，避免某个文件 404 导致整个安装失败
      return Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('预缓存失败（跳过）:', url, err))
        )
      );
    })
  );
});

// ============ activate：清旧缓存 ============
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(() => self.clients.claim())
  );
});

// ============ fetch：分类策略 ============
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // 只处理 GET 请求
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 只处理同源请求（跨域 CDN 资源不缓存）
  if (url.origin !== self.location.origin) return;

  // 【策略 A】HTML / 页面导航：network-first（优先拉新，离线用缓存）
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(r => r || caches.match('./index.html'))
        )
    );
    return;
  }

  // 【策略 B】静态资源（图片/音频/JS/CSS）：cache-first + 后台更新（stale-while-revalidate）
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});