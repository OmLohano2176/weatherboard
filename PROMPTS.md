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

## Prompt 6: Push notification backend (Cloudflare Worker)
**Model:** Gemini 3.8 Flash (Medium)

```
Create a small Cloudflare Worker in a new top-level folder /worker (separate from the Vite app, with its own package.json, tsconfig.json and wrangler.toml). It sends daily Web Push reminders. Do not modify the React app in this prompt.

Constraints: Cloudflare Workers FREE plan (10 ms CPU per invocation, 50 subrequests per invocation, 1,000 KV writes per day). TypeScript. No Node-only libraries: the `web-push` npm package does not run on Workers, so implement VAPID signing yourself with the WebCrypto API. Send payload-less pushes (empty body), so no payload encryption is needed.

Config (wrangler.toml):
- name "weatherboard-push", main src/index.ts, a current compatibility_date.
- KV namespace binding SUBS.
- [triggers] crons = ["*/5 * * * *"].
- vars: VAPID_PUBLIC_KEY (base64url, uncompressed P-256 point), VAPID_SUBJECT ("mailto:" placeholder), ALLOWED_ORIGINS (comma-separated: http://localhost:4173, http://localhost:5173 and a placeholder for the production URL).
- Secret: VAPID_PRIVATE_KEY (base64url, raw 32-byte d). Never put it in wrangler.toml. Document `wrangler secret put VAPID_PRIVATE_KEY`.
- Create worker/.dev.vars.example and add .dev.vars to the root .gitignore.

HTTP endpoints (JSON, CORS limited to ALLOWED_ORIGINS, OPTIONS preflight handled):
1. POST /api/subscribe  body { subscription: PushSubscriptionJSON, time: "HH:MM", timeZone: IANA string }
   - Validate everything. The endpoint must be https and its hostname must equal or end with ".<domain>" for one of: fcm.googleapis.com, push.services.mozilla.com, push.apple.com, notify.windows.com. Reject others with 400 and a specific message (prevents SSRF). Validate time with /^([01]\d|2[0-3]):[0-5]\d$/ and timeZone by constructing an Intl.DateTimeFormat in try/catch. Limit the request body to 4 KB.
   - Key = "sub:" + SHA-256 hex of the endpoint. Value = { subscription, time, timeZone, lastSentDate: null, createdAt }. Re-subscribing the same endpoint updates time and timeZone and keeps lastSentDate.
2. POST /api/unsubscribe  body { endpoint } deletes the record.
3. POST /api/test  body { endpoint } sends one push immediately to that stored subscription (for demo and testing). Allow one test per endpoint per minute (KV key with expirationTtl 60).
4. GET /api/health returns { ok: true }.

Scheduled handler (every 5 minutes):
- List keys with prefix "sub:" (handle cursor pagination) and read each record.
- For each record, compute the current local date (YYYY-MM-DD) and minutes since midnight in its timeZone using Intl.DateTimeFormat. A reminder is due when lastSentDate !== local today AND 0 <= (nowMinutes - chosenMinutes) < 10. Then send a push and set lastSentDate to local today (one KV write).
- On push service responses 404 or 410, delete the record. On 429 or 5xx, leave it so it retries on the next run inside the window. One failed subscription must never stop the others (Promise.allSettled), with at most 6 concurrent sends and at most 40 sends per run.
- Cache the signed VAPID JWT per push-service origin (the audience) within a single run, so each origin is signed once (CPU limit).

VAPID and push request:
- Build an ES256 JWT (header {typ:"JWT",alg:"ES256"}, claims {aud: origin of the endpoint, exp: now + 12h, sub: VAPID_SUBJECT}) and sign it with ECDSA P-256 SHA-256 via crypto.subtle. Import the private key as a JWK built from d plus x and y derived from the uncompressed public key. WebCrypto returns the raw r||s signature; base64url-encode it.
- POST to subscription.endpoint with headers Authorization: "vapid t=<jwt>, k=<VAPID_PUBLIC_KEY>", TTL: "3600", Urgency: "normal", and an empty body.

Also provide:
- /worker/README.md: how to generate VAPID keys (`npx web-push generate-vapid-keys`), create the KV namespace, set the secret, deploy, and test the cron locally with `wrangler dev --test-scheduled`.
- A short comment at the top of src/index.ts explaining the CPU-time and KV-write design decisions.

When done, list every file you created and give me the exact deploy commands.
```

### Result
_(Fill in after deploying and testing.)_

---

## Prompt 7: Daily reminders in the app
**Model:** Gemini 3.8 Flash (Medium)

