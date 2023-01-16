var APP_PREFIX = 'microbitgamepad'     // Identifier for this app (this needs to be consistent across every cache update)
var VERSION = '1.0.3'              // Version of the off-line cache (change this value everytime you want to update cache)
var CACHE_NAME = APP_PREFIX + VERSION
var URLS = ['/microbit-gamepad/','/microbit-gamepad/fa-brands-400.04246ac6.woff','/microbit-gamepad/fa-brands-400.a1db9459.woff2','/microbit-gamepad/fa-brands-400.ac88be85.svg','/microbit-gamepad/fa-brands-400.ae1da9aa.eot','/microbit-gamepad/fa-brands-400.e8eab21c.ttf','/microbit-gamepad/fa-regular-400.4f946da8.woff','/microbit-gamepad/fa-regular-400.6adc9fcd.eot','/microbit-gamepad/fa-regular-400.6e35f891.woff2','/microbit-gamepad/fa-regular-400.a215af91.ttf','/microbit-gamepad/fa-regular-400.ed807156.svg','/microbit-gamepad/fa-solid-900.88a6089c.woff','/microbit-gamepad/fa-solid-900.ab906712.woff2','/microbit-gamepad/fa-solid-900.e5b19c09.svg','/microbit-gamepad/fa-solid-900.ec16851e.ttf','/microbit-gamepad/fa-solid-900.ef18b3bb.eot','/microbit-gamepad/index.html','/microbit-gamepad/main.fa7f93a2.js','/microbit-gamepad/main.fa7f93a2.js.map','/microbit-gamepad/maskable_icon_x128.ae1e74f9.png','/microbit-gamepad/maskable_icon_x144.fc14e37c.png','/microbit-gamepad/maskable_icon_x152.ce6c1441.png','/microbit-gamepad/maskable_icon_x384.1af8edb2.png','/microbit-gamepad/maskable_icon_x512.a9ac38fa.png','/microbit-gamepad/maskable_icon_x72.b43d35ec.png','/microbit-gamepad/maskable_icon_x96.e03bc2e8.png','/microbit-gamepad/pwa-192x192.b3dbd8bb.png','/microbit-gamepad/pwa-512x512.b27071b7.png','/microbit-gamepad/service-worker.js','/microbit-gamepad/styles.ac699ce3.css','/microbit-gamepad/styles.ac699ce3.css.map']  // This will be replaced by the deploy-script

// Respond with cached resources
self.addEventListener('fetch', function (e) {
  console.log('fetch request : ' + e.request.url)
  e.respondWith(
    caches.match(e.request).then(function (request) {
      if (request) { // if cache is available, respond with cache
        console.log('responding with cache : ' + e.request.url)
        return request
      } else {       // if there are no cache, try fetching request
        console.log('file is not cached, fetching : ' + e.request.url)
        return fetch(e.request)
      }

      // You can omit if/else for console.log & put one line below like this too.
      // return request || fetch(e.request)
    })
  )
})

// Cache resources
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('installing cache : ' + CACHE_NAME)
      return cache.addAll(URLS)
    })
  )
})

// Delete outdated caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      // `keyList` contains all cache names under your username.github.io
      // filter out ones that has this app prefix to create white list
      var cacheWhitelist = keyList.filter(function (key) {
        return key.indexOf(APP_PREFIX)
      })
      // add current cache name to white list
      cacheWhitelist.push(CACHE_NAME)

      return Promise.all(keyList.map(function (key, i) {
        if (cacheWhitelist.indexOf(key) === -1) {
          console.log('deleting cache : ' + keyList[i] )
          return caches.delete(keyList[i])
        }
      }))
    })
  )
})
