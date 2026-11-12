import { WeatherCondition, WeatherData, DailyForecast } from '../types';

export class OpenMeteoError extends Error {
  readonly status?: number;
  readonly isNetwork?: boolean;

  constructor(message: string, status?: number, isNetwork = false) {
    super(message);
    this.name = 'OpenMeteoError';
    this.status = status;
    this.isNetwork = isNetwork;
  }
}

export function mapWmoCodeToCondition(code: number): WeatherCondition {
  switch (code) {
    case 0:
    case 1:
      return 'clear';
    case 2:
    case 3:
      return 'clouds';
    case 45:
    case 48:
      return 'mist';
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return 'drizzle';
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return 'rain';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return 'snow';
    case 95:
    case 96:
    case 99:
      return 'thunderstorm';
    default:
      return 'clouds';
  }
}

export function getWmoDescription(code: number): string {
  switch (code) {
    case 0:
      return 'Clear sky';
    case 1:
      return 'Mainly clear';
    case 2:
      return 'Partly cloudy';
    case 3:
      return 'Overcast';
    case 45:
      return 'Foggy';
    case 48:
      return 'Depositing rime fog';
    case 51:
      return 'Light drizzle';
    case 53:
      return 'Moderate drizzle';
    case 55:
      return 'Dense drizzle';
    case 56:
    case 57:
      return 'Freezing drizzle';
    case 61:
      return 'Slight rain';
    case 63:
      return 'Moderate rain';
    case 65:
      return 'Heavy rain';
    case 66:
    case 67:
      return 'Freezing rain';
    case 71:
      return 'Slight snow fall';
    case 73:
      return 'Moderate snow fall';
    case 75:
      return 'Heavy snow fall';
    case 77:
      return 'Snow grains';
    case 80:
      return 'Slight rain showers';
    case 81:
      return 'Moderate rain showers';
    case 82:
      return 'Violent rain showers';
    case 85:
      return 'Slight snow showers';
    case 86:
      return 'Heavy snow showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Thunderstorm with hail';
    default:
      return 'Partly cloudy';
  }
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number; // km/h
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error: unknown) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }
    throw new OpenMeteoError(
      (error as Error)?.message || 'Network error reaching Open-Meteo',
      undefined,
      true
    );
  }

  if (!response.ok) {
    throw new OpenMeteoError(
      `Open-Meteo request failed with status ${response.status}`,
      response.status
    );
  }

  const data = (await response.json()) as OpenMeteoResponse;

  const currentCondition = mapWmoCodeToCondition(data.current.weather_code);
  const currentDesc = getWmoDescription(data.current.weather_code);

  const daily: DailyForecast[] = (data.daily?.time || []).slice(0, 5).map((date, index) => ({
    date,
    minC: Math.round(data.daily.temperature_2m_min[index]),
    maxC: Math.round(data.daily.temperature_2m_max[index]),
    condition: mapWmoCodeToCondition(data.daily.weather_code[index]),
  }));

  return {
    current: {
      tempC: Math.round(data.current.temperature_2m),
      humidity: Math.round(data.current.relative_humidity_2m),
      windKmh: Math.round(data.current.wind_speed_10m),
      condition: currentCondition,
      description: currentDesc,
    },
    daily,
    source: 'open-meteo',
    fetchedAt: Date.now(),
  };
}
