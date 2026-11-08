// 每次你修改了网页代码，只要把这里的 v1 改成 v2、v3...，玩家就会自动更新
const CACHE_NAME = 'jianghan-space-v1'; 

// 需要缓存的静态文件（这样断网了也能打开）
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './jianghan.png',
  './date_bg.jpg',
  './1.mp3', './2.mp3', './3.mp3', './kiku.mp3'
];

// 安装 Service Worker 并缓存文件
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 强制新版本立刻生效
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 激活时清理旧版本的缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // 删掉旧版本，防止越积越多
          }
        })
      );
    }).then(() => self.clients.claim()) // 立刻接管页面
  );
});

// 拦截网络请求：网络优先，网络不通再用缓存（保证永远加载最新代码）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then((response) => {
      // 如果是正常的文件，复制一份更新到缓存里
      if (response && response.status === 200 && response.type === 'basic') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // 如果断网了，就从缓存里拿
      return caches.match(event.request);
    })
  );
});