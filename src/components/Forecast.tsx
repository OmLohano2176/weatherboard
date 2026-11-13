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
  // Compute overall min and max across all 5 days for the relative comparative range bars
  const overallMin = daily.length > 0 ? Math.min(...daily.map((d) => d.minC)) : 0;
  const overallMax = daily.length > 0 ? Math.max(...daily.map((d) => d.maxC)) : 0;
  const rangeSpan = Math.max(1, overallMax - overallMin);

  return (
    <section className="forecast-section" aria-label="5-Day Weather Forecast">
      <div className="forecast-header">
        <h3 className="forecast-heading">5-Day Forecast</h3>
      </div>

      <div className="forecast-scroll-container">
        <div className="forecast-grid" role="list">
          {daily.map((day, index) => {
            const weekday = getDayName(day.date, index);
            const isToday = index === 0;

            // Calculate comparative bar positioning
            const leftPct = Math.round(((day.minC - overallMin) / rangeSpan) * 100);
            const widthPct = Math.max(10, Math.round(((day.maxC - day.minC) / rangeSpan) * 100));

            return (
              <div
                key={`${day.date}-${index}`}
                className={`forecast-card ${isToday ? 'is-today' : ''}`}
                style={{ '--i': index } as React.CSSProperties}
                tabIndex={0}
                role="listitem"
                aria-label={`${weekday}: High ${day.maxC} degrees, Low ${day.minC} degrees, ${day.condition}`}
              >
                <span className={`forecast-weekday ${isToday ? 'is-today' : ''}`}>
                  {weekday}
                </span>

                <div className="forecast-icon-wrapper" aria-hidden="true">
                  <WeatherIcon condition={day.condition} size={36} />
                </div>

                <div className="forecast-temps">
                  <span className="forecast-high tabular-nums">{day.maxC}°</span>
                  <span className="forecast-low tabular-nums">{day.minC}°</span>
                </div>

                {/* Comparative Horizontal Range Bar */}
                <div
                  className="forecast-range-track"
                  aria-hidden="true"
                  title={`Range: ${day.minC}° to ${day.maxC}° (Week: ${overallMin}° to ${overallMax}°)`}
                >
                  <div
                    className="forecast-range-fill"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.min(100 - leftPct, widthPct)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