```
Add daily weather reminders to the React app using the Web Push API. A Cloudflare Worker (in /worker) stores subscriptions and sends payload-less pushes. Do not change weather, search, favourites or caching logic except where stated.

Env: VITE_PUSH_API_URL (base URL of the Worker) and VITE_VAPID_PUBLIC_KEY. Add both to .env.example.

1. src/utils/push.ts: isPushSupported() (serviceWorker in navigator, PushManager and Notification in window), urlBase64ToUint8Array, subscribeToPush(time, timeZone), updateReminderTime, unsubscribeFromPush(), sendTestPush(). All network calls go to VITE_PUSH_API_URL with typed errors: offline, Worker unreachable, a 400 validation message from the server, and 429.
2. Persist reminder settings { enabled, time } under "weatherboard:reminder" via the safe storage wrapper.
3. src/hooks/useReminders.ts: returns { support: 'supported' | 'unsupported' | 'ios-needs-install', permission, enabled, time, status, error, enable(time), disable(), changeTime(time), sendTest() }. Read Notification.permission on mount and react to changes (navigator.permissions.query when available).
4. src/components/ReminderSettings.tsx: a card in the UI with these states:
   - Not enabled: "Daily weather reminder", a short benefit line, and an "Enable reminder" button. Clicking opens an explainer dialog BEFORE the browser prompt: why we ask for notifications, what we send (one notification a day at the chosen time, nothing else), that they can turn it off any time, plus the time picker and "Continue" / "Not now" buttons. Only "Continue" calls Notification.requestPermission().
   - Time picker: <input type="time">, default 07:30, required, validated on blur and on submit with the inline error "Choose a time for your reminder." (aria-invalid, aria-describedby). Clear the error as the user types.
   - Enabled: "Reminder set for 07:30 (your local time)", with "Change time", "Send test notification" and "Turn off" (unsubscribes in the browser and tells the Worker).
   - Permission denied: "Notifications are blocked for this site. To get reminders, allow notifications in your browser's site settings, then come back." The rest of the app must keep working untouched.
   - Unsupported: "This browser doesn't support push notifications." On iOS Safari outside an installed PWA: "On iPhone and iPad, add WeatherBoard to your Home Screen first, then enable reminders."
   - Worker unreachable or any other error: a specific message and a Retry button. If the Worker call fails after the browser subscription was created, roll the browser subscription back so state stays consistent.
   - Buttons at least 44x44px; layout works at 375, 768 and 1280px with no horizontal scroll.
5. src/sw.ts, add (keep all existing precache, navigation and runtime caching routes):
   - A "push" listener using event.waitUntil: read the last selected city (see step 6), fetch today's weather for it directly from Open-Meteo (no key; reuse the WMO mapping from src/services/openmeteo.ts if it can be imported), and show a notification titled "<City> today" with a body like "26°C, overcast. High 33°, low 23°.", icon /icon-192.png, tag "daily-weather". If there is no saved city or the fetch fails, show the generic notification "Good morning! Tap to check today's weather." You MUST always call showNotification inside waitUntil.
   - A "notificationclick" listener: close the notification, focus an existing app window or open "/".
6. Whenever the selected city changes, write it where the service worker can read it (Cache API entry in a cache named "weatherboard-prefs" at "/__prefs/city", or IndexedDB; the service worker cannot read localStorage). Include name, country, latitude, longitude.
7. When offline, disable Enable / Turn off / Test with the helper text "Reminders need an internet connection."
8. Add a code comment explaining why pushes are payload-less (no encryption needed on the free Worker; the service worker builds the message).
Do not add dependencies.

Show me which files you created or changed.
```

### Result
_(Fill in after testing.)_

---

## Prompt 8: Fix reminder not re-arming after changing the time
**Model:** Gemini 3.8 Flash (Medium)

```
Bug in /worker/src/index.ts: when a user re-subscribes the same endpoint with a different time or timeZone, the existing lastSentDate is kept. If a reminder was already sent today, the new time never fires until tomorrow.

Fix:
- In POST /api/subscribe, if a record already exists and its time or timeZone differs from the new values, reset lastSentDate to null. If both are unchanged, keep lastSentDate as it is.
- Keep the scheduled handler's due rule unchanged (lastSentDate !== local today AND 0 <= nowMinutes - chosenMinutes < 10).
- Add a one-line log in the scheduled handler: the number of subscriptions checked, the number due, and the number sent (counts only, never log endpoints or keys).
- Do not change anything else. Show me the diff.
```

### Result
_(Fill in after testing.)_

---

## Prompt 9: Visual redesign (design system and layout)
**Model:** Gemini 3.8 Flash (Medium)

