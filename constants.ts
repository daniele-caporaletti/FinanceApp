// Usa le variabili d'ambiente di Vite (definite in Netlify) o un fallback per sviluppo locale
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://zofiedtdignlsjyzsdge.supabase.co";

// La chiave è Base64 Encoded.
// Su Netlify, inserisci questa chiave in VITE_ENCRYPTED_KEY
export const ENCRYPTED_KEY = (import.meta as any).env?.VITE_ENCRYPTED_KEY || "c2JfcHVibGlzaGFibGVfbjZ4eW0xejZaYjZsSUJWYlRjaVFRd19ic3VIai1VZA==";

export const DB_NAME = 'FinanceAppDB';
export const DB_VERSION = 3;