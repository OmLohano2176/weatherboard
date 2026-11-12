import React from 'react';

export const WeatherSkeleton: React.FC = () => {
  return (
    <div
      className="weather-display-container skeleton-container"
      aria-label="Loading weather data"
      aria-busy="true"
    >
      {/* Current Weather Card Skeleton */}
      <div className="skeleton-current-card">
        <div>
          <div className="skeleton-box skeleton-line-title" />
          <div className="skeleton-box skeleton-line-sub" />
        </div>

        <div className="skeleton-temp-row">
          <div className="skeleton-box skeleton-icon-box" />
          <div className="skeleton-box skeleton-temp-box" />
        </div>

        <div className="skeleton-metrics-row">
          <div className="skeleton-box skeleton-metric-box" />
          <div className="skeleton-box skeleton-metric-box" />
        </div>
      </div>

      {/* 5-Day Forecast Skeleton */}
      <div className="forecast-section">
        <div className="skeleton-box" style={{ width: '130px', height: '22px' }} />
        <div className="skeleton-forecast-grid">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="skeleton-forecast-card">
              <div className="skeleton-box skeleton-forecast-day" />
              <div className="skeleton-box skeleton-forecast-icon" />
              <div className="skeleton-box skeleton-forecast-temp" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
