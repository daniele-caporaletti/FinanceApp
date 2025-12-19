
export interface Account {
  id: string;
  user_id: string;
  name: string;
  currency_code: string;
  status: string;
  exclude_from_overview: boolean;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  is_archived: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  occurred_on: string;
  kind: 'income' | 'expense' | 'transfer' | string;
  account_id: string;
  amount_original: number;
  amount_base: number;
  category_id: string | null;
  tag: string | null;
  description: string | null;
  essential_transaction_id: string | null; // Foreign Key
}

export interface EssentialTransaction {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  occurred_on: string; 
  kind: 'income' | 'expense' | 'transfer' | string;
  amount_original: number;
  currency_original: string; // Rinominato per corrispondere al DB
  category_id: string | null;
  description: string | null; // Note
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  is_for_retirement: boolean;
  currency: string;
  note: string | null;
}

export interface InvestmentTrend {
  id: string;
  investment_id: string;
  value_on: string; 
  cash_flow: number; 
  value_original: number; 
}

export interface FinanceData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  essentialTransactions: EssentialTransaction[];
  investments: Investment[];
  investmentTrends: InvestmentTrend[];
  isSyncing: boolean;
  error: string | null;
}

export enum AppSection {
  Dashboard = 'dashboard',
  Movimenti = 'movimenti',
  Tag = 'tag',
  Conti = 'conti',
  Categorie = 'categorie',
  Investimenti = 'investimenti',
  Analisi = 'analisi',
  SpeseEssenziali = 'spese_essenziali'
}
