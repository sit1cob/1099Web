/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TECHMATE_BASE_URL: string;
  readonly VITE_TECHMATE_EMBED_CLIENT_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
