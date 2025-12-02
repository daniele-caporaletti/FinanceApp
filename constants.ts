const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    const env = import.meta.env;
    return env && env[key] ? env[key] : "";
  } catch (e) {
    return "";
  }
};

const FB_URL = "https://" + "zofiedtdignlsjyzsdge.supabase.co";

const CFG_1 = "c2JfcHVibGlzaGFibGVfbjZ4eW0xejZa";
const CFG_2 = "YjZsSUJWYlRjaVFRd19ic3VIai1VZA==";

export const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || FB_URL;
export const APP_SECRET = getEnvVar('VITE_APP_SECRET') || (CFG_1 + CFG_2);

export const DB_NAME = 'FinanceAppDB';
export const DB_VERSION = 3;