
import { createClient } from "@supabase/supabase-js";

// Funzione helper per leggere le variabili d'ambiente in modo sicuro in qualsiasi ambiente (Vite, CRA, o browser raw).
const getEnv = (key: string, fallback: string): string => {
  // 1. Prova a leggere da process.env (Node.js / CRA / Webpack)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      const val = process.env[key] || process.env[`REACT_APP_${key}`] || process.env[`NEXT_PUBLIC_${key}`];
      if (val) return val;
    }
  } catch (e) {}

  // 2. Prova a leggere da import.meta.env (Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const val = import.meta.env[key] || import.meta.env[`REACT_APP_${key}`] || import.meta.env[`NEXT_PUBLIC_${key}`] || import.meta.env[`VITE_${key}`];
      if (val) return val;
    }
  } catch (e) {}

  // 3. Usa il fallback hardcoded (sicuro per chiavi pubbliche)
  return fallback;
};

// Utilizziamo i valori forniti come fallback garantito
const supabaseUrl = getEnv('SUPABASE_URL', 'https://zofiedtdignlsjyzsdge.supabase.co');
const supabaseKey = getEnv('SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'sb_publishable_n6xym1z6Zb6lIBVbTciQQw_bsuHj-Ud');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
