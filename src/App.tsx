import { useState } from 'react';
import { City } from './types';
import { CitySearch } from './components/CitySearch';
import { CurrentWeather } from './components/CurrentWeather';
import { Forecast } from './components/Forecast';
import { WeatherSkeleton } from './components/WeatherSkeleton';
import { WeatherErrorView } from './components/WeatherErrorView';
import { useWeather } from './hooks/useWeather';
import './components/Weather.css';
import './App.css';

export function App() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const {
    data: weatherData,
    status: weatherStatus,
    error: weatherError,
    retry: retryWeather,
  } = useWeather(selectedCity);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-icon" aria-hidden="true">
              W
            </div>
            <h1 className="brand-name">WeatherBoard</h1>
          </div>
          <span className="brand-tag">PWA</span>
        </div>
      </header>

      <main className="app-main">
        <div className="weather-app-content">
          <div className="search-section">
            <CitySearch onSelect={setSelectedCity} />
          </div>

          <div className="weather-section" aria-live="polite">
            {!selectedCity && (
              <section className="initial-hint-card">
                <h2>Welcome to WeatherBoard</h2>
                <p>Search for a city above to see live weather and a 5-day forecast.</p>
              </section>
            )}

            {selectedCity && weatherStatus === 'loading' && <WeatherSkeleton />}

            {selectedCity && weatherStatus === 'error' && (
              <WeatherErrorView error={weatherError} onRetry={retryWeather} />
            )}

            {selectedCity && weatherStatus === 'success' && weatherData && (
              <div className="weather-display-container">
                <CurrentWeather
                  current={weatherData.current}
                  source={weatherData.source}
                  cityName={selectedCity.name}
                  country={selectedCity.country}
                />
                <Forecast daily={weatherData.daily} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
