# Prompt History

**IDE used:** Google Antigravity (VS Code extension)
**Project:** WeatherBoard – Edspire Frontend Challenge

---

## Prompt 1: Project scaffolding
**Model:** Gemini 3.8 Flash (Medium)

```
Scaffold a new React + TypeScript app in the current folder using Vite.

IMPORTANT: The folder already contains .gitignore and PROMPTS.md. Do not delete or overwrite them. If .gitignore needs additions, append to it. Do not touch PROMPTS.md.

Requirements:
- Use vite-plugin-pwa with the injectManifest strategy (I will write a custom service worker later for push notifications and runtime caching). Create a minimal src/sw.ts placeholder and register it.
- Add a valid web manifest: name "WeatherBoard", short_name "WeatherBoard", display "standalone", theme_color and background_color, and placeholder 192x192 and 512x512 icons in /public.
- Folder structure: src/components, src/hooks, src/services (API clients), src/utils, src/types.
- Use plain CSS modules or a single global stylesheet with CSS variables for colors, spacing and typography. Do not add a UI component library.
- Environment variables via .env.example with VITE_OWM_API_KEY and VITE_RAPIDAPI_KEY. Make sure .env is listed in .gitignore.
- Add a minimal responsive App shell (header + main) with no features yet.
- Do not implement any weather, search or favourites logic yet.

When done, tell me the commands to run, and list every file you created.
```

### Result
_(Fill in after running: what worked, what the agent got wrong, and what fixed manually.)_

---
## Prompt 2: City search with autocomplete
**Model:** Gemini 3.8 Flash (Medium)

```
Build the city search with live autocomplete. Do not build any weather display yet.

API: GeoDB Cities via RapidAPI.
- Endpoint: https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=<query>&limit=5&sort=-population
- Headers: X-RapidAPI-Key (from import.meta.env.VITE_RAPIDAPI_KEY) and X-RapidAPI-Host: wft-geo-db.p.rapidapi.com
- The free tier allows about 1 request per second, so respect that.

Requirements:
1. src/services/geodb.ts: a typed searchCities(query, signal) function returning { id, name, region, country, latitude, longitude }[]. Throw typed errors that distinguish: missing API key, rate limited (HTTP 429), network failure, and other HTTP errors.
2. src/hooks/useDebounce.ts: generic debounce hook. Use a 300 ms delay.
3. src/hooks/useCitySearch.ts: holds the query, status ('idle' | 'loading' | 'success' | 'empty' | 'error') and results. Only search when the trimmed query has 2+ characters. Cancel in-flight requests with AbortController so stale responses never overwrite newer ones.
4. src/components/CitySearch.tsx: an accessible combobox (role="combobox", aria-expanded, aria-activedescendant, role="listbox" / "option"). Keyboard support: arrow keys, Enter to select, Escape to close. Clicking outside closes the list.
5. Visible UI states, each with specific user-facing text:
   - loading: spinner inside the dropdown
   - empty: 'No cities found for "<query>". Check the spelling or try a larger nearby city.'
   - network failure: "Can't reach the city search service. Check your internet connection and try again." with a Retry button
   - rate limited: "Too many searches in a short time. Wait a few seconds and try again."
   - missing key: a clear developer-facing message telling me to set VITE_RAPIDAPI_KEY in .env
6. Validation: validate on blur as well as on submit. If the field is empty, show the inline error "Enter a city name to search." with aria-invalid and aria-describedby. Clear the error as soon as the user types.
7. Selecting a suggestion calls an onSelect(city) prop. In App.tsx, keep the selected city in state and show its name and country below the search box as a placeholder.
8. Mobile: input and each suggestion at least 44px tall. No horizontal scroll at 375px.
9. Use the existing CSS variables in index.css. Do not add dependencies.

Show me which files you created or changed.
```

### Result
_Worked after I created .env (agent’s code was correct; I initially put the key in .env.example by mistake and reverted it)_

---

## Prompt 3: Weather display with fallback
**Model:** Gemini 3.8 Flash (Medium)

