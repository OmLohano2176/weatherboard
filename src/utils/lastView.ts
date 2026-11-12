import { City, WeatherData } from '../types';
import { getItem, setItem } from './storage';

export const LAST_VIEW_KEY = 'weatherboard:last-view';
export const SELECTED_CITY_KEY = 'weatherboard:selected-city';

export interface LastViewedEntry {
  city: City;
  weather: WeatherData;
  savedAt: number;
}

export function saveLastView(city: City, weather: WeatherData): void {
  try {
    const entry: LastViewedEntry = {
      city,
      weather,
      savedAt: Date.now(),
    };
    setItem(LAST_VIEW_KEY, JSON.stringify(entry));
    setItem(SELECTED_CITY_KEY, JSON.stringify(city));
  } catch {
    // Handled safely
  }
}

export function getLastView(): LastViewedEntry | null {
  try {
    const raw = getItem(LAST_VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastViewedEntry;
    if (
      parsed &&
      parsed.city &&
      typeof parsed.city.id !== 'undefined' &&
      parsed.weather &&
      parsed.weather.current &&
      typeof parsed.savedAt === 'number'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function getSavedSelectedCity(): City | null {
  try {
    const raw = getItem(SELECTED_CITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as City;
      if (parsed && typeof parsed.id !== 'undefined') {
        return parsed;
      }
    }
  } catch {
    // Fallback to lastView
  }
  return getLastView()?.city ?? null;
}
