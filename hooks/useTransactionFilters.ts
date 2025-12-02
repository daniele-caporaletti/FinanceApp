
import { useState, useMemo, useCallback } from 'react';
import { MegaTransaction, DbAccount } from '../types';

export interface FilterState {
  year: number | 'ALL';
  month: number | 'ALL';
  categoryId: string | 'ALL';
  subcategoryId: string | 'ALL';
  accountId: string | 'ALL';
  recurrence: 'ALL' | 'ONE_OFF' | 'RECURRING';
  context: 'ALL' | 'PERSONAL' | 'WORK';
  amount: 'ALL' | 'INCOME' | 'EXPENSE';
  viewTransfers: boolean;
  excludeCategoryId?: string | null; // New hidden filter
}

export const useTransactionFilters = (transactions: MegaTransaction[] | undefined, accounts: DbAccount[] | undefined) => {
  // State for all filters
  const [filters, setFilters] = useState<FilterState>({
    year: 'ALL',
    month: 'ALL',
    categoryId: 'ALL',
    subcategoryId: 'ALL',
    accountId: 'ALL',
    recurrence: 'ALL',
    context: 'ALL',
    amount: 'ALL',
    viewTransfers: false,
    excludeCategoryId: null
  });

  // Derived: Available Years
  const availableYears = useMemo(() => {
    if (!transactions) return [];
    const years = new Set(transactions.map(t => parseInt(t.date.substring(0, 4), 10)));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Derived: Selectable Accounts (Only is_select=true)
  const selectableAccounts = useMemo(() => {
    return accounts?.filter(a => a.is_select) || [];
  }, [accounts]);

  // Derived: Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter(t => {
      // 1. Date Filters
      const txYear = parseInt(t.date.substring(0, 4), 10);
      const txMonth = parseInt(t.date.substring(5, 7), 10) - 1;

      if (filters.year !== 'ALL' && txYear !== filters.year) return false;
      if (filters.month !== 'ALL' && txMonth !== filters.month) return false;

      // 2. Categorization Filters
      if (filters.categoryId !== 'ALL' && t.category_id !== filters.categoryId) return false;
      if (filters.subcategoryId !== 'ALL' && t.subcategory_id !== filters.subcategoryId) return false;
      
      // 2b. Exclusion Filter (Hidden)
      if (filters.excludeCategoryId && t.category_id === filters.excludeCategoryId) return false;
      
      // 3. Account Filter
      if (filters.accountId !== 'ALL' && t.account_id !== filters.accountId) return false;

      // 4. Attribute Filters
      const rawRecurrence = t.recurrence ? t.recurrence.trim().toLowerCase() : '';
      const isRecurring = rawRecurrence.length > 0 && rawRecurrence !== 'one_off' && rawRecurrence !== 'none';
      
      if (filters.recurrence === 'ONE_OFF' && isRecurring) return false;
      if (filters.recurrence === 'RECURRING' && !isRecurring) return false;

      // 5. Transfer/Analytics
      // If viewTransfers is FALSE, we hide transactions where analytics_included is FALSE
      if (!filters.viewTransfers && t.analytics_included === false) return false;

      // 6. Context
      const isWork = t.context && t.context.toLowerCase() === 'work';
      if (filters.context === 'PERSONAL' && isWork) return false;
      if (filters.context === 'WORK' && !isWork) return false;

      // 7. Amount Type
      if (filters.amount === 'INCOME' && t.amount_base <= 0) return false;
      if (filters.amount === 'EXPENSE' && t.amount_base >= 0) return false;

      return true;
    });
  }, [transactions, filters]);

  // Setter helpers
  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetCategoryFilters = useCallback(() => {
    setFilters(prev => ({ ...prev, categoryId: 'ALL', subcategoryId: 'ALL', excludeCategoryId: null }));
  }, []);

  return {
    filters,
    setFilter,
    resetCategoryFilters,
    setFilters, // Expose full setter for bulk updates (navigation)
    filteredTransactions,
    availableYears,
    selectableAccounts
  };
};