```
Add real weather data for the selected city: current conditions plus a 5-day forecast. Do not build favourites, notifications or offline features yet.

Primary source: OpenWeatherMap free tier, using latitude/longitude from the selected city.
- Current: https://api.openweathermap.org/data/2.5/weather?lat=<lat>&lon=<lon>&units=metric&appid=<key>
- Forecast (3-hour steps): https://api.openweathermap.org/data/2.5/forecast?lat=<lat>&lon=<lon>&units=metric&appid=<key>
- Key from import.meta.env.VITE_OWM_API_KEY

Fallback source: Open-Meteo (no key).
- https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5

Requirements:
1. src/types/weather.ts: one provider-independent type, WeatherData = { current: { tempC, humidity, windKmh, condition, description }, daily: { date, minC, maxC, condition }[5], source: 'openweathermap' | 'open-meteo', fetchedAt: number }. condition is a small union such as 'clear' | 'clouds' | 'rain' | 'drizzle' | 'thunderstorm' | 'snow' | 'mist'.
2. src/services/openweathermap.ts: fetch current and forecast in parallel. Aggregate the 3-hour forecast entries into 5 daily entries (min and max temperature per local date, using the city's timezone offset, and the most frequent condition as the day's condition). Convert wind from m/s to km/h. Map OWM condition groups to the condition union.
3. src/services/openmeteo.ts: same output shape. Map WMO weather codes to the condition union.
4. src/services/weather.ts: getWeather(lat, lon, signal). Try OpenWeatherMap first. If it fails with 401 (key invalid or not yet activated), 429, a 5xx error or a missing key, automatically fall back to Open-Meteo. If both fail, throw a typed error that says which failure happened (network offline, rate limited, both services down). Never return mocked data.
5. src/hooks/useWeather.ts: takes the selected city and returns { data, status: 'idle' | 'loading' | 'success' | 'error', error, retry }. Cancel in-flight requests with AbortController when the city changes.
6. src/components/WeatherIcon.tsx: inline SVG or CSS icons for each condition. Do not use remote image URLs, because they must work offline later.
7. src/components/CurrentWeather.tsx: large temperature, condition icon and description, humidity and wind speed. Small footer text: "Data from OpenWeatherMap" or "Data from Open-Meteo (backup source)".
8. src/components/Forecast.tsx: 5 day cards showing weekday, icon, and high/low.
9. Loading state: skeleton placeholders matching the final layout, not a bare spinner.
10. Error state: a specific message plus a Retry button. Examples: "You appear to be offline. Reconnect and try again." and "Both weather services are unavailable right now. Try again in a minute." Never show "Something went wrong".
11. Wire into App.tsx: when a city is selected, show CurrentWeather and Forecast below the search box.
12. Layout: forecast cards in a row on desktop (1280px) and tablet (768px), horizontally stacked or a 2-column grid on mobile (375px) with no horizontal page scroll. Touch targets at least 44px.
13. Use the existing CSS variables. Do not add dependencies.

Show me which files you created or changed.
```

### Result
_(Fill in after testing.)_

---
## Prompt 4: Favourite cities
**Model:** Gemini 3.8 Flash (Medium)

