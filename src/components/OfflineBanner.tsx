import React, { useState, useEffect } from 'react';
import { City } from '../types';
import './OfflineBanner.css';

export interface OfflineBannerProps {
  isOnline: boolean;
  cachedCity?: City | null;
  savedAt?: number | null;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  cachedCity,
  savedAt,
}) => {
  // Periodically refresh relative time string
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isOnline) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [isOnline]);

  if (isOnline) {
    return null;
  }

  const message =
    cachedCity && savedAt
      ? `You're offline. Showing the last saved weather for ${cachedCity.name}, updated ${formatRelativeTime(
          savedAt
        )}.`
      : "You're offline. Connect to the internet to search for a city.";

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <div className="offline-banner-content">
        <svg
          className="offline-banner-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span className="offline-banner-text">{message}</span>
      </div>
    </div>
  );
};
