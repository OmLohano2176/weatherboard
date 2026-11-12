export interface City {
  id: number;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

export type CitySearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type GeoDBErrorCode =
  | 'MISSING_API_KEY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR';

export * from './weather';
