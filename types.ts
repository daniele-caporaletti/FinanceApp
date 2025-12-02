
// Raw Database Types matching the Schema Image
export interface DbAccount {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
  is_select: boolean;
}

export interface DbCategory {
  id: string;
  name: string;
}

export interface DbSubcategory {
  id: string;
  category_id: string;
  name: string;
}

export interface DbTransaction {
  id: string;
  date: string;
  account_id: string;
  amount_original: number;
  category_id: string;
  subcategory_id?: string | null;
  note?: string | null;
  tag?: string | null;
  amount_base: number;
  analytics_included: boolean;
  context?: string | null;
  recurrence?: string | null;
}

// Investment Types
export interface DbInvestment {
  id: string;
  name: string;
  is_for_retirement: boolean;
  currency: string;
  note?: string; // Added note field
}

export interface DbInvestmentTrend {
  id: string;
  investment_id: string;
  month: number;
  year: number;
  value: number;
  cash_flow: number;
}

// The "Mega Join" Flattened Structure for Frontend Display
export interface MegaTransaction {
  id: string;
  date: string; // ISO Date string
  
  // Account Info
  account_id: string; // Added for filtering/linking
  account_name: string;
  currency: string;
  
  // Financials
  amount_original: number;
  amount_base: number;
  
  // Categorization
  category_id: string; // Added for filtering
  category_name: string;
  subcategory_id: string | null; // Added for filtering
  subcategory_name: string; // "Uncategorized" or actual name
  
  // Metadata
  note: string;
  tag: string;
  analytics_included: boolean;
  context: string;
  recurrence: string;
}
