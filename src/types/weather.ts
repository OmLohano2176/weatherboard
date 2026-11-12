export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist';

export interface CurrentWeather {
  tempC: number;
  humidity: number;
  windKmh: number;
  condition: WeatherCondition;
  description: string;
}

export interface DailyForecast {
  date: string;
  minC: number;
  maxC: number;
  condition: WeatherCondition;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  source: 'openweathermap' | 'open-meteo';
  fetchedAt: number;
}
