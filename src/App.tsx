import './App.css';

export function App() {
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
        <section className="placeholder-card">
          <h2>WeatherBoard Dashboard</h2>
          <p>Application shell initialized. Ready for weather modules and features.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
