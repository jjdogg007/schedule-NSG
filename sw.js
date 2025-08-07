// Cloud-First Service Worker for Schedule NSG
// NO CACHING - All requests go directly to network
// Online-only operation enforced

// Install event - skip caching, activate immediately
self.addEventListener('install', event => {
  console.log('Cloud-first service worker installed - no caching enabled');
  self.skipWaiting(); // Activate immediately
});

// Fetch event - always fetch from network, fail if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(error => {
        // If network fails, return an error response instead of cached content
        console.error('Network request failed:', error);
        
        // For navigation requests, return a custom offline page
        if (event.request.mode === 'navigate') {
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Connection Required</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: #f0f2f5; 
                    color: #1c293a;
                  }
                  .container { 
                    max-width: 400px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 40px; 
                    border-radius: 12px; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  }
                  h1 { color: #dc3545; margin-bottom: 20px; }
                  .icon { font-size: 48px; margin-bottom: 20px; }
                  .btn { 
                    background: #0d6efd; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    margin-top: 20px;
                    font-size: 16px;
                  }
                  .btn:hover { background: #0b5ed7; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">🌐</div>
                  <h1>Connection Required</h1>
                  <p>Schedule NSG requires an active internet connection to function.</p>
                  <p>This application operates in cloud-first mode with real-time synchronization.</p>
                  <p>Please check your internet connection and try again.</p>
                  <button class="btn" onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>
          `, {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // For other requests, return a proper error response
        return new Response('Network connection required', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Activate event - clean up ALL caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log('Cleaning up all caches for cloud-first operation');
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Push notification handling
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from Schedule NSG',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMTYiIGZpbGw9IiMwZDZlZmQiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xOSAzSDVjLTEuMSAwLTIgLjktMiAydjE0YzAgMS4xLjkgMiAyIDJoMTRjMS4xIDAgMi0uOSAyLTJWNWMwLTEuMS0uOS0yLTItMnoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xOSA3SDV2MTBoMTRWN3oiIGZpbGw9IiMwZDZlZmQiLz4KPC9zdmc+',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzYiIGN5PSIzNiIgcj0iMzYiIGZpbGw9IiMwZDZlZmQiLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTE5IDNINGU1Yy0xLjEgMC0yIC45LTIgMnYxNGMwIDEuMS45IDIgMiAyaDE0YzEuMSAwIDItLjkgMi0yVjVjMC0xLjEtLjktMi0yLTJ6IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTkgN0g1djEwaDE0Vjd6IiBmaWxsPSIjMGQ2ZWZkIi8+Cjwvc3ZnPg==',
    vibrate: [200, 100, 200],
    data: {
      url: './final_fixed_schedule%20(1)_032416.html'
    },
    actions: [
      {
        action: 'view',
        title: 'View Schedule'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Schedule NSG', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});