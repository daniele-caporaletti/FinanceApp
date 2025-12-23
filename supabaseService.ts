
import { supabase } from './utils/supabase';

// Helper robusto per estrarre messaggi di errore leggibili
const getErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  // Supabase PostgrestError (solitamente ha message, details, hint)
  if (typeof error === 'object') {
      if ('message' in error) return error.message;
      try {
          const json = JSON.stringify(error);
          return json === '{}' ? String(error) : json;
      } catch {
          return String(error);
      }
  }
  return String(error);
};

/**
 * Fetch recursivo per scaricare TUTTI i dati di una tabella utilizzando l'SDK Supabase.
 * Gestisce automaticamente la paginazione (range) e Retry su fallimento.
 */
export const supabaseFetch = async <T,>(table: string): Promise<T[]> => {
  let allData: T[] = [];
  let from = 0;
  const step = 250; // Batch size ridotto per evitare timeout/payload error
  let hasMore = true;
  const MAX_RETRIES = 3;

  while (hasMore) {
    let attempt = 0;
    let success = false;
    let lastError: any = null;

    // Retry loop per ogni chunk
    while (attempt < MAX_RETRIES && !success) {
        try {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .range(from, from + step - 1);

            if (error) throw error; // Lancia l'errore per il catch

            if (data) {
                allData = [...allData, ...data as T[]];
                if (data.length < step) {
                    hasMore = false;
                } else {
                    from += step;
                }
                success = true;
            } else {
                // Caso raro: data null senza errore
                hasMore = false;
                success = true;
            }
        } catch (err) {
            lastError = err;
            attempt++;
            console.warn(`Fetch attempt ${attempt}/${MAX_RETRIES} failed for ${table} (rows ${from}-...):`, err);
            
            // Exponential backoff: attesa crescente (300ms, 600ms, 1200ms)
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, attempt - 1)));
            }
        }
    }

    if (!success) {
        const msg = getErrorMessage(lastError);
        console.error(`Final failure fetching ${table}:`, msg);
        throw new Error(`Failed to fetch ${table}: ${msg}`);
    }
    
    // Safety break per evitare loop infiniti in caso di bug logici
    if (from > 100000) {
        console.warn(`Safety break triggered for table ${table} at ${from} rows.`);
        break; 
    }
  }

  return allData;
};

/**
 * Aggiorna un record specifico in una tabella.
 */
export const supabaseUpdate = async (table: string, id: string, payload: any): Promise<void> => {
  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error(`Error updating ${table}:`, error);
    throw new Error(`Error updating ${table}: ${error.message}`);
  }
};

/**
 * Inserisce un nuovo record in una tabella.
 */
export const supabaseInsert = async <T,>(table: string, payload: any): Promise<T> => {
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(`Error inserting into ${table}:`, error);
    throw new Error(`Error inserting into ${table}: ${error.message}`);
  }

  return data as T;
};

/**
 * Elimina un record specifico in una tabella.
 */
export const supabaseDelete = async (table: string, id: string): Promise<void> => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting from ${table}:`, error);
    throw new Error(`Error deleting from ${table}: ${error.message}`);
  }
};
