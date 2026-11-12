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
_(Fill in after running: what worked, what the agent got wrong, and what you fixed manually.)_

---