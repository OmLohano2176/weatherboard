import React from 'react';
import { WeatherCondition } from '../types';

export interface WeatherIconProps {
  condition: WeatherCondition;
  size?: number;
  className?: string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  condition,
  size = 28,
  className = '',
}) => {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `weather-icon weather-icon-${condition} ${className}`,
    'aria-hidden': true,
  };

  switch (condition) {
    case 'clear':
      return (
        <svg {...commonProps} stroke="#f59e0b" fill="#f59e0b" fillOpacity="0.15">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );

    case 'clouds':
      return (
        <svg {...commonProps} stroke="#94a3b8" fill="#94a3b8" fillOpacity="0.2">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      );

    case 'drizzle':
      return (
        <svg {...commonProps} stroke="#38bdf8">
          <path
            d="M17.5 16H9a6 6 0 1 1 5.75-7.75A4 4 0 1 1 17.5 16Z"
            fill="#38bdf8"
            fillOpacity="0.15"
          />
          <line x1="8" y1="19" x2="8" y2="21" />
          <line x1="12" y1="19" x2="12" y2="21" />
          <line x1="16" y1="19" x2="16" y2="21" />
        </svg>
      );

    case 'rain':
      return (
        <svg {...commonProps} stroke="#38bdf8">
          <path
            d="M17.5 15H9a6 6 0 1 1 5.75-7.75A4 4 0 1 1 17.5 15Z"
            fill="#38bdf8"
            fillOpacity="0.2"
          />
          <line x1="8" y1="17" x2="7" y2="21" />
          <line x1="12" y1="17" x2="11" y2="21" />
          <line x1="16" y1="17" x2="15" y2="21" />
        </svg>
      );

    case 'thunderstorm':
      return (
        <svg {...commonProps} stroke="#f59e0b">
          <path
            d="M17.5 14H9a6 6 0 1 1 5.75-7.75A4 4 0 1 1 17.5 14Z"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity="0.2"
          />
          <polygon points="13 14 10 19 13 19 11 23 16 17 13 17 13 14" fill="#f59e0b" />
        </svg>
      );

    case 'snow':
      return (
        <svg {...commonProps} stroke="#e2e8f0">
          <path
            d="M17.5 15H9a6 6 0 1 1 5.75-7.75A4 4 0 1 1 17.5 15Z"
            fill="#e2e8f0"
            fillOpacity="0.15"
          />
          <circle cx="8" cy="19" r="1" fill="#e2e8f0" />
          <circle cx="12" cy="19" r="1" fill="#e2e8f0" />
          <circle cx="16" cy="19" r="1" fill="#e2e8f0" />
          <circle cx="10" cy="22" r="1" fill="#e2e8f0" />
          <circle cx="14" cy="22" r="1" fill="#e2e8f0" />
        </svg>
      );

    case 'mist':
      return (
        <svg {...commonProps} stroke="#94a3b8">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="6" y1="11" x2="18" y2="11" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="7" y1="19" x2="17" y2="19" />
        </svg>
      );

    default:
      return (
        <svg {...commonProps} stroke="#94a3b8">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};
