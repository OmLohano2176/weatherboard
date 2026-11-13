import { City } from '../types';

export const PREFS_CACHE_NAME = 'weatherboard-prefs';
export const PREFS_CITY_PATH = '/__prefs/city';

export interface SavedCityPref {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * Saves the selected city into the Cache API so the Service Worker can read it
 * during push notification handling.
 */
export async function saveSelectedCityToCache(city: City | null): Promise<void> {
  if (typeof caches === 'undefined') return;

  try {
    const cache = await caches.open(PREFS_CACHE_NAME);
    if (!city) {
      await cache.delete(PREFS_CITY_PATH);
      return;
    }

    const payload: SavedCityPref = {
      name: city.name,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
    };

    const response = new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await cache.put(PREFS_CITY_PATH, response);
  } catch (err) {
    console.error('Failed to save selected city to Cache API for Service Worker:', err);
  }
}
