
import { createClient } from "@supabase/supabase-js";

// Utilizziamo process.env come richiesto dalla documentazione.
// Nota: I valori di fallback (|| '...') sono inclusi per garantire che l'app funzioni 
// in questa anteprima anche se il file .env non è fisicamente presente o caricato dal bundler.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zofiedtdignlsjyzsdge.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_n6xym1z6Zb6lIBVbTciQQw_bsuHj-Ud';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
