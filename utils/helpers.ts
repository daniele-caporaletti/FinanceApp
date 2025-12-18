
/**
 * Recupera il tasso di cambio tra due valute per una data specifica.
 * Se la data è futura o il recupero specifico fallisce, tenta con l'ultimo tasso disponibile.
 */
export const fetchExchangeRate = async (date: string, from: string, to: string): Promise<number> => {
  if (from === to) return 1;
  
  const today = new Date().toISOString().split('T')[0];
  // Se la data è futura, usa 'latest'
  const queryDate = date > today ? 'latest' : date;
  
  try {
    const response = await fetch(`https://api.frankfurter.app/${queryDate}?from=${from}&to=${to}`);
    if (!response.ok) throw new Error('Rate fetch failed');
    const data = await response.json();
    return data.rates[to];
  } catch (e) {
    try {
        // Fallback su latest se la chiamata con data specifica fallisce
        console.warn(`Rate fetch failed for date ${date}, trying latest.`);
        const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        const data = await response.json();
        return data.rates[to];
    } catch (e2) {
        console.error("Impossibile recuperare tasso di cambio.", e2);
        return 1; // Fallback estremo 1:1
    }
  }
};

/**
 * Formatta un numero come valuta.
 */
export const formatCurrency = (amount: number, currency: string = 'CHF', locale: string = 'it-IT') => {
  return amount.toLocaleString(locale, { 
    style: 'decimal', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};
