/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_BASE: string
  readonly VITE_BACKEND_PORT: string
  readonly VITE_WS_PORT: string
  readonly VITE_APP_MODE: string
  readonly VITE_TRADING_MODE: string
  readonly VITE_STRICT_REAL_DATA: string
  readonly VITE_ALLOW_FAKE_DATA: string
  readonly VITE_DISABLE_INITIAL_LOAD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