```
Redesign the visual layer of WeatherBoard into a polished, premium dashboard. This is a visual and layout refactor only. Do NOT change data fetching, hooks, services, caching, push or any business logic, and do not remove any existing aria attributes, labels, validation, or error / empty / loading / offline states. Every existing feature must keep working.

Direction: calm, confident, dark-first dashboard (the feel of Mercury / Linear / Vercel: restraint and good information density) with weather-app hero patterns. Do not copy any specific existing design.

1. Design tokens in src/index.css (CSS variables only):
   - Surfaces: three elevation levels (bg, surface, surface-raised) with 1px borders (white at 6-10% alpha) and layered soft shadows.
   - Text: primary, secondary, muted. All text must meet WCAG AA (4.5:1) against the surface it sits on.
   - Accent: one primary accent plus per-condition accents: --accent-clear (warm amber), --accent-clouds (slate blue), --accent-rain (blue), --accent-drizzle (teal blue), --accent-thunderstorm (violet), --accent-snow (ice), --accent-mist (grey teal).
   - Spacing scale (4px base), radius scale (8/12/16/24), fluid type scale using clamp() (display, h1, h2, body, small, label).
   - Typography: self-host one variable font (Inter or Plus Jakarta Sans) via @fontsource-variable, imported in main.tsx so the service worker precaches it for offline use. This is the ONLY dependency you may add. No Google Fonts CDN. Use font-variant-numeric: tabular-nums for all temperatures.
2. Condition-reactive theme: set data-condition="clear|clouds|rain|drizzle|thunderstorm|snow|mist" on the app root from the current weather condition (no attribute or "neutral" when no city is selected). Use it to tint the page background with a soft radial gradient over the base background and to color the hero card glow. Transition over 600ms.
3. Layout:
   - Header: logo and app name on the left; on the right keep the PWA badge and add a small online/offline status dot with an accessible label.
   - 1280px: two-column CSS grid, max-width 1200px. Left (about 2/3): search, hero current-weather card, 5-day forecast. Right (about 1/3, position: sticky): Favourites panel and Reminder card.
   - 768px: single column; favourites as a horizontally scrollable chip row under the search; forecast as 5 columns.
   - 375px: single column; forecast as a horizontally scrollable snap row (scroll-snap-type: x mandatory) inside its own overflow container. NO page-level horizontal scroll at any width.
4. Hero card (CurrentWeather): city and country; "Last updated" and the Cached badge as small pills; a very large temperature (display size); the condition icon at 96-120px; the condition description; the favourite star button at the top right. Below, a 2-up grid of detail tiles (Humidity, Wind), each with a small icon, a label and a value. The attribution footer stays but small and muted.
5. Forecast cards: weekday (Today highlighted), icon, high and low, plus a thin horizontal range bar scaled to the week's overall min and max so days can be compared at a glance. Hover raise on pointer devices only ((hover: hover) media query).
6. Search: taller input (min-height 52px), leading search icon, a visible accent focus ring, the dropdown as a raised surface with clear hover/active states. Keep all combobox behaviour and aria attributes untouched.
7. Restyle the favourites chips, the reminder card and both dialogs with the same tokens. Dialog backdrops get a subtle blur and the same radius scale.
8. Empty state (no city selected yet): replace the plain welcome text with a friendly composition using the existing inline SVG weather icons, a one-line heading and short helper text pointing at the search box.
9. Accessibility: touch targets at least 44x44px, a visible :focus-visible ring on every interactive element, colour never the only signal, and honour prefers-contrast and prefers-reduced-transparency (remove translucency and blur).
10. No CSS framework. Keep each component's CSS beside the component. Do not add any dependency except the font package.

Show me which files you changed, and flag any place where you had to touch logic (there should be none beyond passing a data-condition value).
```

### Result
_(Fill in after testing.)_

---

## Prompt 10: Motion polish
**Model:** Gemini 3.8 Flash (Medium)

