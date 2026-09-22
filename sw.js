/**
 * 热搜聚合 - Service Worker
 * 提供离线支持和性能优化
 */

const CACHE_NAME = 'hotsearch-v2';

// 需要缓存的资源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json'
];

// 安装事件
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// 激活事件
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跨源：只接管数据 CDN（jsDelivr），网络优先保证数据新鲜；
    // 其余跨源请求（如 Google Fonts）不干预
    if (url.origin !== location.origin) {
        if (url.hostname === 'cdn.jsdelivr.net') {
            event.respondWith(networkFirst(request));
        }
        return;
    }

    // 同源静态资源：缓存立即返回，后台静默更新（stale-while-revalidate）
    event.respondWith(staleWhileRevalidate(event));
});

// 缓存优先 + 后台更新：立刻返回缓存，同时在后台刷新缓存。
// 这样发版后用户不会被锁死在旧版本，最多第二次访问拿到新版本。
async function staleWhileRevalidate(event) {
    const { request } = event;
    const cache = await caches.open(CACHE_NAME);

    const refresh = fetch(request)
        .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => null);
    event.waitUntil(refresh);

    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    const networkResponse = await refresh;
    if (networkResponse) return networkResponse;
    return new Response('Offline', { status: 503 });
}

// 网络优先策略（热搜数据，离线时回退缓存）
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network request failed, trying cache:', error);

        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // 如果没有缓存，返回离线提示
        return new Response(
            JSON.stringify({ error: 'offline', message: '网络不可用' }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// 推送通知处理
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body || '有新热搜更新',
            icon: data.icon || '/icon.png',
            badge: '/badge.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || '热搜聚合', options)
        );
    }
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// 消息处理
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
