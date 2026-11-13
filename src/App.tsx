import { useState, useEffect } from 'react';
import { City } from './types';
import { CitySearch } from './components/CitySearch';
import { CurrentWeather } from './components/CurrentWeather';
import { Forecast } from './components/Forecast';
import { WeatherSkeleton } from './components/WeatherSkeleton';
import { WeatherErrorView } from './components/WeatherErrorView';
import { FavoritesPanel } from './components/FavoritesPanel';
import { FavoriteButton } from './components/FavoriteButton';
import { OfflineBanner } from './components/OfflineBanner';
import { ReminderSettings } from './components/ReminderSettings';
import { WeatherIcon } from './components/WeatherIcon';
import { useWeather } from './hooks/useWeather';
import { useFavorites } from './hooks/useFavorites';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { getSavedSelectedCity, getLastView } from './utils/lastView';
import { saveSelectedCityToCache } from './utils/prefs';
import './components/Weather.css';
import './components/Favorites.css';
import './App.css';

export function App() {
  const isOnline = useOnlineStatus();
  const { canInstall, install } = useInstallPrompt();
  const lastView = getLastView();

  // Restore last-viewed city on initial boot if available
  const [selectedCity, setSelectedCity] = useState<City | null>(() => {
    return getSavedSelectedCity();
  });

  // Progressive enhancement: startViewTransition when changing selected city
  const handleSelectCity = (city: City | null) => {
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(() => {
        setSelectedCity(city);
      });
    } else {
      setSelectedCity(city);
    }
  };

  // Sync selected city with Cache API so Service Worker can read it on push notifications
  useEffect(() => {
    saveSelectedCityToCache(selectedCity);
  }, [selectedCity]);

  const {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    storageAvailable,
    limitReached,
  } = useFavorites();

  const {
    data: weatherData,
    status: weatherStatus,
    error: weatherError,
    isCached,
    lastUpdated,
    retry: retryWeather,
  } = useWeather(selectedCity, isOnline);

  const activeCondition = weatherData?.current?.condition || 'neutral';

  return (
    <div className="app-shell" data-condition={activeCondition}>
      {/* Ambient drifting condition-reactive background blobs (max 2 elements) */}
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />
      </div>

      <OfflineBanner
        isOnline={isOnline}
        cachedCity={lastView?.city}
        savedAt={lastView?.savedAt}
      />

      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-icon" aria-hidden="true">
              W
            </div>
            <h1 className="brand-name">WeatherBoard</h1>
          </div>

          <div className="header-status-group">
            {canInstall && (
              <button
                type="button"
                className="install-app-btn"
                onClick={install}
                aria-label="Install app"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Install app</span>
              </button>
            )}
            <div
              className={`status-pill ${isOnline ? 'is-online' : 'is-offline'}`}
              role="status"
              aria-label={isOnline ? 'Network status: Online' : 'Network status: Offline'}
              title={isOnline ? 'Online' : 'Offline'}
            >
              <span className="status-dot" aria-hidden="true" />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-grid">
          {/* Primary Column (Search + Weather / Forecast / Empty State) */}
          <div className="dashboard-primary">
            <div className="search-section">
              <CitySearch onSelect={handleSelectCity} isOnline={isOnline} />
            </div>

            <div className="weather-section" aria-live="polite">
              {!selectedCity && (
                <section className="empty-hero-card" aria-label="Welcome to WeatherBoard">
                  <div className="empty-icons-cluster" aria-hidden="true">
                    <div className="empty-icon-bubble">
                      <WeatherIcon condition="rain" size={24} />
                    </div>
                    <div className="empty-icon-bubble primary">
                      <WeatherIcon condition="clear" size={34} />
                    </div>
                    <div className="empty-icon-bubble">
                      <WeatherIcon condition="clouds" size={24} />
                    </div>
                  </div>
                  <h2 className="empty-hero-heading">Explore live weather worldwide</h2>
                  <p className="empty-hero-text">
                    Search for a city above or tap a saved favourite to view live conditions and 5-day
                    forecasts.
                  </p>
                </section>
              )}

              {selectedCity && weatherStatus === 'loading' && <WeatherSkeleton />}

              {selectedCity && weatherStatus === 'error' && (
                <WeatherErrorView error={weatherError} onRetry={retryWeather} />
              )}

              {selectedCity && weatherStatus === 'success' && weatherData && (
                <div className="weather-display-container" key={selectedCity.id}>
                  <CurrentWeather
                    current={weatherData.current}
                    source={weatherData.source}
                    cityName={selectedCity.name}
                    country={selectedCity.country}
                    isCached={isCached}
                    lastUpdated={lastUpdated}
                    favoriteAction={
                      <FavoriteButton
                        city={selectedCity}
                        isFavorite={isFavorite(selectedCity)}
                        onAdd={addFavorite}
                        onRemove={removeFavorite}
                        limitReached={limitReached}
                      />
                    }
                  />
                  <Forecast daily={weatherData.daily} />
                </div>
              )}
            </div>
          </div>

          {/* Secondary Column (Sticky Favourites Panel + Daily Reminder Settings) */}
          <div className="dashboard-secondary">
            <FavoritesPanel
              favorites={favorites}
              selectedCity={selectedCity}
              onSelectCity={handleSelectCity}
              onRemoveFavorite={removeFavorite}
              storageAvailable={storageAvailable}
            />
            <ReminderSettings isOnline={isOnline} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
