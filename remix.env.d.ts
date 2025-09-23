/// <reference types="@react-router/dev" />
/// <reference types="@react-router/node" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_BASE_URL?: string
  readonly SUPABASE_URL: string
  readonly SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY?: string
  readonly BLOB_READ_WRITE_TOKEN?: string
  readonly RESEND_API_KEY?: string
  readonly WHATSAPP_GATEWAY_TOKEN?: string
  readonly BANK_NAME?: string
  readonly BANK_ACCOUNT_NAME?: string
  readonly BANK_ACCOUNT_NUMBER?: string
  readonly ADMIN_EMAIL?: string
  readonly ADMIN_PASSWORD?: string
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_BASE_URL?: string
      SUPABASE_URL: string
      SUPABASE_ANON_KEY: string
      SUPABASE_SERVICE_ROLE_KEY?: string
      BLOB_READ_WRITE_TOKEN?: string
      RESEND_API_KEY?: string
      WHATSAPP_GATEWAY_TOKEN?: string
      BANK_NAME?: string
      BANK_ACCOUNT_NAME?: string
      BANK_ACCOUNT_NUMBER?: string
      ADMIN_EMAIL?: string
      ADMIN_PASSWORD?: string
    }
  }
}

export {}
