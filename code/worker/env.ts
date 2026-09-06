export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ORIGIN: string;
  RESEND_FROM: string;
  RESEND_API_KEY: string;
  OTP_HMAC_SECRET: string;
  GROQ_API_KEY?: string;
}
