/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

// Activate immediately
self.skipWaiting();
clientsClaim();

// Cleanup outdated caches from older versions
cleanupOutdatedCaches();

// Precache the app shell using the injected manifest
precacheAndRoute(self.__WB_MANIFEST || []);

// NavigationRoute to serve precached index.html for navigation requests offline
try {
  const handler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [/^\/api/, /\.[a-z0-9]+$/i],
  });
  registerRoute(navigationRoute);
} catch {
  // Fallback if index.html is referenced without leading slash in certain setups
  try {
    const handler = createHandlerBoundToURL('index.html');
    registerRoute(new NavigationRoute(handler));
  } catch {
    // Handled gracefully
  }
}

// Runtime caching for weather APIs: OpenWeatherMap and Open-Meteo
// NetworkFirst with 4-second timeout, dedicated 'weather-api' cache, max 4 entries, 24h expiration
registerRoute(
  ({ url }) =>
    url.hostname === 'api.openweathermap.org' ||
    url.hostname === 'api.open-meteo.com',
  new NetworkFirst({
    cacheName: 'weather-api',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Explicitly do NOT cache GeoDB / RapidAPI requests - city search requires network.

// Handle skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
