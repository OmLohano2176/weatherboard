import React from 'react';
import { WeatherError } from '../services/weather';

export interface WeatherErrorViewProps {
  error: WeatherError | null;
  onRetry: () => void;
}

export const WeatherErrorView: React.FC<WeatherErrorViewProps> = ({ error, onRetry }) => {
  const message =
    error?.message ||
    'Both weather services are unavailable right now. Try again in a minute.';

  return (
    <div className="weather-error-card" role="alert">
      <div className="weather-error-icon" aria-hidden="true">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3 className="weather-error-title">Weather Service Notice</h3>
      <p className="weather-error-message">{message}</p>

      <button type="button" className="weather-retry-btn" onClick={onRetry}>
        Retry Weather
      </button>
    </div>
  );
};
