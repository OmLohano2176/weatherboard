# WeatherBoard

A responsive, installable weather dashboard. Search any city, see current conditions and a 5-day forecast, save favourites, keep using it offline, and get a daily push reminder at a time you choose.

Built for the Edspire Frontend (React) technical challenge, using an agentic IDE (Google Antigravity) as the primary development tool.

- **Live app:** https://weatherboard-wine.vercel.app
- **Repository:** https://github.com/OmLohano2176/weatherboard
- **Push backend (Cloudflare Worker):** https://weatherboard-push.om-weatherboard.workers.dev/api/health
- **Prompt history:** [PROMPTS.md](./PROMPTS.md) (IDE used: Google Antigravity, VS Code extension, Gemini 3.8 Flash)

---

## Features

| # | Requirement | How it is implemented |
|---|---|---|
| 01 | City search with autocomplete | GeoDB Cities API via RapidAPI. 300 ms debounce, in-flight requests cancelled with `AbortController`, accessible combobox (arrow keys, Enter, Escape), visible loading / empty / network-error / rate-limit / missing-key states with a Retry button. |
| 02 | Weather data display | OpenWeatherMap (primary) with automatic fallback to Open-Meteo. Current temperature, humidity, wind speed, condition icon, and a 5-day forecast. Real data only, skeleton loading states, specific error messages. |
| 03 | Form validation | Inline errors on blur and on submit for the search field and the reminder time picker. Distinct messages for an empty field, no results, offline, rate limiting and a failing service. |
| 04 | Favourite cities | Up to 5 favourites in `localStorage`, quick-access panel, native `<dialog>` confirmation before removal, validated on load, synced across tabs, in-memory fallback if storage is unavailable. |
| 05 | PWA | Valid manifest (name, 192/512 icons incl. maskable, `theme_color`, `display: standalone`), custom service worker that precaches the app shell and fonts and caches weather responses. Offline banner and last-viewed city available offline. |
| 06 | Push notifications | Daily reminder at a user-chosen time via Web Push + a small Cloudflare Worker. Explainer dialog before the browser permission prompt. Clear fallbacks for unsupported, denied and offline states. Works with the tab closed. |
| 07 | Responsive design | Layouts for 375 px, 768 px and 1280 px with no page-level horizontal scroll and touch targets of at least 44x44 px. |

**Extras:** CSS-animated weather icons (no animation libraries), condition-reactive theming (the page tint changes with the weather), self-hosted Inter font (works offline), `prefers-reduced-motion` support, and a keyboard shortcut (`/`) to focus search.

---

## APIs used

