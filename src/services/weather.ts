import { WeatherData } from '../types';
import { fetchOpenWeatherMap, OwmError } from './openweathermap';
import { fetchOpenMeteo, OpenMeteoError } from './openmeteo';

export type WeatherErrorCode = 'NETWORK_OFFLINE' | 'RATE_LIMITED' | 'SERVICES_DOWN';

export class WeatherError extends Error {
  readonly code: WeatherErrorCode;

  constructor(message: string, code: WeatherErrorCode) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
  }
}

export async function getWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WeatherData> {
  let owmError: OwmError | null = null;

  // Try OpenWeatherMap first
  try {
    return await fetchOpenWeatherMap(lat, lon, signal);
  } catch (error: unknown) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }

    owmError =
      error instanceof OwmError
        ? error
        : new OwmError((error as Error)?.message || 'OpenWeatherMap failure');
  }

  // Automatic fallback to Open-Meteo if OWM fails (401, 429, 5xx, missing key, or network)
  let meteoError: OpenMeteoError | null = null;
  try {
    return await fetchOpenMeteo(lat, lon, signal);
  } catch (error: unknown) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }

    meteoError =
      error instanceof OpenMeteoError
        ? error
        : new OpenMeteoError((error as Error)?.message || 'Open-Meteo failure');
  }

  // Both services failed. Determine specific failure reason.
  const isOffline =
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    Boolean(owmError?.isNetwork && meteoError?.isNetwork);

  if (isOffline) {
    throw new WeatherError(
      'You appear to be offline. Reconnect and try again.',
      'NETWORK_OFFLINE'
    );
  }

  const isRateLimited = owmError?.status === 429 || meteoError?.status === 429;
  if (isRateLimited) {
    throw new WeatherError(
      'Rate limit exceeded. Please wait a few seconds and try again.',
      'RATE_LIMITED'
    );
  }

  throw new WeatherError(
    'Both weather services are unavailable right now. Try again in a minute.',
    'SERVICES_DOWN'
  );
}
