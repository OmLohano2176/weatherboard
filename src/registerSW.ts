import { registerSW } from 'virtual:pwa-register';

export function setupServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[WeatherBoard SW] New content available.');
      },
      onOfflineReady() {
        console.log('[WeatherBoard SW] App ready for offline use.');
      },
      onRegisteredSW(swUrl, registration) {
        console.log('[WeatherBoard SW] Registered at:', swUrl, registration);
      },
      onRegisterError(error) {
        console.error('[WeatherBoard SW] Registration failed:', error);
      }
    });
  }
}
