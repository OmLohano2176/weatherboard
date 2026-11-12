import React from 'react';
import { DailyForecast } from '../types';
import { WeatherIcon } from './WeatherIcon';

export interface ForecastProps {
  daily: DailyForecast[];
}

function getDayName(dateString: string, index: number): string {
  if (index === 0) return 'Today';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
  } catch {
    // fallback
  }
  return dateString;
}

export const Forecast: React.FC<ForecastProps> = ({ daily }) => {
  return (
    <section className="forecast-section" aria-label="5-Day Weather Forecast">
      <h3 className="forecast-heading">5-Day Forecast</h3>
      <div className="forecast-grid">
        {daily.map((day, index) => {
          const weekday = getDayName(day.date, index);
          const isToday = index === 0;

          return (
            <div
              key={`${day.date}-${index}`}
              className="forecast-card"
              tabIndex={0}
              role="article"
              aria-label={`${weekday}: High ${day.maxC} degrees, Low ${day.minC} degrees, ${day.condition}`}
            >
              <span className={`forecast-weekday ${isToday ? 'is-today' : ''}`}>
                {weekday}
              </span>

              <div className="forecast-icon-wrapper">
                <WeatherIcon condition={day.condition} size={32} />
              </div>

              <div className="forecast-temps">
                <span className="forecast-high">{day.maxC}°</span>
                <span className="forecast-low">/ {day.minC}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
