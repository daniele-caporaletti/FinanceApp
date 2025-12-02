
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../constants';
import { DbAccount, DbCategory, DbSubcategory, DbTransaction, MegaTransaction, DbInvestment, DbInvestmentTrend } from '../types';
import { db } from './db';

let supabase: SupabaseClient | null = null;

export const initSupabase = (secret: string) => {
  if (!SUPABASE_URL || !secret) {
    console.error("Missing Supabase URL or Secret");
    return;
  }
  try {
    supabase = createClient(SUPABASE_URL, secret);
  } catch (error) {
    console.error("Failed to initialize Supabase client", error);
    throw new Error("Initialization failed.");
  }
};

const getSupabase = () => {
  if (!supabase) {
    throw new Error("Application locked. Please login.");
  }
  return supabase;
}

// Helper to fetch ALL rows by automatically paginating
const fetchAllRows = async <T>(tableName: string, onProgress?: (count: number) => void): Promise<T[]> => {
  let allData: T[] = [];
  let from = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await getSupabase()
      .from(tableName)
      .select('*')
      .range(from, from + limit - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allData = [...allData, ...(data as T[])];
    
    if (onProgress) onProgress(allData.length);
    
    if (data.length < limit) break;
    
    from += limit;
  }
  
  return allData;
};

export const syncData = async (
  onProgress: (status: string) => void
): Promise<void> => {
  try {
    // 1. Fetch all raw tables with pagination handling
    onProgress('Fetching Accounts...');
    const accounts = await fetchAllRows<DbAccount>('account');

    onProgress('Fetching Categories...');
    const categories = await fetchAllRows<DbCategory>('category');

    onProgress('Fetching Subcategories...');
    const subcategories = await fetchAllRows<DbSubcategory>('subcategory');
    
    onProgress('Fetching Investments...');
    const investments = await fetchAllRows<DbInvestment>('investment');

    onProgress('Fetching Investment Trends...');
    const investmentTrends = await fetchAllRows<DbInvestmentTrend>('investment_trend');

    onProgress('Fetching Transactions (This may take time)...');
    const transactions = await fetchAllRows<DbTransaction>('transaction', (count) => {
      onProgress(`Fetching Transactions... (${count} loaded)`);
    });

    onProgress('Processing "Mega Join"...');

    // 2. Create Lookup Maps for O(1) access
    const accountMap = new Map<string, DbAccount>();
    accounts.forEach(a => accountMap.set(a.id, a));

    const categoryMap = new Map<string, DbCategory>();
    categories.forEach(c => categoryMap.set(c.id, c));

    const subcategoryMap = new Map<string, DbSubcategory>();
    subcategories.forEach(s => subcategoryMap.set(s.id, s));

    // 3. Perform the Join
    const megaTransactions: MegaTransaction[] = transactions.map((tx) => {
      const account = accountMap.get(tx.account_id);
      const category = categoryMap.get(tx.category_id);
      const subcategory = tx.subcategory_id ? subcategoryMap.get(tx.subcategory_id) : null;

      return {
        id: tx.id,
        date: tx.date,
        
        account_id: tx.account_id,
        account_name: account ? account.name : 'Unknown Account',
        currency: account ? account.currency : '???',
        
        amount_original: tx.amount_original,
        amount_base: tx.amount_base,
        
        // Category Info
        category_id: tx.category_id,
        category_name: category ? category.name : 'Uncategorized',
        
        // Subcategory Info
        subcategory_id: tx.subcategory_id || null,
        subcategory_name: subcategory ? subcategory.name : '-',
        
        note: tx.note || '',
        tag: tx.tag || '',
        analytics_included: tx.analytics_included,
        context: tx.context || '',
        recurrence: tx.recurrence || ''
      };
    });

    onProgress(`Saving to local database...`);

    // 4. Save to Dexie (Bulk Put is efficient)
    await (db as any).transaction('rw', db.megaTransactions, db.categories, db.subcategories, db.accounts, db.investments, db.investmentTrends, async () => {
      await db.megaTransactions.clear(); 
      await db.categories.clear();
      await db.subcategories.clear();
      await db.accounts.clear();
      await db.investments.clear();
      await db.investmentTrends.clear();

      await db.categories.bulkPut(categories);
      await db.subcategories.bulkPut(subcategories);
      await db.accounts.bulkPut(accounts);
      await db.investments.bulkPut(investments);
      await db.investmentTrends.bulkPut(investmentTrends);
      await db.megaTransactions.bulkPut(megaTransactions);
    });

    onProgress('Complete');

  } catch (error: any) {
    console.error("Sync Error:", error);
    throw new Error(error.message || "Unknown error during sync");
  }
};

// --- Account Management Methods ---

export const addAccount = async (name: string, currency: string) => {
  const { data, error } = await getSupabase()
    .from('account')
    .insert([
      { name, currency, is_active: true, is_select: true }
    ])
    .select()
    .single();

  if (error) throw error;
  if (data) await db.accounts.put(data);
  return data;
};

