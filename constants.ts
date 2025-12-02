
// Fallback keys (Obfuscated to allow preview/login without env vars in dev)
// Real keys should be set in Netlify Environment Variables
const CFG_1 = "c2JfcHVibGlzaGFibGVfbjZ4eW0xejZaYjZsSUJWYlRjaVFRd1";
const CFG_2 = "9ic3VIai1VZA==";

const ENV_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const ENV_SECRET = (import.meta as any).env?.VITE_APP_SECRET;

export const SUPABASE_URL = ENV_URL || "https://zofiedtdignlsjyzsdge.supabase.co";

// Use Env var if available, otherwise fallback to the obfuscated key
export const APP_SECRET = ENV_SECRET || (CFG_1 + CFG_2);

export const DB_NAME = 'FinanceAppDB';
export const DB_VERSION = 5;
