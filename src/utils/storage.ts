/**
 * Safe localStorage wrapper with in-memory fallback.
 * Prevents crashes in private browsing, when storage is blocked, or quota is exceeded.
 */

const memoryStore = new Map<string, string>();

let cachedAvailability: boolean | null = null;

export function isStorageAvailable(): boolean {
  if (cachedAvailability !== null) {
    return cachedAvailability;
  }

  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      cachedAvailability = false;
      return false;
    }

    const testKey = '__weatherboard_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    cachedAvailability = true;
    return true;
  } catch {
    cachedAvailability = false;
    return false;
  }
}

export function getItem(key: string): string | null {
  if (isStorageAvailable()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      // If reading from localStorage threw, fallback to in-memory store
    }
  }
  return memoryStore.get(key) ?? null;
}

export function setItem(key: string, value: string): boolean {
  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      // Storage write failed (e.g. quota exceeded)
    }
  }

  memoryStore.set(key, value);
  return true;
}

export function removeItem(key: string): void {
  if (isStorageAvailable()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore removal failure
    }
  }
  memoryStore.delete(key);
}
