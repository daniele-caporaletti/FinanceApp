// Legge le variabili d'ambiente iniettate da Netlify (o Vite in locale)
// Non ci sono più valori di fallback hardcoded per sicurezza.

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "";
export const ENCRYPTED_KEY = (import.meta as any).env?.VITE_ENCRYPTED_KEY || "";

export const DB_NAME = 'FinanceAppDB';
export const DB_VERSION = 3;