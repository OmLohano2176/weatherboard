/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_OWM_API_KEY: string;
  readonly VITE_RAPIDAPI_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
