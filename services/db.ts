import Dexie, { Table } from 'dexie';
import { MegaTransaction, DbCategory, DbSubcategory, DbAccount } from '../types';
import { DB_NAME, DB_VERSION } from '../constants';

export class FinanceDatabase extends Dexie {
  // We declare our tables
  megaTransactions!: Table<MegaTransaction, string>;
  categories!: Table<DbCategory, string>;
  subcategories!: Table<DbSubcategory, string>;
  accounts!: Table<DbAccount, string>;

  constructor() {
    super(DB_NAME);
  }
}

export const db = new FinanceDatabase();

// Define schema
db.version(DB_VERSION).stores({
  megaTransactions: 'id, date, account_id, account_name, category_name, amount_base',
  categories: 'id, name',
  subcategories: 'id, category_id, name',
  accounts: 'id, name, is_active, is_select'
});