```
Add motion polish to WeatherBoard. CSS-first: no animation libraries (no Framer Motion, no Lottie). Do NOT change data fetching, hooks, caching, push or business logic.

Global rules:
- Animate only transform and opacity (and filter on at most one element). Never animate width, height, top, left or box-shadow on many elements.
- Define tokens in index.css: --ease-out: cubic-bezier(0.22, 1, 0.36, 1); --dur-fast: 150ms; --dur-base: 250ms; --dur-slow: 500ms.
- @media (prefers-reduced-motion: reduce): disable all looping and entrance animations (use no animation or a near-instant opacity fade), no count-up, no view transitions.

1. Animated weather icons (WeatherIcon.tsx): keep the inline SVGs and add CSS animation classes per condition:
   - clear: slow 24s rotation of the sun rays plus a gentle glow pulse.
   - clouds: two cloud shapes drifting 6-8px horizontally with different durations (ease-in-out, alternate).
   - rain / drizzle: 3-5 drops falling and fading in a staggered loop (animation-delay).
   - thunderstorm: rain plus a brief lightning flash every ~6s (opacity keyframes).
   - snow: flakes drifting down with a slight horizontal sway.
   - mist: horizontal lines sliding slowly with an opacity pulse.
   The hero icon animates continuously. Forecast-card icons animate only on hover/focus (or are static on touch devices) to keep cost low.
2. Ambient background: a fixed, pointer-events: none layer behind the content showing the condition-reactive gradient. Add two blurred radial blobs that drift very slowly (40-60s) using transform: translate only, with will-change: transform. Cross-fade to the new condition colors over 800ms when the city changes. At most 2 animated elements.
3. Entrance choreography: when weather data arrives, stagger in the hero card (fade plus 12px rise), then the detail tiles, then the 5 forecast cards (60ms stagger via a --i CSS variable), using animation-fill-mode: both. Re-run only when the selected city changes (key the wrapper by city id), never on a background refetch of the same city.
4. Temperature count-up: a small hook useCountUp(value, 600ms) using requestAnimationFrame that animates the displayed number from the previous value to the new one with ease-out. No animation on the first render from cache, and none under reduced motion. Put the real final value in an aria-label on the wrapper so screen readers never hear intermediate numbers.
5. Micro-interactions:
   - Favourite star: scale pop (1 to 1.25 to 1) with a fill color transition when toggled.
   - Favourite chips: fade and slide in when added; fade and slide out when removed (after the confirm dialog), removing the element on animationend.
   - Buttons: 100ms press scale (0.97) on :active; hover lift only on (hover: hover) devices.
   - Search dropdown: opacity plus translateY(-4px) to 0 over var(--dur-base).
   - Skeleton: keep the shimmer but implement it with transform on a pseudo-element, not background-position.
   - Offline banner: slide down with opacity when offline and slide up on reconnect, without causing layout shift (overlay it with transform or reserve its space).
   - Confirm dialog and reminder explainer dialog: scale 0.96 to 1 plus fade, with a backdrop fade; degrade gracefully where @starting-style is unsupported.
6. Progressive enhancement: wrap the city change in document.startViewTransition (feature-detected, skipped under reduced motion) with a short cross-fade.
7. Budget: no new dependencies; total added JS under 2 KB gzipped (check the build output); no layout shift introduced (elements keep their final layout space from the first frame).

Show me which files you changed, and list each animation with its trigger and duration in a short table so I can document it in the README.
```

### Result
_(Fill in after testing.)_

---
## Prompt 11: Fix favourite removal under reduced motion
**Model:** Gemini 3.8 Flash (Medium)

```
Bug: in FavoritesPanel.tsx, a confirmed removal adds the "is-removing" class and only removes the favourite on the animationend event. When prefers-reduced-motion disables animations (or the tab is hidden), animationend never fires, so the favourite is never removed.

Fix: perform the removal reliably. If the user prefers reduced motion (matchMedia), call the removal immediately with no exit animation. Otherwise keep the exit animation, but add a fallback setTimeout of 400ms that performs the removal if animationend has not fired yet, and make sure the removal runs only once (guard with a ref or by clearing the timeout in the animationend handler). Clean up the timeout on unmount. Change nothing else, and show me the diff.
```

### Result
_(Fill in after testing.)_

---

## Prompt 12: Feedback for single-character search
**Model:** Gemini 3.8 Flash (Medium)

```
Small UX fix in CitySearch.tsx and CitySearch.css (and useCitySearch.ts only if truly needed). Do not change the search logic, debounce, API calls or any other behavior.

Currently, searching starts at 2+ trimmed characters. With exactly 1 character the dropdown shows nothing, so the user gets no feedback.

Fix: when the trimmed query has exactly 1 character and the input is focused, open the dropdown with a single non-interactive hint row: "Keep typing. Search starts at 2 characters." It uses muted text, has role="status" with aria-live="polite", is NOT an option, cannot be selected with the arrow keys, and does not affect aria-activedescendant. Hide it when the query is empty or has 2+ characters. Make no network request for 1 character. The existing blur validation for an EMPTY field is unchanged, and a 1-character field must NOT show the "Enter a city name to search." error. Use the existing design tokens and keep the animation of the dropdown.

Show me the diff.
```

### Result
_(Fill in after testing.)_

---