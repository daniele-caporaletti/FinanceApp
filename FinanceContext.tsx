
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FinanceData, Account, Category, Transaction, RecurringTransaction, Investment, InvestmentTrend } from './types';
import { supabaseFetch, supabaseUpdate, supabaseInsert, supabaseDelete } from './supabaseService';
import { useAuth } from './AuthContext';
import { supabase } from './utils/supabase';

interface FinanceContextType extends FinanceData {
  syncData: () => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  addAccount: (account: Partial<Account>) => Promise<void>;
  addCategory: (category: Partial<Category>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addTransaction: (tx: Partial<Transaction>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addRecurring: (rec: Partial<RecurringTransaction>) => Promise<void>;
  updateRecurring: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  addInvestment: (inv: Partial<Investment>) => Promise<void>;
  updateInvestment: (id: string, updates: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addTrend: (trend: Partial<InvestmentTrend>) => Promise<void>;
  updateTrend: (id: string, updates: Partial<InvestmentTrend>) => Promise<void>;
  deleteTrend: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [data, setData] = useState<FinanceData>({
    accounts: [],
    categories: [],
    transactions: [],
    recurringTransactions: [],
    investments: [],
    investmentTrends: [],
    isSyncing: true,
    error: null
  });

  const syncData = useCallback(async () => {
    // Recupera l'utente corrente direttamente da supabase per sicurezza
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    setData(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      // Usiamo allSettled per non bloccare tutto se una sola tabella fallisce (es. RLS permission denied)
      const results = await Promise.allSettled([
        supabaseFetch<Account>('accounts'),
        supabaseFetch<Category>('categories'),
        supabaseFetch<Transaction>('transactions'),
        supabaseFetch<Investment>('investment'),
        supabaseFetch<InvestmentTrend>('investment_trends'),
        supabaseFetch<RecurringTransaction>('recurring_transactions')
      ]);

      const [resAcc, resCat, resTx, resInv, resTrends, resRec] = results;
      
      const newData: Partial<FinanceData> = {};
      const errors: string[] = [];

      // Helper per estrarre dati o errori
      const processResult = <T,>(res: PromiseSettledResult<T[]>, name: string): T[] => {
        if (res.status === 'fulfilled') {
          return res.value;
        } else {
          console.error(`Failed to fetch ${name}:`, res.reason);
          // Ignoriamo errore se tabella ricorrenze non esiste, altrimenti lo segnaliamo
          if (name !== 'recurring_transactions') {
             errors.push(`${name}: ${res.reason.message || 'Error'}`);
          }
          return [];
        }
      };

      newData.accounts = processResult(resAcc, 'accounts');
      newData.categories = processResult(resCat, 'categories');
      newData.transactions = processResult(resTx, 'transactions');
      newData.investments = processResult(resInv, 'investment');
      newData.investmentTrends = processResult(resTrends, 'investment_trends');
      newData.recurringTransactions = processResult(resRec, 'recurring_transactions');

      setData(prev => ({
        ...prev,
        ...newData,
        isSyncing: false,
        error: errors.length > 0 ? `Sync incompleto (RLS?): ${errors.join(', ')}` : null
      }));

    } catch (err) {
      console.error('Errore critico di sincronizzazione:', err);
      setData(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: err instanceof Error ? err.message : 'Unknown synchronization error' 
      }));
    }
  }, []);

  // --- ACCOUNTS ---
  const addAccount = async (account: Partial<Account>) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Utente non autenticato");
    try {
      const newAccount = await supabaseInsert<Account>('accounts', { ...account, user_id: currentUser.id });
      setData(prev => ({ ...prev, accounts: [...prev.accounts, newAccount] }));
    } catch (err) { console.error("Failed to add account:", err); throw err; }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      setData(prev => ({ ...prev, accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc) }));
      await supabaseUpdate('accounts', id, updates);
    } catch (err) { console.error("Failed to update account:", err); throw err; }
  };

  // --- CATEGORIES ---
  const addCategory = async (category: Partial<Category>) => {
    // Check user directly from supabase to avoid context staleness
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Utente non autenticato");

    try {
      // Costruisci payload pulito
      const payload = {
        name: category.name,
        parent_id: category.parent_id || null, // Assicurati che sia null se vuoto
        user_id: currentUser.id,
        is_archived: category.is_archived || false
      };

      const newCat = await supabaseInsert<Category>('categories', payload);
      setData(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
    } catch (err) { 
        console.error("Failed to add category:", err); 
        throw err; 
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      setData(prev => ({ ...prev, categories: prev.categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat) }));
      await supabaseUpdate('categories', id, updates);
    } catch (err) { console.error("Failed to update category:", err); throw err; }
  };

  const deleteCategory = async (id: string) => {
    try {
      await supabaseDelete('categories', id);
      setData(prev => ({ ...prev, categories: prev.categories.filter(cat => cat.id !== id) }));
    } catch (err) { console.error("Failed to delete category:", err); throw err; }
  };

  // --- TRANSACTIONS ---
  const addTransaction = async (tx: Partial<Transaction>) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Utente non autenticato");
    try {
      const newTx = await supabaseInsert<Transaction>('transactions', { ...tx, user_id: currentUser.id });
      setData(prev => ({ ...prev, transactions: [newTx, ...prev.transactions] }));
    } catch (err) { console.error("Failed to add transaction:", err); throw err; }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      setData(prev => ({ ...prev, transactions: prev.transactions.map(tx => tx.id === id ? { ...tx, ...updates } as Transaction : tx) }));
      await supabaseUpdate('transactions', id, updates);
    } catch (err) { console.error("Failed to update transaction:", err); throw err; }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await supabaseDelete('transactions', id);
      setData(prev => ({ ...prev, transactions: prev.transactions.filter(tx => tx.id !== id) }));
    } catch (err) { console.error("Failed to delete transaction:", err); throw err; }
  };

  // --- RECURRING TRANSACTIONS ---
  const addRecurring = async (rec: Partial<RecurringTransaction>) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Utente non autenticato");
    try {
      const newRec = await supabaseInsert<RecurringTransaction>('recurring_transactions', { ...rec, user_id: currentUser.id });
      setData(prev => ({ ...prev, recurringTransactions: [...prev.recurringTransactions, newRec] }));
    } catch (err) { console.error("Failed to add recurring:", err); throw err; }
  };

  const updateRecurring = async (id: string, updates: Partial<RecurringTransaction>) => {
    try {
      setData(prev => ({ ...prev, recurringTransactions: prev.recurringTransactions.map(r => r.id === id ? { ...r, ...updates } : r) }));
      await supabaseUpdate('recurring_transactions', id, updates);
    } catch (err) { console.error("Failed to update recurring:", err); throw err; }
  };

  const deleteRecurring = async (id: string) => {
    try {
      await supabaseDelete('recurring_transactions', id);
      setData(prev => ({ ...prev, recurringTransactions: prev.recurringTransactions.filter(r => r.id !== id) }));
    } catch (err) { console.error("Failed to delete recurring:", err); throw err; }
  };

  // --- INVESTMENTS ---
  const addInvestment = async (inv: Partial<Investment>) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Utente non autenticato");
    try {
      const newInv = await supabaseInsert<Investment>('investment', { ...inv, user_id: currentUser.id });
      setData(prev => ({ ...prev, investments: [...prev.investments, newInv] }));
    } catch (err) { console.error("Failed to add investment:", err); throw err; }
  };

  const updateInvestment = async (id: string, updates: Partial<Investment>) => {
    try {
      setData(prev => ({ ...prev, investments: prev.investments.map(inv => inv.id === id ? { ...inv, ...updates } : inv) }));
      await supabaseUpdate('investment', id, updates);
    } catch (err) { console.error("Failed to update investment:", err); throw err; }
  };

  const deleteInvestment = async (id: string) => {
    try {
      await supabaseDelete('investment', id);
      setData(prev => ({ ...prev, investments: prev.investments.filter(inv => inv.id !== id) }));
    } catch (err) { console.error("Failed to delete investment:", err); throw err; }
  };

  // --- INVESTMENT TRENDS ---
  const addTrend = async (trend: Partial<InvestmentTrend>) => {
    try {
      // investment_trend table usually doesn't have user_id if it's child of investment which has user_id, 
      // BUT RLS might require it. If your schema has user_id in trends, add it here.
      // Assuming it does NOT based on types.ts (only investment_id).
      // However, if RLS is on 'investment_trends', user must have permission.
      // Permission is usually checked via join or if trends has user_id.
      const newTrend = await supabaseInsert<InvestmentTrend>('investment_trends', trend);
      setData(prev => ({ ...prev, investmentTrends: [...prev.investmentTrends, newTrend] }));
    } catch (err) { console.error("Failed to add trend:", err); throw err; }
  };

  const updateTrend = async (id: string, updates: Partial<InvestmentTrend>) => {
    try {
      setData(prev => ({ ...prev, investmentTrends: prev.investmentTrends.map(t => t.id === id ? { ...t, ...updates } : t) }));
      await supabaseUpdate('investment_trends', id, updates);
    } catch (err) { console.error("Failed to update trend:", err); throw err; }
  };

  const deleteTrend = async (id: string) => {
    try {
      await supabaseDelete('investment_trends', id);
      setData(prev => ({ ...prev, investmentTrends: prev.investmentTrends.filter(t => t.id !== id) }));
    } catch (err) { console.error("Failed to delete trend:", err); throw err; }
  };

  useEffect(() => {
    if (user) {
        syncData();
    }
  }, [syncData, user]);

  return (
    <FinanceContext.Provider value={{ 
      ...data, 
      syncData, 
      updateAccount, addAccount, 
      addCategory, updateCategory, deleteCategory,
      addTransaction, updateTransaction, deleteTransaction,
      addRecurring, updateRecurring, deleteRecurring,
      addInvestment, updateInvestment, deleteInvestment,
      addTrend, updateTrend, deleteTrend
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
