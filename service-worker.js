const CACHE_PREFIX = 'nasa-space-explorer-';
const APP_CACHE_NAME = `${CACHE_PREFIX}app-v3`;
const APOD_CACHE_NAME = `${CACHE_PREFIX}apod-v1`;
const APP_SHELL_FILES = [
  './',
  'index.html',
  'style.css',
  'js/script.js',
  'js/dateRange.js',
  'js/manifest.json',
  'service-worker.js',
  'img/NASA-Logo-Large.jpg',
  'img/nasa-worm-logo.png',
  'img/video-placeholder.svg',
  'icons/icons-192.png',
  'icons/icons-512.png'
];
const APOD_API_ORIGIN = 'https://science.nasa.gov';
const APOD_API_PATH = '/wp-json/wp/v2/apod-basic/';

const appShellUrls = APP_SHELL_FILES.map((file) => new URL(file, self.registration.scope).href);
const appShellUrlSet = new Set(appShellUrls);
const appIndexUrl = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then((cache) => cache.addAll(appShellUrls))
      .catch(async (error) => {
        await caches.delete(APP_CACHE_NAME);
        console.error('[Service Worker] Unable to cache the application shell:', error);
        throw error;
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const oldAppCaches = cacheNames.filter(
        (name) =>
          name.startsWith(CACHE_PREFIX) &&
          name !== APP_CACHE_NAME &&
          name !== APOD_CACHE_NAME
      );
      return Promise.all(oldAppCaches.map((name) => caches.delete(name)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  if (
    requestUrl.origin === APOD_API_ORIGIN &&
    requestUrl.pathname.startsWith(APOD_API_PATH)
  ) {
    event.respondWith(networkFirstForApod(request));
    return;
  }

  const isAppRequest =
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname.startsWith(new URL(self.registration.scope).pathname);
  if (isAppRequest && (request.mode === 'navigate' || appShellUrlSet.has(request.url))) {
    event.respondWith(cacheFirstForApp(request));
  }
});

async function cacheFirstForApp(request) {
  const cache = await caches.open(APP_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode === 'navigate') {
      const cachedIndex = await cache.match(appIndexUrl);
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    throw error;
  }
}

async function networkFirstForApod(request) {
  try {
    const response = await fetch(request);
    if (!response.ok) {
      if (response.status >= 500) {
        const cachedResponse = await getCachedApodResponse(request);
        if (cachedResponse) {
          return cachedResponse;
        }
      }
      return response;
    }

    if (await isValidApodResponse(response.clone())) {
      try {
        const cache = await caches.open(APOD_CACHE_NAME);
        await cache.put(request, response.clone());
      } catch (error) {
        console.error('[Service Worker] Unable to cache the APOD response:', error);
      }
      return response;
    }

    const cachedResponse = await getCachedApodResponse(request);
    return cachedResponse || response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    const cachedResponse = await getCachedApodResponse(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function getCachedApodResponse(request) {
  const cache = await caches.open(APOD_CACHE_NAME);
  return cache.match(request);
}

async function isValidApodResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return false;
  }

  try {
    const data = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      data.error ||
      data.code ||
      typeof data.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
      typeof data.title !== 'string' ||
      !data.title.trim()
    ) {
      return false;
    }

    const mediaType = typeof data.media_type === 'string'
      ? data.media_type.toLowerCase()
      : '';
    const hasMediaContent = [data.hdurl, data.url, data.basic_html].some(
      (value) => typeof value === 'string' && value.trim()
    );

    return ['image', 'video', 'iframe'].includes(mediaType) && hasMediaContent;
  } catch (error) {
    return false;
  }
}