```
Add favourite cities. Do not touch the weather services or the search logic, and do not build offline or notification features yet.

Requirements:
1. src/utils/storage.ts: a safe storage wrapper around localStorage. Wrap every read and write in try/catch. Export isStorageAvailable() (test by writing and removing a key). If storage is unavailable (private mode, blocked, quota exceeded), fall back to an in-memory store for the session instead of crashing.
2. src/hooks/useFavorites.ts:
   - Stores up to 5 City objects under the key "weatherboard:favorites".
   - On load, JSON.parse inside try/catch and validate the shape of each item (id, name, country, latitude and longitude as numbers). Drop invalid entries and never crash on corrupted data.
   - Returns { favorites, isFavorite(city), addFavorite(city), removeFavorite(id), storageAvailable, limitReached }.
   - addFavorite returns a result object, not just void: { ok: true } or { ok: false, reason: 'limit' | 'duplicate' }. Prevent duplicates by city id.
   - Sync across browser tabs using the "storage" event.
3. src/components/FavoriteButton.tsx: a star toggle button on the weather card for the selected city. aria-pressed, an accessible label ("Add Karachi to favourites" / "Remove Karachi from favourites"), minimum 44x44px. When the limit is reached, show the inline message "You can save up to 5 favourite cities. Remove one to add another."
4. src/components/FavoritesPanel.tsx: a quick-access panel listing saved cities. Clicking a city selects it and loads its weather. Each item has a remove button (minimum 44x44px, aria-label "Remove <city> from favourites"). Empty state: a helpful message such as "No favourites yet. Search for a city and tap the star to save it here."
5. Confirmation before removal: use a native <dialog> element (or an accessible modal with focus trap) with the text "Remove <city> from favourites?", plus Cancel and Remove buttons. Escape cancels. Focus returns to the triggering element afterwards. Do not use window.confirm.
6. Graceful degradation: if storageAvailable is false, show a non-blocking notice such as "Favourites can't be saved on this device and will be cleared when you close the tab." Everything else keeps working.
7. Layout: on desktop and tablet the favourites panel sits beside or below the search; on mobile (375px) it is a horizontally scrollable chip row inside its own overflow-x container, with no page-level horizontal scroll.
8. Selecting a city from the panel must update the same selected-city state used by the search, so the weather, forecast and star all update.
9. Use the existing CSS variables. Do not add dependencies.

Show me which files you created or changed.
```

### Result
_(Fill in after testing.)_

---
## Prompt 5: PWA caching and offline mode
**Model:** Gemini 3.8 Flash (Medium)

```
Make the app work offline for the last viewed city. Do not build push notifications yet.

Requirements:
1. src/sw.ts (custom service worker, injectManifest strategy):
   - Precache the app shell using the injected manifest (cleanupOutdatedCaches too).
   - Add a NavigationRoute that serves the precached index.html for navigation requests, so the app loads offline.
   - Add a runtime route for the weather APIs (api.openweathermap.org and api.open-meteo.com) using NetworkFirst with a 4-second network timeout, a dedicated cache named "weather-api" and ExpirationPlugin (maxEntries 4, maxAgeSeconds 24 hours). Cache only responses with status 200.
   - Do NOT cache GeoDB / RapidAPI requests. City search needs the network.
   - Handle skipWaiting / clients.claim so updates activate cleanly.
2. Last viewed city persistence: whenever weather loads successfully, save { city, weather (the full WeatherData), savedAt } under the key "weatherboard:last-view" using the safe storage wrapper from src/utils/storage.ts. Also save the selected city.
3. On app start, if a last-view entry exists and the selected city is empty, restore it and show it immediately. Fetch fresh data in the background if online. If the fetch fails because the user is offline, keep showing the cached data. Never replace cached data with an error screen when offline.
4. src/hooks/useOnlineStatus.ts: tracks navigator.onLine plus the window "online" and "offline" events.
5. src/components/OfflineBanner.tsx: a banner at the top of the page shown only when offline. It has role="status" and aria-live="polite", and the text "You're offline. Showing the last saved weather for <city>, updated <relative time>." If there is no cached city, the text is "You're offline. Connect to the internet to search for a city." The banner must not shift or overlap the layout badly at 375px.
6. When offline: disable or visibly mark the search field with the helper text "Search needs an internet connection." Favourites can still be clicked. Clicking a favourite that has no cached weather shows a specific message ("No saved weather for <city> yet. Reconnect to load it.") instead of a generic error. Clicking the one cached city shows its cached data.
7. Show a "Last updated" timestamp on the weather card, and a "Cached" label when the data on screen came from the cache.
8. Manifest: verify name, short_name, 192 and 512 icons, theme_color, background_color, display "standalone", start_url "/" and scope "/". Add a "maskable" purpose entry for the 512 icon. Add <meta name="theme-color"> and apple-touch-icon in index.html.
9. Keep the registration code in src/registerSW.ts. Log nothing noisy to the console.
10. Do not add dependencies other than workbox packages already used (workbox-precaching, workbox-routing, workbox-strategies, workbox-expiration, workbox-cacheable-response). Add any that are missing to package.json.
11. At the end, tell me exactly how to test offline mode (build + preview commands), because service workers do not behave reliably in the Vite dev server.

Show me which files you created or changed.
```

### Result
_(Fill in after testing.)_

---