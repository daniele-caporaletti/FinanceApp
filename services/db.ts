import Dexie, { Table } from 'dexie';
import { MegaTransaction, DbCategory, DbSubcategory, DbAccount, DbInvestment, DbInvestmentTrend } from '../types';
import { DB_NAME, DB_VERSION } from '../constants';

export class FinanceDatabase extends Dexie {
  // We declare our tables
  megaTransactions!: Table<MegaTransaction, string>;
  categories!: Table<DbCategory, string>;
  subcategories!: Table<DbSubcategory, string>;
  accounts!: Table<DbAccount, string>;
  investments!: Table<DbInvestment, string>;
  investmentTrends!: Table<DbInvestmentTrend, string>;

  constructor() {
    super(DB_NAME);
    (this as any).version(DB_VERSION).stores({
      megaTransactions: 'id, date, account_id, account_name, category_name, amount_base',
      categories: 'id, name',
      subcategories: 'id, category_id, name',
      accounts: 'id, name, is_active, is_select',
      investments: 'id, name, is_for_retirement',
      investmentTrends: 'id, investment_id, [investment_id+year+month]'
    });
  }
}

export const db = new FinanceDatabase();