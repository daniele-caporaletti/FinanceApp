import React, { useState } from 'react';
import { Calendar, Filter, Layers, Tag, Repeat, Briefcase, BarChart3, Wallet, Coins, User, ChevronDown, ChevronUp } from 'lucide-react';
import { DbAccount, DbCategory, DbSubcategory } from '../types';

interface FilterBarProps {
  years: number[];
  categories: DbCategory[];
  subcategories: DbSubcategory[];
  accounts: DbAccount[];
  
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

  const availableSubcategories = selectedCategoryId === 'ALL' 
    ? [] 
    : subcategories.filter(s => s.category_id === selectedCategoryId);

  return (
    <div className="bg-white/70 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col gap-5 mb-6 transition-all relative z-20">
      
      {/* --- Header --- */}
      <div 
        className="flex items-center justify-between text-slate-500 font-medium pb-2 border-b border-slate-100 cursor-pointer md:cursor-default"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-indigo-600">
          <div className="bg-indigo-50 p-1.5 rounded-lg">
             <Filter size={18} />
          </div>
          <span className="font-bold text-slate-700">Filtri Avanzati</span>
        </div>
        <div className="md:hidden text-slate-400 bg-slate-50 p-1 rounded-full">
           {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      <div className={`flex flex-col gap-5 ${isExpanded ? 'flex' : 'hidden md:flex'}`}>
        
        {/* --- ROW 1: Primary Dimensions --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Year */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Anno</label>
            <div className="relative group">
              <select
                  value={selectedYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    onYearChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer text-sm shadow-sm group-hover:border-slate-300"
              >
                  <option value="ALL">Tutti gli anni</option>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Calendar size={14} />
              </div>
            </div>
          </div>

          {/* Month */}
          <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Mese</label>
            <div className="relative group">
              <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    onMonthChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer text-sm shadow-sm group-hover:border-slate-300"
              >
                  <option value="ALL">Tutti i mesi</option>
                  {MONTHS.map((month, index) => <option key={index} value={index}>{month}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Calendar size={14} />
              </div>
            </div>
          </div>

          {/* Account Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Conto</label>
            <div className="relative group">
              <select
                  value={selectedAccountId}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer text-sm shadow-sm group-hover:border-slate-300"
              >
                  <option value="ALL">Tutti i conti</option>
                  {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Wallet size={14} />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Categoria</label>
            <div className="relative group">
              <select
                  value={selectedCategoryId}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer text-sm shadow-sm group-hover:border-slate-300"
              >
                  <option value="ALL">Tutte le categorie</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Layers size={14} />
              </div>
            </div>
          </div>

          {/* Subcategory */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Sottocategoria</label>
            <div className="relative group">
              <select
                  value={selectedSubcategoryId}
                  onChange={(e) => onSubcategoryChange(e.target.value)}
                  disabled={selectedCategoryId === 'ALL'}
                  className={`w-full appearance-none border py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none transition-all text-sm shadow-sm
                      ${selectedCategoryId === 'ALL' 
                          ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                          : 'bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer group-hover:border-slate-300'
                      }`}
              >
                  <option value="ALL">
                      {selectedCategoryId === 'ALL' ? '-' : 'Tutte'}
                  </option>
                  {availableSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Tag size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* --- ROW 2: Attributes & Toggles --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
          
           {/* Recurrence Type */}
           <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Ricorrenza</label>
            <div className="relative group">
              <select
                  value={recurrenceFilter}
                  onChange={(e) => onRecurrenceChange(e.target.value as any)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer text-sm shadow-sm group-hover:border-slate-300"
              >
                  <option value="ALL">Tutti</option>
                  <option value="ONE_OFF">Singoli</option>
                  <option value="RECURRING">Ricorrenti</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Repeat size={14} />
              </div>
            </div>
          </div>

          {/* Context Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Contesto</label>
            <div className="relative group">
              <select
                  value={contextFilter}
                  onChange={(e) => onContextChange(e.target.value as any)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer text-sm shadow-sm group-hover:border-slate-300"
              >
                  <option value="ALL">Tutti</option>
                  <option value="PERSONAL">Personale</option>
                  <option value="WORK">Lavoro</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <User size={14} />
              </div>
            </div>
          </div>

          {/* Amount Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Tipo Importo</label>
            <div className="relative group">
              <select
                  value={amountFilter}
                  onChange={(e) => onAmountChange(e.target.value as any)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer text-sm shadow-sm group-hover:border-slate-300"
              >
                  <option value="ALL">Tutti</option>
                  <option value="INCOME">Entrate</option>
                  <option value="EXPENSE">Uscite</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <Coins size={14} />
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block"></div>

          {/* Toggle: View Transfers */}
          <div className="relative flex items-center h-full pt-4">
             <label className="flex items-center cursor-pointer select-none group w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-100 transition-colors">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={viewTransfers}
                    onChange={(e) => onViewTransfersChange(e.target.checked)}
                  />
                  <div className="block bg-slate-300 w-9 h-5 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
                  <div className="dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <div className="ml-3 text-sm font-bold text-slate-600 group-hover:text-indigo-700 flex items-center gap-2 transition-colors">
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