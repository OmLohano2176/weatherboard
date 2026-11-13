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
      {/* Top Header: Location, Badges, and Star */}
      <div className="current-weather-header">
        <div className="current-location-group">
          <div className="current-city-title-row">
            <h2 className="current-city-title">
              {cityName}, {country}
            </h2>
          </div>

          <div className="current-meta-pills">
            <span className="current-meta-pill subtitle-pill">Current Conditions</span>
            {isCached && (
              <span className="current-meta-pill cached-pill" aria-label="Cached data">
                Cached
              </span>
            )}
            {lastUpdated && (
              <span className="current-meta-pill updated-pill">
                Updated {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {favoriteAction && <div className="current-favorite-slot">{favoriteAction}</div>}
      </div>

      {/* Hero Display: Large Tabular Temperature + 96-120px Weather Icon */}
      <div className="current-weather-hero">
        <div className="current-temp-block">
          <div className="current-temp-numeric tabular-nums">
            <span className="temp-value">{Math.round(current.tempC)}</span>
            <span className="temp-unit" aria-hidden="true">°C</span>
          </div>
          <p className="current-condition-description">{current.description}</p>
        </div>

        <div className="current-icon-container" aria-hidden="true">
          <WeatherIcon condition={current.condition} size={104} />
        </div>
      </div>

      {/* 2-Up Detail Tiles: Humidity & Wind */}
      <div className="current-weather-metrics">
        <div className="metric-tile">
          <div className="metric-tile-header">
            <span className="metric-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
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
            <span className="metric-label">Humidity</span>
          </div>
          <span className="metric-value tabular-nums">{current.humidity}%</span>
        </div>

        <div className="metric-tile">
          <div className="metric-tile-header">
            <span className="metric-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
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
            <span className="metric-label">Wind Speed</span>
          </div>
          <span className="metric-value tabular-nums">{Math.round(current.windKmh)} km/h</span>
        </div>
      </div>

      {/* Attribution Footer */}
      <div className="current-weather-footer">
        <span className="weather-source-text">{sourceText}</span>
      </div>
    </section>
  );
};
