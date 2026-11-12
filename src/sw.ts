/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache assets injected by VitePWA injectManifest
precacheAndRoute(self.__WB_MANIFEST || []);

// Placeholder lifecycle event listeners (custom push notifications and runtime caching to be added)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
