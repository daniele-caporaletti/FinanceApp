import React, { useState } from 'react';
import { Calendar, Filter, Layers, Tag, Repeat, Briefcase, BarChart3, Wallet, Coins, User, ChevronDown, ChevronUp } from 'lucide-react';
import { DbAccount, DbCategory, DbSubcategory } from '../types';

interface FilterBarProps {
  years: number[];
  categories: DbCategory[];
  subcategories: DbSubcategory[];
  accounts: DbAccount[]; // Only "is_select=true" accounts should be passed here
  
  selectedYear: number | 'ALL';
  selectedMonth: number | 'ALL';
  selectedCategoryId: string | 'ALL';
  selectedSubcategoryId: string | 'ALL';
  selectedAccountId: string | 'ALL';
  
  recurrenceFilter: 'ALL' | 'ONE_OFF' | 'RECURRING';
  contextFilter: 'ALL' | 'PERSONAL' | 'WORK';
  amountFilter: 'ALL' | 'INCOME' | 'EXPENSE';
  
  viewTransfers: boolean;

  onYearChange: (year: number | 'ALL') => void;
  onMonthChange: (month: number | 'ALL') => void;
  onCategoryChange: (categoryId: string | 'ALL') => void;
  onSubcategoryChange: (subcategoryId: string | 'ALL') => void;
  onAccountChange: (accountId: string | 'ALL') => void;
  
  onRecurrenceChange: (val: 'ALL' | 'ONE_OFF' | 'RECURRING') => void;
  onContextChange: (val: 'ALL' | 'PERSONAL' | 'WORK') => void;
  onAmountChange: (val: 'ALL' | 'INCOME' | 'EXPENSE') => void;
  
  onViewTransfersChange: (val: boolean) => void;
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export const FilterBar: React.FC<FilterBarProps> = ({
  years,
  categories,
  subcategories,
  accounts,
  selectedYear,
  selectedMonth,
  selectedCategoryId,
  selectedSubcategoryId,
  selectedAccountId,
  recurrenceFilter,
  contextFilter,
  amountFilter,
  viewTransfers,
  onYearChange,
  onMonthChange,
  onCategoryChange,
  onSubcategoryChange,
  onAccountChange,
  onRecurrenceChange,
  onContextChange,
  onAmountChange,
  onViewTransfersChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter subcategories based on selected category
  const availableSubcategories = selectedCategoryId === 'ALL' 
    ? [] 
    : subcategories.filter(s => s.category_id === selectedCategoryId);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-5 mb-6 transition-all">
      
      {/* --- Header --- */}
      <div 
        className="flex items-center justify-between text-slate-500 font-medium pb-2 border-b border-slate-100 cursor-pointer md:cursor-default"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter size={20} />
          <span>Filtri Avanzati</span>
        </div>
        <div className="md:hidden text-slate-400">
           {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      <div className={`flex flex-col gap-4 ${isExpanded ? 'flex' : 'hidden md:flex'}`}>
        
        {/* --- ROW 1: Primary Dimensions (Date & Category) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Year */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Anno</label>
            <div className="relative">
              <select
                  value={selectedYear}
                  onChange={(e) => {
                  const val = e.target.value;
                  onYearChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                  }}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer text-sm"
              >
                  <option value="ALL">Tutti gli anni</option>
                  {years.map((year) => (
                  <option key={year} value={year}>
                      {year}
                  </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Calendar size={16} />
              </div>
            </div>
          </div>

          {/* Month */}
          <div className="relative">
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Mese</label>
            <div className="relative">
              <select
                  value={selectedMonth}
                  onChange={(e) => {
                  const val = e.target.value;
                  onMonthChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                  }}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer text-sm"
              >
                  <option value="ALL">Tutti i mesi</option>
                  {MONTHS.map((month, index) => (
                  <option key={index} value={index}>
                      {month}
                  </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Calendar size={16} />
              </div>
            </div>
          </div>

          {/* Account Filter */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Conto</label>
            <div className="relative">
              <select
                  value={selectedAccountId}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer text-sm"
              >
                  <option value="ALL">Tutti i conti</option>
                  {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                      {acc.name}
                  </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Wallet size={16} />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Categoria</label>
            <div className="relative">
              <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                      const val = e.target.value;
                      onCategoryChange(val);
                  }}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer text-sm"
              >
                  <option value="ALL">Tutte le categorie</option>
                  {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                      {c.name}
                  </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Layers size={16} />
              </div>
            </div>
          </div>

          {/* Subcategory */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Sottocategoria</label>
            <div className="relative">
              <select
                  value={selectedSubcategoryId}
                  onChange={(e) => onSubcategoryChange(e.target.value)}
                  disabled={selectedCategoryId === 'ALL'}
                  className={`w-full appearance-none border py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none transition-colors text-sm
                      ${selectedCategoryId === 'ALL' 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-slate-50 border-slate-300 text-slate-700 focus:bg-white focus:border-indigo-500 cursor-pointer'
                      }`}
              >
                  <option value="ALL">
                      {selectedCategoryId === 'ALL' ? '-' : 'Tutte le sottocategorie'}
                  </option>
                  {availableSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                      {s.name}
                  </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Tag size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* --- ROW 2: Attributes & Toggles --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-slate-100">
          
           {/* Recurrence Type */}
           <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Ricorrenza</label>
            <div className="relative">
              <select
                  value={recurrenceFilter}
                  onChange={(e) => onRecurrenceChange(e.target.value as any)}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer text-sm"
              >
                  <option value="ALL">Tutti</option>
                  <option value="ONE_OFF">Singoli</option>
                  <option value="RECURRING">Ricorrenti</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Repeat size={16} />
              </div>
            </div>
          </div>

          {/* Context Filter (Personal/Work) */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Contesto</label>
            <div className="relative">
              <select
                  value={contextFilter}
                  onChange={(e) => onContextChange(e.target.value as any)}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer text-sm"
              >
                  <option value="ALL">Tutti</option>
                  <option value="PERSONAL">Solo Personale</option>
                  <option value="WORK">Solo Lavoro</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <User size={16} />
              </div>
            </div>
          </div>

          {/* Amount Type Filter (Income/Expense) */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Tipo Importo</label>
            <div className="relative">
              <select
                  value={amountFilter}
                  onChange={(e) => onAmountChange(e.target.value as any)}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer text-sm"
              >
                  <option value="ALL">Tutti</option>
                  <option value="INCOME">Entrate (Positivi)</option>
                  <option value="EXPENSE">Uscite (Negativi)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Coins size={16} />
              </div>
            </div>
          </div>

          {/* Spacer for layout balance */}
          <div className="hidden lg:block"></div>

          {/* Toggle: View Transfers (Vedi Trasferimenti) */}
          <div className="relative flex items-center h-full pt-4">
             <label className="flex items-center cursor-pointer select-none group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={viewTransfers}
                    onChange={(e) => onViewTransfersChange(e.target.checked)}
                  />
                  <div className="block bg-slate-200 w-10 h-6 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
                  <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <div className="ml-3 text-sm font-medium text-slate-600 group-hover:text-slate-800 flex items-center gap-1.5">
                   <BarChart3 size={16} />
                   <span>Vedi Trasferimenti</span>
                </div>
             </label>
          </div>

        </div>

      </div>
    </div>
  );
};