| API | Purpose | Key needed |
|---|---|---|
| [OpenWeatherMap](https://openweathermap.org/api) | Current weather + 5-day / 3-hour forecast (aggregated to daily) | Yes (free) |
| [Open-Meteo](https://open-meteo.com) | Fallback weather source; also used by the service worker for push notification content | No |
| [GeoDB Cities](https://rapidapi.com/wirefreethought/api/geodb-cities) (RapidAPI) | City autocomplete | Yes (free tier) |
| Web Push + Notifications API | Daily reminder (VAPID, service worker `push` event) | No |
| Cache API / Service Worker | Offline support | No |

---

## Tech stack

- React 18 + TypeScript, built with Vite
- `vite-plugin-pwa` (`injectManifest` strategy) + Workbox (precaching, routing, strategies, expiration)
- Plain CSS with design tokens (CSS variables), no UI library
- `@fontsource-variable/inter` (self-hosted font, the only styling dependency)
- Cloudflare Workers (free plan) + KV for the push backend
- Hosting: Vercel (app) and Cloudflare (Worker)

---

## Getting started

### Prerequisites

- Node.js 18 or newer (developed on 20.19)
- A free [OpenWeatherMap](https://openweathermap.org/api) key
- A free [RapidAPI](https://rapidapi.com) key with a subscription to the GeoDB Cities Basic plan

### 1. Install and configure

```bash
git clone https://github.com/OmLohano2176/weatherboard.git
cd weatherboard
npm install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

Fill in `.env` (no quotes, no spaces around `=`):

| Variable | Required | Description |
|---|---|---|
| `VITE_OWM_API_KEY` | Recommended | OpenWeatherMap key. If missing or invalid, the app falls back to Open-Meteo. |
| `VITE_RAPIDAPI_KEY` | Yes | RapidAPI key for GeoDB Cities (city search). |
| `VITE_PUSH_API_URL` | For reminders | Base URL of the push Worker, no trailing slash. |
| `VITE_VAPID_PUBLIC_KEY` | For reminders | VAPID public key (safe to expose; it is public by design). |

### 2. Run

```bash
npm run dev        # development server with hot reload
```

Service workers, offline mode and push do not behave reliably under the dev server, so test them on the production build:

```bash
npm run build
npm run preview    # http://localhost:4173
```

Vite reads `.env` at build/start time. Restart the server after changing it.

### 3. Push backend (optional, only needed for reminders)

The reminder feature needs a server to send pushes while the tab is closed (see [Architecture decisions](#architecture-decisions)). The Worker lives in [`/worker`](./worker).

```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create SUBS     # put the printed id in wrangler.toml
npx web-push generate-vapid-keys          # public + private key
npx wrangler secret put VAPID_PRIVATE_KEY # paste the private key (never commit it)
```

In `worker/wrangler.toml` set `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (a `mailto:` address) and `ALLOWED_ORIGINS` (comma-separated, exact origins, no trailing slash, for example `http://localhost:4173,https://weatherboard-wine.vercel.app`). Then:

```bash
npx wrangler deploy
```

Put the resulting URL in `VITE_PUSH_API_URL` and the public key in `VITE_VAPID_PUBLIC_KEY`. Details are in [`worker/README.md`](./worker/README.md).

### 4. Deploy the app

Push to GitHub and import the repo in Vercel (Vite preset, build `npm run build`, output `dist`). Add the four `VITE_*` variables in the Vercel project settings. Pushes to `main` deploy to production automatically; other branches get preview URLs.

---

## Project structure

```
src/
  components/   CitySearch, CurrentWeather, Forecast, WeatherIcon, WeatherSkeleton,
                WeatherErrorView, FavoriteButton, FavoritesPanel, ReminderSettings, OfflineBanner
  hooks/        useDebounce, useCitySearch, useWeather, useFavorites, useReminders,
                useOnlineStatus, useCountUp
  services/     geodb, openweathermap, openmeteo, weather (provider orchestration + fallback)
  utils/        storage (safe localStorage wrapper), lastView, prefs, push
  types/        City and provider-independent weather types
  sw.ts         custom service worker (precache, runtime caching, push, notificationclick)
  registerSW.ts service worker registration
worker/
  src/          index.ts (HTTP + cron handler), vapid.ts (VAPID signing), types.ts
  wrangler.toml Worker config (cron, KV binding, vars)
```

---

## Architecture decisions

### Provider-independent weather model with automatic fallback
Both weather services are mapped into one `WeatherData` shape, so the UI never knows which provider answered. `getWeather()` tries OpenWeatherMap first and switches to Open-Meteo on an invalid or inactive key (401), rate limiting (429), a 5xx response, or a missing key. If both fail, it throws a typed error (offline, rate limited, both services down) and the UI shows a specific message. No mocked or hardcoded data anywhere. The card footer states which source supplied the data.

### Aggregating the 3-hour forecast
OpenWeatherMap's free forecast comes in 3-hour steps. It is aggregated into 5 daily entries using the city's own timezone offset (min / max per local date, most frequent condition as the day's condition), so a city far from the user's timezone still gets the correct days. Wind is converted from m/s to km/h.

### Search that respects the free tier
Autocomplete is debounced at 300 ms, cancels stale requests, and only starts at 2 characters. GeoDB's free tier allows roughly 1 request per second, and single-letter queries return vague results. With 1 character the dropdown shows a "Keep typing" hint instead of silently doing nothing. Search results are never cached, since search needs the network by design.

### Offline strategy
- The app shell and fonts are precached; navigation requests fall back to the precached `index.html`.
- Weather API responses use `NetworkFirst` (4 s timeout) in a dedicated cache with expiry (24 h, 4 entries).
- The last viewed city and its full weather are also persisted via the safe storage wrapper, so the app restores it instantly on launch and refreshes in the background when online.
- When offline, the search field is visibly disabled, an offline banner shows how old the data is, and a "Cached" label appears on the card. Favourites without cached weather show a specific message instead of a generic error.
- Weather icons are inline SVG (no remote images), so they work offline.

### Push notifications: why there is a small Worker
The brief asks for a client-only app and also for a reminder that fires at a user-chosen time with the tab closed. These conflict: the browser can only receive a push if some server sends it. I chose the smallest backend that satisfies the requirement instead of dropping the feature:

- A **Cloudflare Worker (free plan)** stores each push subscription with the chosen time and timezone in KV, and a **cron trigger every 5 minutes** sends due reminders.
- Vercel's free plan was ruled out because its cron runs at most once per day, which cannot honour a user-chosen time.
- **Payload-less pushes.** The Worker sends an empty push, so no payload encryption is needed (the Workers free plan has a 10 ms CPU limit per run). The service worker builds the message itself: it reads the last selected city from the Cache API, fetches today's weather from Open-Meteo, and shows the notification. If that fails, it shows a generic fallback. It always shows a notification, as browsers require.
- **VAPID signing** is implemented with WebCrypto (the `web-push` npm package does not run on Workers), and the signed token is cached per push-service origin per run.
- **Due logic:** a reminder is due when today's local date has not been sent yet and the local time is 0 to 10 minutes past the chosen time. Changing the time resets the "already sent today" marker so the new time fires the same day.
- **Security:** the subscribe endpoint only accepts `https` endpoints on known push-service domains (FCM, Mozilla, Apple, Windows) to prevent SSRF, validates every field, limits the body size, restricts CORS to configured origins, and rate-limits the test endpoint. Subscriptions that the push service reports as gone (404/410) are deleted automatically.
- **UX:** an explainer dialog appears before the browser permission prompt. Denied permission, unsupported browsers, iOS outside an installed PWA, and an unreachable server each get a specific message and never affect the rest of the app. A "Send test notification" button lets you verify delivery immediately.

Worker endpoints: `POST /api/subscribe`, `POST /api/unsubscribe`, `POST /api/test`, `GET /api/health`.

### Favourites and storage
All storage goes through a safe wrapper: every read and write is wrapped in `try/catch`, availability is tested with a write, and an in-memory store takes over when `localStorage` is blocked or full (the user is told favourites will not persist). Stored data is validated on load, so corrupted JSON never crashes the app. Removal uses a native `<dialog>` with focus return and Escape to cancel.

### Design system and motion
- A token-based design system (surfaces, text, spacing, radius, fluid type scale, per-condition accent colours) in plain CSS variables.
- The app root gets a `data-condition` attribute, which tints the background and hero glow to match the current weather.
- Motion is CSS-first and limited to `transform` and `opacity`; no animation libraries were added. Everything respects `prefers-reduced-motion`, and `prefers-contrast` / `prefers-reduced-transparency` are handled.

| Animation | Trigger |
|---|---|
| Weather icons (sun rays, cloud drift, rain, snow, lightning, mist) | Continuous on the hero icon; on hover/focus for forecast cards |
| Staggered entrance of hero, tiles and forecast cards | When a different city is selected (not on background refetch) |
| Temperature count-up | On fresh data (skipped for cached data and reduced motion) |
| Favourite star pop, chip enter/exit | Toggle, add, confirmed removal |
| Dialog scale + backdrop fade, search dropdown, offline banner slide | Open / close / connection change |
| Ambient background drift and cross-fade | Continuous / condition change |
| View Transition cross-fade between cities | City change (progressive enhancement) |

### Accessibility
Combobox pattern with `aria-expanded`, `aria-activedescendant`, `role="listbox"`; inline errors linked with `aria-invalid` / `aria-describedby`; live regions for status and offline messages; visible focus rings; 44 px touch targets; colour is never the only signal.

---

## Working with the AI agent

The full prompt history, in order, is in [PROMPTS.md](./PROMPTS.md). The build was split into small, specific prompts (scaffold, search, weather, favourites, PWA/offline, push backend, push client, visual redesign, motion, fixes), each reviewed and committed separately. Examples of where the generated output needed review and changes:

- **Reminder re-arming bug:** the first Worker version kept the "already sent today" marker when a user changed the reminder time, so the new time would not fire until the next day. Fixed in a follow-up prompt.
- **Search feedback:** the generated search did nothing for a single character, which broke the "no input without feedback" requirement. Added a hint row.
- **Environment and CORS issues surfaced only in real use:** the Worker rejected the production origin until `ALLOWED_ORIGINS` listed it exactly, and Windows had Chrome notifications disabled at the OS level.
- **Constraints given up front** because generic output would have missed them: the free-plan CPU limit (hence payload-less pushes and WebCrypto), no Node-only libraries in the Worker, no remote icon URLs (offline), and no new dependencies beyond the font.

---

## Known limitations

- **Not purely client-side.** Push reminders need the Cloudflare Worker, for the reason explained above. Everything else works without it, and the app degrades gracefully if the Worker is unreachable.
- **API keys are visible in the browser bundle.** Any `VITE_` variable ships to the client. Free-tier keys limit the damage; a production version would proxy third-party calls through the Worker and restrict keys by origin.
- **Reminder timing is approximate.** The cron runs every 5 minutes, so a reminder can arrive up to about 5 to 10 minutes after the chosen time. Delivery also depends on the browser and OS (Chrome must be allowed to run in the background and notifications must be enabled in the OS settings).
- **Worker free-plan limits.** 10 ms CPU per run, 50 subrequests per run (sends are capped at 40 per run), and 1,000 KV writes per day. This comfortably covers a demo, not a large user base. The cron iterates over all subscriptions, which would need indexing at scale.
- **iOS and iPadOS:** web push only works after adding the app to the Home Screen (iOS 16.4+). The app explains this in the reminder card.
- **Production origin is fixed in the Worker config.** Vercel preview deployments show a "push server unreachable" message because their origins are not allowed.
- **Offline scope.** Only previously viewed cities have cached weather (the last viewed city is guaranteed; the weather cache keeps a few recent entries). City search needs the network.
- **Forecast differences.** Temperatures can differ by a few degrees from other services because providers use different models. The footer always names the data source.
- **Search needs 2 characters** (see the search decision above) and is limited by GeoDB's free rate limit (about 1 request per second); heavy typing can show a "too many searches" message.
- **Service worker updates.** Returning visitors receive a new version on their second reload because the new service worker installs in the background first.
- **Not implemented:** light mode, a °C/°F toggle, hourly forecast, air quality and UV (the chosen APIs' free tiers do not provide all of these, and no data is invented).

---

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Search shows "Please set VITE_RAPIDAPI_KEY" | The key is missing from `.env` (not `.env.example`) or the dev server was not restarted. |
| Footer says "Open-Meteo (backup source)" | The OpenWeatherMap key is missing, new (activation can take a couple of hours) or rate limited. This is the fallback working as designed. |
| "Push server is currently unreachable" | `VITE_PUSH_API_URL` is wrong, the Worker is not deployed, or the page origin is not in the Worker's `ALLOWED_ORIGINS`. |
| Test notification says "sent" but nothing appears | Notifications for the browser are turned off in the OS settings, or Focus Assist / Do Not Disturb is on. |
| Old version still showing after a deploy | The service worker is serving cached files. Hard-reload, or unregister the service worker in DevTools, or use a private window. |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and create the production build (also builds the service worker) |
| `npm run preview` | Serve the production build locally (use this to test offline and push) |

---

Built by Om Lohano for the Edspire technical interview, November 2026.
