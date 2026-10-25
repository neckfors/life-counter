// Service worker: keeps a copy of the app on the device so it works offline.
// Bump VERSION whenever anything is published; that is how phones notice the update. Add new files
// to FILES.

const VERSION = 10;
const CACHE = `neckfors-life-counter-${VERSION}`;

const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'fonts/oswald-500.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/board.js',
  'js/device.js',
  'js/dialogs.js',
  'js/dice.js',
  'js/dom.js',
  'js/first-player.js',
  'js/help.js',
  'js/history-screen.js',
  'js/history.js',
  'js/layouts.js',
  'js/main.js',
  'js/menu.js',
  'js/reset.js',
  'js/settings.js',
  'js/state.js',
  'js/styling.js',
  'js/update.js',
];

// The new version waits until the player taps "Update available" (see update.js), so a game is never
// reloaded halfway through.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(FILES.map(file => new Request(file, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data === 'update') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true })
    .then(cached => cached ?? fetch(event.request)));
});
