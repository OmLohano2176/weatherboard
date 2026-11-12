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
_(Fill in after testing: what worked, what the agent got wrong, and what fixed manually.)_

---

