import { WeatherCondition, WeatherData, DailyForecast } from '../types';

export class OwmError extends Error {
  readonly status?: number;
  readonly isNetwork?: boolean;

  constructor(message: string, status?: number, isNetwork = false) {
    super(message);
    this.name = 'OwmError';
    this.status = status;
    this.isNetwork = isNetwork;
  }
}

export function mapOwmCondition(id: number, main?: string): WeatherCondition {
  if (id >= 200 && id < 300) return 'thunderstorm';
  if (id >= 300 && id < 400) return 'drizzle';
  if (id >= 500 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'mist';
  if (id === 800) return 'clear';
  if (id > 800) return 'clouds';

  const m = main?.toLowerCase() || '';
  if (m.includes('thunder')) return 'thunderstorm';
  if (m.includes('drizzle')) return 'drizzle';
  if (m.includes('rain')) return 'rain';
  if (m.includes('snow')) return 'snow';
  if (m.includes('clear')) return 'clear';
  if (m.includes('cloud')) return 'clouds';
  return 'mist';
}

function getMostFrequentCondition(conditions: WeatherCondition[]): WeatherCondition {
  if (conditions.length === 0) return 'clear';
  const counts: Record<string, number> = {};
  for (const c of conditions) {
    counts[c] = (counts[c] || 0) + 1;
  }
  let best = conditions[0];
  let maxCount = 0;
  for (const [c, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      best = c as WeatherCondition;
    }
  }
  return best;
}

interface OwmCurrentResponse {
  weather: Array<{ id: number; main: string; description: string }>;
  main: { temp: number; humidity: number };
  wind: { speed: number }; // m/s
  timezone?: number;
}

interface OwmForecastResponse {
  city: { timezone: number };
  list: Array<{
    dt: number;
    main: { temp: number; temp_min: number; temp_max: number };
    weather: Array<{ id: number; main: string; description: string }>;
  }>;
}

export async function fetchOpenWeatherMap(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WeatherData> {
  const apiKey = import.meta.env.VITE_OWM_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_openweathermap_api_key_here') {
    throw new OwmError('OpenWeatherMap API key is missing or not configured.', 401);
  }

  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey.trim()}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey.trim()}`;

  let currentRes: Response;
  let forecastRes: Response;

  try {
    [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl, { signal }),
      fetch(forecastUrl, { signal }),
    ]);
  } catch (error: unknown) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }
    throw new OwmError(
      (error as Error)?.message || 'Network error reaching OpenWeatherMap',
      undefined,
      true
    );
  }

  if (!currentRes.ok) {
    throw new OwmError(
      `OpenWeatherMap current weather failed with status ${currentRes.status}`,
      currentRes.status
    );
  }

  if (!forecastRes.ok) {
    throw new OwmError(
      `OpenWeatherMap forecast failed with status ${forecastRes.status}`,
      forecastRes.status
    );
  }

  const currentData = (await currentRes.json()) as OwmCurrentResponse;
  const forecastData = (await forecastRes.json()) as OwmForecastResponse;

  // Process Current Weather
  const weatherItem = currentData.weather?.[0] || { id: 800, main: 'Clear', description: 'clear sky' };
  const currentCondition = mapOwmCondition(weatherItem.id, weatherItem.main);
  // Convert wind speed from m/s to km/h (1 m/s = 3.6 km/h)
  const windKmh = Math.round((currentData.wind?.speed ?? 0) * 3.6);

  // Process 5-day Forecast
  // Aggregate 3-hour entries into 5 daily entries using city timezone offset
  const tzOffsetSeconds = forecastData.city?.timezone ?? 0;
  const dayBuckets: Record<
    string,
    { tempsMin: number[]; tempsMax: number[]; conditions: WeatherCondition[] }
  > = {};

  for (const item of forecastData.list || []) {
    // Local date string for the city's timezone
    const localEpochMs = (item.dt + tzOffsetSeconds) * 1000;
    const dateObj = new Date(localEpochMs);
    const dateKey = dateObj.toISOString().slice(0, 10);

    if (!dayBuckets[dateKey]) {
      dayBuckets[dateKey] = { tempsMin: [], tempsMax: [], conditions: [] };
    }

    const itemWeather = item.weather?.[0];
    const itemCond = itemWeather
      ? mapOwmCondition(itemWeather.id, itemWeather.main)
      : 'clear';

    dayBuckets[dateKey].tempsMin.push(item.main.temp_min ?? item.main.temp);
    dayBuckets[dateKey].tempsMax.push(item.main.temp_max ?? item.main.temp);
    dayBuckets[dateKey].conditions.push(itemCond);
  }

  // Sort dates ascending
  const sortedDates = Object.keys(dayBuckets).sort();
  const daily: DailyForecast[] = sortedDates.slice(0, 5).map((date) => {
    const bucket = dayBuckets[date];
    const minC = Math.round(Math.min(...bucket.tempsMin));
    const maxC = Math.round(Math.max(...bucket.tempsMax));
    const condition = getMostFrequentCondition(bucket.conditions);

    return {
      date,
      minC,
      maxC,
      condition,
    };
  });

  return {
    current: {
      tempC: Math.round(currentData.main.temp),
      humidity: currentData.main.humidity,
      windKmh,
      condition: currentCondition,
      description: weatherItem.description,
    },
    daily,
    source: 'openweathermap',
    fetchedAt: Date.now(),
  };
}
