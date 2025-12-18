
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
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  occurred_on: string; // Usato come data di riferimento (es. giorno del mese)
  kind: 'income' | 'expense' | 'transfer' | string;
  amount_original: number;
  category_id: string | null;
  frequency?: 'monthly' | 'yearly';
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
  value_on: string; // Corrisponde alla colonna del DB
  cash_flow: number; // Versato nel mese
  value_original: number; // Valore di mercato alla data (colonna DB)
}

export interface FinanceData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
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
  Ricorrenze = 'ricorrenze'
}
