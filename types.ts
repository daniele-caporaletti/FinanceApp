
export interface Account {
  id: string;
  user_id: string;
  name: string;
  currency_code: string;
  status: string;
  kind: 'cash' | 'pocket' | 'invest' | 'pension';
  exclude_from_overview: boolean;
  note: string | null;
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
  // Updated kinds based on user specific list
  kind: 
    | 'expense_personal' 
    | 'expense_essential' 
    | 'expense_work'
    | 'income_personal'
    | 'income_essential'
    | 'income_work'
    | 'income_pension'
    | 'transfer_generic' 
    | 'transfer_budget' 
    | 'transfer_pocket' 
    | 'transfer_invest' 
    | 'transfer_pension' 
    | 'adjustment'
    | string; // Keep string for legacy/migration safety
  account_id: string;
  amount_original: number;
  amount_base: number;
  category_id: string | null;
  tag: string | null;
  description: string | null;
  essential_transaction_id: string | null;
}

export interface EssentialTransaction {
  id: string;
  user_id: string;
  name: string;
  occurred_on: string; 
  kind: 'income' | 'expense' | 'transfer' | string;
  amount_original: number;
  currency_original: string;
  category_id: string | null;
  description: string | null;
}

export interface FinanceData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  essentialTransactions: EssentialTransaction[];
  isSyncing: boolean;
  error: string | null;
}

export enum AppSection {
  Dashboard = 'dashboard',
  Movimenti = 'movimenti',
  Tag = 'tag',
  Conti = 'conti',
  Categorie = 'categorie',
  Portfolio = 'portfolio',
  Analisi = 'analisi',
  SpeseEssenziali = 'spese_essenziali'
}
