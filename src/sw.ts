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
import { getWmoDescription } from './services/openmeteo';

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

/**
 * PAYLOAD-LESS WEB PUSH DESIGN:
 * Push notifications are sent with an empty body (payload-less) from the Cloudflare Worker.
 * This completely avoids AES-GCM / RFC 8291 Content-Encoding encryption overhead on the free
 * Worker's 10 ms CPU budget.
 *
 * When the push event arrives, the service worker wakes up, reads the user's preferred city
 * from the Cache API ("weatherboard-prefs"), fetches fresh weather directly from Open-Meteo
 * (which requires no API key), and constructs the user-facing notification locally.
 */

const PREFS_CACHE_NAME = 'weatherboard-prefs';
const PREFS_CITY_PATH = '/__prefs/city';

interface SavedCityPref {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

async function getSavedCity(): Promise<SavedCityPref | null> {
  try {
    const cache = await caches.open(PREFS_CACHE_NAME);
    const response = await cache.match(PREFS_CITY_PATH);
    if (!response) return null;
    return (await response.json()) as SavedCityPref;
  } catch {
    return null;
  }
}

async function handlePushNotification(): Promise<void> {
  const city = await getSavedCity();

  let title = 'WeatherBoard';
  let body = "Good morning! Tap to check today's weather.";

  if (city && typeof city.latitude === 'number' && typeof city.longitude === 'number') {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const temp = Math.round(data?.current?.temperature_2m);
        const code = Number(data?.current?.weather_code ?? 0);
        const conditionDesc = getWmoDescription(code).toLowerCase();
        const max = Math.round(data?.daily?.temperature_2m_max?.[0] ?? temp);
        const min = Math.round(data?.daily?.temperature_2m_min?.[0] ?? temp);

        title = `${city.name} today`;
        body = `${temp}°C, ${conditionDesc}. High ${max}°, low ${min}°.`;
      }
    } catch {
      // Fallback to default message on fetch failure
    }
  }

  // Must always show notification inside waitUntil
  await self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'daily-weather',
  });
}

// Push notification listener
self.addEventListener('push', (event) => {
  event.waitUntil(handlePushNotification());
});

// Notification click listener: focuses existing window or opens "/"
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