export const toggleAccountActive = async (id: string, currentStatus: boolean) => {
  const newStatus = !currentStatus;
  const { error } = await getSupabase()
    .from('account')
    .update({ is_active: newStatus })
    .eq('id', id);

  if (error) throw error;
  await db.accounts.update(id, { is_active: newStatus });
};

export const toggleAccountSelect = async (id: string, currentStatus: boolean) => {
  const newStatus = !currentStatus;
  const { error } = await getSupabase()
    .from('account')
    .update({ is_select: newStatus })
    .eq('id', id);

  if (error) throw error;
  await db.accounts.update(id, { is_select: newStatus });
};

// --- Category Management Methods ---

export const addCategory = async (name: string) => {
  const { data, error } = await getSupabase()
    .from('category')
    .insert([{ name }])
    .select()
    .single();

  if (error) throw error;
  if (data) await db.categories.put(data);
  return data;
};

export const addSubcategory = async (categoryId: string, name: string) => {
  const { data, error } = await getSupabase()
    .from('subcategory')
    .insert([{ category_id: categoryId, name }])
    .select()
    .single();

  if (error) throw error;
  if (data) await db.subcategories.put(data);
  return data;
};

// --- Investment Methods ---

export const addInvestment = async (name: string, currency: string, isForRetirement: boolean, note?: string) => {
  const { data, error } = await getSupabase()
    .from('investment')
    .insert([{ name, currency, is_for_retirement: isForRetirement, note }])
    .select()
    .single();

  if (error) throw error;
  if (data) await db.investments.put(data);
  return data;
};

export const updateInvestment = async (id: string, updates: Partial<DbInvestment>) => {
  const { data, error } = await getSupabase()
    .from('investment')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (data) await db.investments.update(id, updates);
  return data;
};

export const addInvestmentTrend = async (investmentId: string, month: number, year: number, value: number, cashFlow: number) => {
  const { data, error } = await getSupabase()
    .from('investment_trend')
    .insert([{ 
      investment_id: investmentId, 
      month, 
      year, 
      value, 
      cash_flow: cashFlow 
    }])
    .select()
    .single();

  if (error) throw error;
  if (data) await db.investmentTrends.put(data);
  return data;
};

export const deleteInvestmentTrend = async (id: string) => {
  const { error } = await getSupabase()
    .from('investment_trend')
    .delete()
    .eq('id', id);

  if (error) throw error;
  await db.investmentTrends.delete(id);
};


// --- Transaction & Logic Methods ---

const calculateBaseAmountInCHF = async (amountOriginal: number, currency: string, date: string): Promise<number> => {
  let calculatedAmount = amountOriginal;

  if (currency !== 'CHF') {
    try {
      const response = await fetch(`https://api.frankfurter.dev/v1/${date}?base=CHF&symbols=${currency}`);
      if (!response.ok) {
        console.warn(`Frankfurter API error: ${response.statusText}. Fallback to 1:1.`);
      } else {
        const data = await response.json();
        const rate = data.rates[currency];
        if (rate) calculatedAmount = amountOriginal / rate;
      }
    } catch (error) {
      console.error("Currency conversion failed:", error);
    }
  }
  return Math.round((calculatedAmount + Number.EPSILON) * 100) / 100;
};

export interface NewTransactionPayload {
  date: string;
  account_id: string;
  amount_original: number;
  category_id: string;
  subcategory_id?: string | null;
  note?: string;
  tag?: string;
  analytics_included: boolean;
  context: 'personal' | 'work';
  recurrence: 'one_off' | 'recurring' | null;
}

export const saveTransaction = async (payload: NewTransactionPayload) => {
  const account = await db.accounts.get(payload.account_id);
  if (!account) throw new Error("Account not found");

  const amountBase = await calculateBaseAmountInCHF(payload.amount_original, account.currency, payload.date);

  const newTx: Partial<DbTransaction> = {
    date: payload.date,
    account_id: payload.account_id,
    amount_original: payload.amount_original,
    category_id: payload.category_id,
    subcategory_id: payload.subcategory_id || null,
    note: payload.note,
    tag: payload.tag,
    analytics_included: payload.analytics_included,
    context: payload.context,
    recurrence: payload.recurrence,
    amount_base: amountBase
  };

  const { data, error } = await getSupabase()
    .from('transaction')
    .insert([newTx])
    .select()
    .single();

  if (error) throw error;

  if (data) {
    const category = await db.categories.get(data.category_id);
    const subcategory = data.subcategory_id ? await db.subcategories.get(data.subcategory_id) : null;

    const megaTx: MegaTransaction = {
      id: data.id,
      date: data.date,
      account_id: data.account_id,
      account_name: account.name,
      currency: account.currency,
      amount_original: data.amount_original,
      amount_base: data.amount_base,
      category_id: data.category_id,
      category_name: category ? category.name : 'Uncategorized',
      subcategory_id: data.subcategory_id || null,
      subcategory_name: subcategory ? subcategory.name : '-',
      note: data.note || '',
      tag: data.tag || '',
      analytics_included: data.analytics_included,
      context: data.context || '',
      recurrence: data.recurrence || ''
    };
    await db.megaTransactions.put(megaTx);
  }
  return data;
};

