
// Legge le variabili d'ambiente iniettate da Netlify (Vite)
// Usiamo 'as any' per bypassare controlli rigidi di TS durante la build se i tipi Vite non sono caricati perfettamente
export const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || "";
export const ENCRYPTED_KEY = (import.meta as any).env.VITE_ENCRYPTED_KEY || "";

export const DB_NAME = 'FinanceAppDB';
export const DB_VERSION = 3;
