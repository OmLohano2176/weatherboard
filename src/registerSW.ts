import { registerSW } from 'virtual:pwa-register';

export function setupServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Automatically updates when new service worker is ready
      },
      onOfflineReady() {
        // Ready for offline use
      },
      onRegisterError() {
        // Silently handle error to prevent noisy console output
      },
    });
  }
}
