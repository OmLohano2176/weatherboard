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
          <circle className="sun-body" cx="12" cy="12" r="5" />
          <g className="sun-rays">
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </g>
        </svg>
      );

    case 'clouds':
      return (
        <svg {...commonProps} stroke="#818cf8" fill="#818cf8">
          <path
            className="cloud-back"
            d="M19 16.5H9a5 5 0 1 1 4.9-6.3A3.5 3.5 0 0 1 19 16.5Z"
            stroke="#64748b"
            fill="#64748b"
            fillOpacity="0.25"
          />
          <path
            className="cloud-front"
            d="M17.5 19H7a5 5 0 1 1 4.8-6.3A3.5 3.5 0 0 1 17.5 19Z"
            stroke="#818cf8"
            fill="#818cf8"
            fillOpacity="0.3"
          />
        </svg>
      );

    case 'drizzle':
      return (
        <svg {...commonProps} stroke="#2dd4bf">
          <path
            className="cloud-base"
            d="M17.5 15H9a5 5 0 1 1 4.8-6.3A3.5 3.5 0 0 1 17.5 15Z"
            fill="#2dd4bf"
            fillOpacity="0.15"
          />
          <line className="rain-drop drop-1" x1="8" y1="18" x2="8" y2="21" />
          <line className="rain-drop drop-2" x1="12" y1="18" x2="12" y2="21" />
          <line className="rain-drop drop-3" x1="16" y1="18" x2="16" y2="21" />
        </svg>
      );

    case 'rain':
      return (
        <svg {...commonProps} stroke="#38bdf8">
          <path
            className="cloud-base"
            d="M17.5 14H9a5 5 0 1 1 4.8-6.3A3.5 3.5 0 0 1 17.5 14Z"
            fill="#38bdf8"
            fillOpacity="0.2"
          />
          <line className="rain-drop drop-1" x1="7" y1="16" x2="6" y2="20" />
          <line className="rain-drop drop-2" x1="11" y1="16" x2="10" y2="20" />
          <line className="rain-drop drop-3" x1="15" y1="16" x2="14" y2="20" />
          <line className="rain-drop drop-4" x1="19" y1="16" x2="18" y2="20" />
        </svg>
      );

    case 'thunderstorm':
      return (
        <svg {...commonProps} stroke="#c084fc">
          <path
            className="cloud-base"
            d="M17.5 13H9a5 5 0 1 1 4.8-6.3A3.5 3.5 0 0 1 17.5 13Z"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity="0.2"
          />
          <line className="rain-drop drop-1" x1="8" y1="16" x2="7" y2="20" stroke="#38bdf8" />
          <line className="rain-drop drop-2" x1="17" y1="16" x2="16" y2="20" stroke="#38bdf8" />
          <polygon
            className="lightning-bolt"
            points="13 13 10 18 13 18 11 22 16 16 13 16 13 13"
            fill="#c084fc"
          />
        </svg>
      );

    case 'snow':
      return (
        <svg {...commonProps} stroke="#bae6fd">
          <path
            className="cloud-base"
            d="M17.5 14H9a5 5 0 1 1 4.8-6.3A3.5 3.5 0 0 1 17.5 14Z"
            fill="#bae6fd"
            fillOpacity="0.15"
          />
          <circle className="snow-flake flake-1" cx="8" cy="18" r="1.2" fill="#bae6fd" />
          <circle className="snow-flake flake-2" cx="12" cy="18" r="1.2" fill="#bae6fd" />
          <circle className="snow-flake flake-3" cx="16" cy="18" r="1.2" fill="#bae6fd" />
          <circle className="snow-flake flake-4" cx="10" cy="21" r="1" fill="#bae6fd" />
          <circle className="snow-flake flake-5" cx="14" cy="21" r="1" fill="#bae6fd" />
        </svg>
      );

    case 'mist':
      return (
        <svg {...commonProps} stroke="#94d2bd">
          <line className="mist-line mist-1" x1="4" y1="7" x2="20" y2="7" />
          <line className="mist-line mist-2" x1="6" y1="11" x2="18" y2="11" />
          <line className="mist-line mist-3" x1="4" y1="15" x2="20" y2="15" />
          <line className="mist-line mist-4" x1="7" y1="19" x2="17" y2="19" />
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
