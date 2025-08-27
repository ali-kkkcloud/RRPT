// G4S Fleet Dashboard Service Worker v2.0.0
const CACHE_NAME = 'g4s-fleet-dashboard-v2.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/manifest.json',
    '/offline.html',
    // CDN resources
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// Dynamic cache for API responses and Google Sheets data
const DYNAMIC_CACHE_NAME = 'g4s-fleet-dynamic-v2.0.0';

// Maximum age for cached data (in milliseconds)
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Install event - cache static resources
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Caching static resources');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('✅ Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Installation failed', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                            console.log('🗑️ Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    const url = new URL(event.request.url);
    
    // Handle navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return response;
                })
                .catch(() => {
                    return caches.match('/') || caches.match('/index.html');
                })
        );
        return;
    }
    
    // Handle Google Sheets API requests
    if (url.hostname === 'docs.google.com' && url.pathname.includes('/export')) {
        event.respondWith(handleGoogleSheetsRequest(event.request));
        return;
    }
    
    // Handle other API requests
    if (url.hostname.includes('supabase') || url.hostname.includes('api.')) {
        event.respondWith(handleApiRequest(event.request));
        return;
    }
    
    // Handle static resources
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    console.log('📄 Service Worker: Serving from cache', event.request.url);
                    return response;
                }
                
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response before caching
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
            })
            .catch(() => {
                // If both cache and network fail, show offline page for navigation requests
                if (event.request.destination === 'document') {
                    return caches.match(OFFLINE_URL);
                }
            })
    );
});

// Handle Google Sheets API requests with caching
async function handleGoogleSheetsRequest(request) {
    const cacheKey = request.url;
    
    try {
        // Try to get fresh data
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache the fresh data with timestamp
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            const responseWithTimestamp = new Response(await networkResponse.text(), {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: {
                    ...Object.fromEntries(networkResponse.headers.entries()),
                    'sw-cache-timestamp': Date.now().toString()
                }
            });
            
            await cache.put(cacheKey, responseWithTimestamp.clone());
            
            // Return fresh data without timestamp header
            return new Response(await responseWithTimestamp.text(), {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: networkResponse.headers
            });
        }
        
        throw new Error('Network response not ok');
        
    } catch (error) {
        console.log('🔄 Service Worker: Network failed, trying cache for', cacheKey);
        
        // Try to serve from cache
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const cachedResponse = await cache.match(cacheKey);
        
        if (cachedResponse) {
            const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
            const isStale = cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) > CACHE_MAX_AGE;
            
            if (!isStale) {
                console.log('📊 Service Worker: Serving fresh cached data');
                return new Response(await cachedResponse.text(), {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: Object.fromEntries(
                        [...cachedResponse.headers.entries()].filter(([key]) => key !== 'sw-cache-timestamp')
                    )
                });
            } else {
                console.log('⚠️ Service Worker: Serving stale cached data');
                // Still serve stale data but with a warning header
                return new Response(await cachedResponse.text(), {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: {
                        ...Object.fromEntries(
                            [...cachedResponse.headers.entries()].filter(([key]) => key !== 'sw-cache-timestamp')
                        ),
                        'sw-cache-stale': 'true'
                    }
                });
            }
        }
        
        // No cache available, return error response
        return new Response(JSON.stringify({
            error: 'Data unavailable offline',
            message: 'Please check your internet connection',
            timestamp: new Date().toISOString()
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// Handle other API requests
async function handleApiRequest(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (error) {
        console.log('🔄 Service Worker: API request failed', request.url);
        
        // Return a generic offline response for API failures
        return new Response(JSON.stringify({
            error: 'API unavailable',
            message: 'Service is currently offline',
            offline: true
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'background-sync-fleet-data') {
        event.waitUntil(syncFleetData());
    }
});

// Background sync function
async function syncFleetData() {
    console.log('📊 Service Worker: Syncing fleet data in background');
    
    try {
        // Clear stale cache
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const cacheKeys = await cache.keys();
        
        // Remove entries older than cache max age
        const now = Date.now();
        for (const request of cacheKeys) {
            const response = await cache.match(request);
            const timestamp = response.headers.get('sw-cache-timestamp');
            
            if (timestamp && (now - parseInt(timestamp)) > CACHE_MAX_AGE) {
                await cache.delete(request);
                console.log('🗑️ Service Worker: Removed stale cache entry', request.url);
            }
        }
        
        // Notify clients that sync is complete
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC_COMPLETE',
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        console.error('❌ Service Worker: Background sync failed', error);
    }
}

// Push notifications for critical alerts
self.addEventListener('push', (event) => {
    console.log('🔔 Service Worker: Push notification received');
    
    const options = {
        body: 'You have new critical fleet alerts',
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/?tab=ai-alerts'
        },
        actions: [
            {
                action: 'view',
                title: 'View Alerts',
                icon: '/images/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/images/dismiss-icon.png'
            }
        ],
        tag: 'fleet-alert',
        renotify: true,
        requireInteraction: true
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            options.body = data.message || options.body;
            options.data = { ...options.data, ...data };
        } catch (error) {
            console.error('❌ Service Worker: Error parsing push data', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification('G4S Fleet Alert', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Service Worker: Notification clicked', event.action);
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default click - open the app
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then((clientList) => {
                    // If app is already open, focus it
                    for (const client of clientList) {
                        if (client.url === self.location.origin && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Otherwise open new window
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('💬 Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: '2.0.0',
            cacheName: CACHE_NAME
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(DYNAMIC_CACHE_NAME)
                .then(() => {
                    event.ports[0].postMessage({ success: true });
                })
        );
    }
});

// Periodic background sync (experimental)
self.addEventListener('periodicsync', (event) => {
    console.log('🔄 Service Worker: Periodic sync triggered', event.tag);
    
    if (event.tag === 'fleet-data-sync') {
        event.waitUntil(syncFleetData());
    }
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker: Error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Service Worker: Unhandled promise rejection', event.reason);
});

console.log('🚀 G4S Fleet Dashboard Service Worker v2.0.0 loaded');
