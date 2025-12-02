
// Utility functions for consistent formatting across the app

/**
 * Formats a number as a currency string (e.g., "1,200.50").
 * Handles negative numbers and ensures 2 decimal places.
 */
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

/**
 * Formats a number as a currency string with a sign (e.g., "+1,200.50" or "-500.00").
 */
export const formatCurrencyWithSign = (amount: number): string => {
  const sign = amount > 0 ? '+' : ''; // Negative numbers automatically get '-' from toLocaleString
  return `${sign}${formatCurrency(amount)}`;
};

/**
 * Formats an ISO date string (YYYY-MM-DD) to a readable short date (e.g., "12 ott").
 */
export const formatDateShort = (isoDate: string): string => {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
};

/**
 * Separates the integer and decimal parts of a number for styling purposes.
 * Returns { integer: string, decimal: string }
 */
export const splitCurrency = (amount: number) => {
  const formatted = Math.abs(amount).toFixed(2);
  const [integer, decimal] = formatted.split('.');
  return {
    integer: parseInt(integer).toLocaleString('en-US'),
    decimal
  };
};

export const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
