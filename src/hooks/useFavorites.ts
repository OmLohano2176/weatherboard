import { useState, useEffect, useCallback } from 'react';
import { City } from '../types';
import { getItem, setItem, isStorageAvailable } from '../utils/storage';

const STORAGE_KEY = 'weatherboard:favorites';
const MAX_FAVORITES = 5;

export type AddFavoriteResult =
  | { ok: true }
  | { ok: false; reason: 'limit' | 'duplicate' };

export interface UseFavoritesResult {
  favorites: City[];
  isFavorite: (city: City | null) => boolean;
  addFavorite: (city: City) => AddFavoriteResult;
  removeFavorite: (id: number) => void;
  storageAvailable: boolean;
  limitReached: boolean;
}

function isValidCity(item: unknown): item is City {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;

  const hasValidId = typeof c.id === 'number' || (typeof c.id === 'string' && !isNaN(Number(c.id)));
  const hasValidName = typeof c.name === 'string' && c.name.trim().length > 0;
  const hasValidCountry = typeof c.country === 'string';
  const hasValidLat = typeof c.latitude === 'number' && !Number.isNaN(c.latitude);
  const hasValidLon = typeof c.longitude === 'number' && !Number.isNaN(c.longitude);

  return Boolean(hasValidId && hasValidName && hasValidCountry && hasValidLat && hasValidLon);
}

function loadFavoritesFromStorage(): City[] {
  try {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validated: City[] = [];
    for (const item of parsed) {
      if (isValidCity(item)) {
        validated.push({
          id: Number(item.id),
          name: item.name.trim(),
          region: typeof item.region === 'string' ? item.region : '',
          country: item.country.trim(),
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
        });
        if (validated.length === MAX_FAVORITES) break;
      }
    }
    return validated;
  } catch {
    return [];
  }
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<City[]>(() => loadFavoritesFromStorage());
  const storageAvailable = isStorageAvailable();
  const limitReached = favorites.length >= MAX_FAVORITES;

  // Listen to 'storage' events for multi-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFavorites(loadFavoritesFromStorage());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const isFavorite = useCallback(
    (city: City | null): boolean => {
      if (!city) return false;
      return favorites.some((f) => f.id === city.id);
    },
    [favorites]
  );

  const addFavorite = useCallback(
    (city: City): AddFavoriteResult => {
      if (favorites.some((f) => f.id === city.id)) {
        return { ok: false, reason: 'duplicate' };
      }

      if (favorites.length >= MAX_FAVORITES) {
        return { ok: false, reason: 'limit' };
      }

      const updated = [...favorites, city];
      setFavorites(updated);
      setItem(STORAGE_KEY, JSON.stringify(updated));
      return { ok: true };
    },
    [favorites]
  );

  const removeFavorite = useCallback(
    (id: number) => {
      const updated = favorites.filter((f) => f.id !== id);
      setFavorites(updated);
      setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [favorites]
  );

  return {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    storageAvailable,
    limitReached,
  };
}
