
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FinanceData, Account, Category, Transaction, EssentialTransaction, Investment, InvestmentTrend } from './types';
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
  addEssential: (rec: Partial<EssentialTransaction>) => Promise<void>;
  updateEssential: (id: string, updates: Partial<EssentialTransaction>) => Promise<void>;
  deleteEssential: (id: string) => Promise<void>;
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
    essentialTransactions: [],
    investments: [],
    investmentTrends: [],
    isSyncing: true,
    error: null
  });

  const syncData = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    setData(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const results = await Promise.allSettled([
        supabaseFetch<Account>('accounts'),
        supabaseFetch<Category>('categories'),
        supabaseFetch<Transaction>('transactions'),
        supabaseFetch<Investment>('investment'),
        supabaseFetch<InvestmentTrend>('investment_trends'),
        supabaseFetch<EssentialTransaction>('essential_transactions')
      ]);

      const [resAcc, resCat, resTx, resInv, resTrends, resEss] = results;
      
      const newData: Partial<FinanceData> = {};
      const errors: string[] = [];

      const processResult = <T,>(res: PromiseSettledResult<T[]>, name: string): T[] => {
        if (res.status === 'fulfilled') {
          return res.value;
        } else {
          console.error(`Failed to fetch ${name}:`, res.reason);
          errors.push(`${name}: ${res.reason.message || 'Error'}`);
          return [];
        }
      };

      newData.accounts = processResult(resAcc, 'accounts');
      newData.categories = processResult(resCat, 'categories');
      newData.transactions = processResult(resTx, 'transactions');
      newData.investments = processResult(resInv, 'investment');
      newData.investmentTrends = processResult(resTrends, 'investment_trends');
      newData.essentialTransactions = processResult(resEss, 'essential_transactions');

      setData(prev => ({
        ...prev,
        ...newData,
        isSyncing: false,
        error: errors.length > 0 ? `Sync incompleto: ${errors.join(', ')}` : null
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
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Utente non autenticato");
    try {
      const payload = {
        name: category.name,
        parent_id: category.parent_id || null,
        user_id: currentUser.id,
        is_archived: category.is_archived || false
      };
      const newCat = await supabaseInsert<Category>('categories', payload);
      setData(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
    } catch (err) { console.error("Failed to add category:", err); throw err; }
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

  // --- ESSENTIAL TRANSACTIONS (Ex Recurring) ---
  const addEssential = async (rec: Partial<EssentialTransaction>) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Utente non autenticato");
    try {
      const newRec = await supabaseInsert<EssentialTransaction>('essential_transactions', { ...rec, user_id: currentUser.id });
      setData(prev => ({ ...prev, essentialTransactions: [...prev.essentialTransactions, newRec] }));
    } catch (err) { console.error("Failed to add essential:", err); throw err; }
  };

  const updateEssential = async (id: string, updates: Partial<EssentialTransaction>) => {
    try {
      setData(prev => ({ ...prev, essentialTransactions: prev.essentialTransactions.map(r => r.id === id ? { ...r, ...updates } : r) }));
      await supabaseUpdate('essential_transactions', id, updates);
    } catch (err) { console.error("Failed to update essential:", err); throw err; }
  };

  const deleteEssential = async (id: string) => {
    try {
      await supabaseDelete('essential_transactions', id);
      setData(prev => ({ ...prev, essentialTransactions: prev.essentialTransactions.filter(r => r.id !== id) }));
    } catch (err) { console.error("Failed to delete essential:", err); throw err; }
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
      addEssential, updateEssential, deleteEssential,
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
