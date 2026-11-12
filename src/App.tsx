import { useState } from 'react';
import { City } from './types';
import { CitySearch } from './components/CitySearch';
import './App.css';

export function App() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

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
        <div className="search-section">
          <CitySearch onSelect={setSelectedCity} />

          {selectedCity && (
            <div className="selected-city-card" aria-live="polite">
              <span className="selected-city-badge">Selected Location</span>
              <h2 className="selected-city-name">
                {selectedCity.name}, {selectedCity.country}
              </h2>
              {selectedCity.region && (
                <p className="selected-city-region">{selectedCity.region}</p>
              )}
              <p className="selected-city-coords">
                Lat: {selectedCity.latitude.toFixed(4)}° &bull; Lon: {selectedCity.longitude.toFixed(4)}°
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
