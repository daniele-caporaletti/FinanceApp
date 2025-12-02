
// Environment Variables with Safe Fallback
// In production (Netlify), these should be set in the dashboard.
// Locally, it falls back to the hardcoded values for immediate usage if env vars are missing in preview.

// Safe access to avoid crashes in environments where import.meta.env is undefined
const getEnvVar = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env?.[key];
  } catch (e) {
    return undefined;
  }
};

const ENV_URL = getEnvVar('VITE_SUPABASE_URL');
const ENV_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_KEY'); // Check both for compatibility

export const SUPABASE_URL = ENV_URL || "https://zofiedtdignlsjyzsdge.supabase.co";

// Using the provided ANON KEY from your example
export const SUPABASE_KEY = ENV_KEY || "sb_publishable_n6xym1z6Zb6lIBVbTciQQw_bsuHj-Ud";

export const DB_NAME = 'FinanceAppDB';
export const DB_VERSION = 5;