export const updateTransaction = async (id: string, payload: NewTransactionPayload) => {
  const account = await db.accounts.get(payload.account_id);
  if (!account) throw new Error("Account not found");

  const amountBase = await calculateBaseAmountInCHF(payload.amount_original, account.currency, payload.date);

  const updateData: Partial<DbTransaction> = {
    date: payload.date,
    account_id: payload.account_id,
    amount_original: payload.amount_original,
    category_id: payload.category_id,
    subcategory_id: payload.subcategory_id || null,
    note: payload.note,
    tag: payload.tag,
    analytics_included: payload.analytics_included,
    context: payload.context,
    recurrence: payload.recurrence,
    amount_base: amountBase
  };

  const { data, error } = await getSupabase()
    .from('transaction')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    const category = await db.categories.get(data.category_id);
    const subcategory = data.subcategory_id ? await db.subcategories.get(data.subcategory_id) : null;

    const megaTx: MegaTransaction = {
      id: data.id,
      date: data.date,
      account_id: data.account_id,
      account_name: account.name,
      currency: account.currency,
      amount_original: data.amount_original,
      amount_base: data.amount_base,
      category_id: data.category_id,
      category_name: category ? category.name : 'Uncategorized',
      subcategory_id: data.subcategory_id || null,
      subcategory_name: subcategory ? subcategory.name : '-',
      note: data.note || '',
      tag: data.tag || '',
      analytics_included: data.analytics_included,
      context: data.context || '',
      recurrence: data.recurrence || ''
    };
    await db.megaTransactions.put(megaTx);
  }
  return data;
};

export const deleteTransaction = async (id: string) => {
  const { error } = await getSupabase()
    .from('transaction')
    .delete()
    .eq('id', id);

  if (error) throw error;
  await db.megaTransactions.delete(id);
};

export const saveTransfer = async (
  date: string,
  fromAccountId: string,
  fromAmount: number,
  toAccountId: string,
  toAmount: number,
  transferCategoryId: string
) => {
  const fromAccount = await db.accounts.get(fromAccountId);
  const toAccount = await db.accounts.get(toAccountId);
  if (!fromAccount || !toAccount) throw new Error("Account(s) not found");

  const amountBaseFrom = await calculateBaseAmountInCHF(-Math.abs(fromAmount), fromAccount.currency, date);
  const amountBaseTo = await calculateBaseAmountInCHF(Math.abs(toAmount), toAccount.currency, date);

  const tx1: Partial<DbTransaction> = {
    date: date,
    account_id: fromAccountId,
    amount_original: -Math.abs(fromAmount),
    category_id: transferCategoryId,
    subcategory_id: null,
    note: `Transfer to ${toAccount.name}`,
    tag: null,
    analytics_included: false,
    context: 'personal',
    recurrence: null,
    amount_base: amountBaseFrom
  };

  const tx2: Partial<DbTransaction> = {
    date: date,
    account_id: toAccountId,
    amount_original: Math.abs(toAmount),
    category_id: transferCategoryId,
    subcategory_id: null,
    note: `Transfer from ${fromAccount.name}`,
    tag: null,
    analytics_included: false,
    context: 'personal',
    recurrence: null,
    amount_base: amountBaseTo
  };

  const { data, error } = await getSupabase()
    .from('transaction')
    .insert([tx1, tx2])
    .select();

  if (error) throw error;

  if (data && data.length === 2) {
    const category = await db.categories.get(transferCategoryId);
    const megaTxs: MegaTransaction[] = [
      {
        id: data[0].id,
        date: data[0].date,
        account_id: fromAccount.id,
        account_name: fromAccount.name,
        currency: fromAccount.currency,
        amount_original: data[0].amount_original,
        amount_base: data[0].amount_base,
        category_id: transferCategoryId,
        category_name: category ? category.name : 'Transfer',
        subcategory_id: null,
        subcategory_name: '-',
        note: data[0].note || '',
        tag: '',
        analytics_included: false,
        context: 'personal',
        recurrence: ''
      },
      {
        id: data[1].id,
        date: data[1].date,
        account_id: toAccount.id,
        account_name: toAccount.name,
        currency: toAccount.currency,
        amount_original: data[1].amount_original,
        amount_base: data[1].amount_base,
        category_id: transferCategoryId,
        category_name: category ? category.name : 'Transfer',
        subcategory_id: null,
        subcategory_name: '-',
        note: data[1].note || '',
        tag: '',
        analytics_included: false,
        context: 'personal',
        recurrence: ''
      }
    ];
    await db.megaTransactions.bulkPut(megaTxs);
  }
};
