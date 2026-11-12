import React from 'react';
import { CurrentWeather as CurrentWeatherType } from '../types';
import { WeatherIcon } from './WeatherIcon';

export interface CurrentWeatherProps {
  current: CurrentWeatherType;
  source: 'openweathermap' | 'open-meteo';
  cityName: string;
  country: string;
  favoriteAction?: React.ReactNode;
  isCached?: boolean;
  lastUpdated?: number | null;
}

function formatLastUpdated(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
}

export const CurrentWeather: React.FC<CurrentWeatherProps> = ({
  current,
  source,
  cityName,
  country,
  favoriteAction,
  isCached = false,
  lastUpdated = null,
}) => {
  const sourceText =
    source === 'openweathermap'
      ? 'Data from OpenWeatherMap'
      : 'Data from Open-Meteo (backup source)';

  return (
    <section className="current-weather-card" aria-label="Current Weather">
      <div className="current-weather-header">
        <div>
          <div className="current-city-title-row">
            <h2 className="current-city-title">
              {cityName}, {country}
            </h2>
            {isCached && (
              <span className="weather-cached-badge" aria-label="Cached data">
                Cached
              </span>
            )}
          </div>
          <div className="current-city-meta">
            <span className="current-city-subtitle">Current Weather</span>
            {lastUpdated && (
              <span className="weather-last-updated">
                &bull; Last updated {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
        </div>
        {favoriteAction}
      </div>

      <div className="current-weather-main">
        <div className="current-temp-group">
          <WeatherIcon condition={current.condition} size={54} />
          <div>
            <span className="current-temp-val">{Math.round(current.tempC)}</span>
            <span className="current-temp-unit">°C</span>
          </div>
        </div>

        <div className="current-condition-info">
          <div className="current-condition-badge">
            <span>{current.description}</span>
          </div>
        </div>
      </div>

      <div className="current-weather-metrics">
        <div className="metric-item">
          <span className="metric-icon" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </span>
          <div className="metric-data">
            <span className="metric-label">Humidity</span>
            <span className="metric-value">{current.humidity}%</span>
          </div>
        </div>

        <div className="metric-item">
          <span className="metric-icon" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
            </svg>
          </span>
          <div className="metric-data">
            <span className="metric-label">Wind Speed</span>
            <span className="metric-value">{Math.round(current.windKmh)} km/h</span>
          </div>
        </div>
      </div>

      <div className="current-weather-footer">
        <span className="weather-source-text">{sourceText}</span>
      </div>
    </section>
  );
};
