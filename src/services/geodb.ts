import { City, GeoDBErrorCode } from '../types';

export class GeoDBError extends Error {
  readonly code: GeoDBErrorCode;
  readonly status?: number;

  constructor(message: string, code: GeoDBErrorCode, status?: number) {
    super(message);
    this.name = 'GeoDBError';
    this.code = code;
    this.status = status;
  }
}

export class MissingApiKeyError extends GeoDBError {
  constructor(
    message = 'RapidAPI key is not configured. Please set VITE_RAPIDAPI_KEY in your .env file.'
  ) {
    super(message, 'MISSING_API_KEY');
    this.name = 'MissingApiKeyError';
  }
}

export class RateLimitedError extends GeoDBError {
  constructor(
    message = 'Too many searches in a short time. Wait a few seconds and try again.'
  ) {
    super(message, 'RATE_LIMITED', 429);
    this.name = 'RateLimitedError';
  }
}

export class NetworkError extends GeoDBError {
  constructor(
    message = "Can't reach the city search service. Check your internet connection and try again."
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class HttpError extends GeoDBError {
  constructor(status: number, statusText: string) {
    super(`City search service error (${status} ${statusText}).`, 'HTTP_ERROR', status);
    this.name = 'HttpError';
  }
}

interface GeoDBCityResponseItem {
  id: number;
  city?: string;
  name?: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface GeoDBResponse {
  data: GeoDBCityResponseItem[];
}

export async function searchCities(
  query: string,
  signal?: AbortSignal
): Promise<City[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_rapidapi_key_here') {
    throw new MissingApiKeyError();
  }

  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${encodeURIComponent(
    trimmed
  )}&limit=5&sort=-population`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey.trim(),
        'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
      },
      signal,
    });
  } catch (error: unknown) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }
    throw new NetworkError();
  }

  if (response.status === 429) {
    throw new RateLimitedError();
  }

  if (!response.ok) {
    throw new HttpError(response.status, response.statusText);
  }

  try {
    const data = (await response.json()) as GeoDBResponse;
    const items = Array.isArray(data?.data) ? data.data : [];

    return items.map((item) => ({
      id: item.id,
      name: item.name || item.city || '',
      region: item.region || '',
      country: item.country || '',
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
    }));
  } catch (error: unknown) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }
    throw new GeoDBError('Failed to parse city search response.', 'HTTP_ERROR');
  }
}
