
/**
 * Recupera il tasso di cambio tra due valute per una data specifica.
 * Se la data è futura o il recupero specifico fallisce, tenta con l'ultimo tasso disponibile.
 */
export const fetchExchangeRate = async (date: string, from: string, to: string): Promise<number> => {
  if (from === to) return 1;
  
  const today = new Date().toISOString().split('T')[0];
  // Se la data è futura, usa 'latest'
  const queryDate = date > today ? 'latest' : date;
  
  const performFetch = async (dateParam: string) => {
      const response = await fetch(`https://api.frankfurter.dev/v1/${dateParam}?base=${from}&symbols=${to}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data || !data.rates || typeof data.rates[to] === 'undefined') {
          throw new Error('Invalid API response structure: missing rates');
      }
      return data.rates[to];
  };

  try {
    return await performFetch(queryDate);
  } catch (e) {
    try {
        // Fallback su latest se la chiamata con data specifica fallisce e non stavamo già provando latest
        if (queryDate !== 'latest') {
            console.warn(`Rate fetch failed for date ${date}, trying latest.`);
            return await performFetch('latest');
        }
        throw e;
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
