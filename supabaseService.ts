
import { supabase } from './utils/supabase';

/**
 * Fetch recursivo per scaricare TUTTI i dati di una tabella utilizzando l'SDK Supabase.
 * Gestisce automaticamente la paginazione (range) per superare il limite di 1000 righe.
 */
export const supabaseFetch = async <T,>(table: string): Promise<T[]> => {
  let allData: T[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + step - 1);

    if (error) {
      const errorMsg = error.message || JSON.stringify(error);
      console.error(`Error fetching ${table}:`, error);
      throw new Error(`Error fetching ${table}: ${errorMsg}`);
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data as T[]];
      
      // Se abbiamo ricevuto meno record del 'step', siamo alla fine
      if (data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    } else {
      hasMore = false;
    }
    
    // Safety break per evitare loop infiniti in caso di errori logici
    if (from > 50000) break; 
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
