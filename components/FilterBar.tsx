import React, { useState } from 'react';
import { Calendar, Filter, Layers, Tag, Repeat, User, Coins, ChevronDown, ChevronUp, Wallet, Check } from 'lucide-react';
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

  // Common styling for our "Pretty Selects"
  const selectContainerClass = "relative group";
  const selectClass = "w-full appearance-none bg-white border border-slate-200 text-slate-700 font-medium py-3 px-4 pr-10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer text-sm shadow-sm hover:border-indigo-200";
  const iconClass = "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block";

  return (
    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white/60 flex flex-col gap-6 mb-8 transition-all relative z-20">
      
      {/* --- Header --- */}
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20">
             <Filter size={18} />
          </div>
          <div>
            <span className="font-bold text-slate-800 text-lg">Filtri Avanzati</span>
            <p className="text-xs text-slate-500 font-medium">Affina la tua ricerca</p>
          </div>
        </div>
        <button className="text-slate-400 bg-white border border-slate-100 p-2 rounded-full hover:bg-slate-50 hover:text-slate-600 transition-colors">
           {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      <div className={`flex flex-col gap-6 ${isExpanded ? 'flex animate-in slide-in-from-top-2' : 'hidden md:flex'}`}>
        
        {/* --- ROW 1: Primary Dimensions --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          
          {/* Year */}
          <div>
            <label className={labelClass}>Anno</label>
            <div className={selectContainerClass}>
              <select
                  value={selectedYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    onYearChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                  }}
                  className={selectClass}
              >
                  <option value="ALL">Tutti gli anni</option>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <ChevronDown size={16} className={iconClass} />
            </div>
          </div>

          {/* Month */}
          <div>
            <label className={labelClass}>Mese</label>
            <div className={selectContainerClass}>
              <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    onMonthChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
                  }}
                  className={selectClass}
              >
                  <option value="ALL">Tutti i mesi</option>
                  {MONTHS.map((month, index) => <option key={index} value={index}>{month}</option>)}
              </select>
              <ChevronDown size={16} className={iconClass} />
            </div>
          </div>

          {/* Account Filter */}
          <div>
            <label className={labelClass}>Conto</label>
            <div className={selectContainerClass}>
              <select
                  value={selectedAccountId}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className={selectClass}
              >
                  <option value="ALL">Tutti i conti</option>
                  {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              <Wallet size={16} className={iconClass} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Categoria</label>
            <div className={selectContainerClass}>
              <select
                  value={selectedCategoryId}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className={selectClass}
              >
                  <option value="ALL">Tutte</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Layers size={16} className={iconClass} />
            </div>
          </div>

          {/* Subcategory */}
          <div>
            <label className={labelClass}>Sottocategoria</label>
            <div className={selectContainerClass}>
              <select
                  value={selectedSubcategoryId}
                  onChange={(e) => onSubcategoryChange(e.target.value)}
                  disabled={selectedCategoryId === 'ALL'}
                  className={`${selectClass} ${selectedCategoryId === 'ALL' ? 'bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100' : ''}`}
              >
                  <option value="ALL">
                      {selectedCategoryId === 'ALL' ? '-' : 'Tutte'}
                  </option>
                  {availableSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Tag size={16} className={iconClass} />
            </div>
          </div>
        </div>

        {/* --- ROW 2: Attributes & Toggles --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 pt-6 border-t border-slate-100/60">
          
           {/* Recurrence Type */}
           <div>
            <label className={labelClass}>Ricorrenza</label>
            <div className={selectContainerClass}>
              <select
                  value={recurrenceFilter}
                  onChange={(e) => onRecurrenceChange(e.target.value as any)}
                  className={selectClass}
              >
                  <option value="ALL">Tutti</option>
                  <option value="ONE_OFF">Singoli (Una tantum)</option>
                  <option value="RECURRING">Ricorrenti (Abbonamenti)</option>
              </select>
              <Repeat size={16} className={iconClass} />
            </div>
          </div>

          {/* Context Filter */}
          <div>
            <label className={labelClass}>Contesto</label>
            <div className={selectContainerClass}>
              <select
                  value={contextFilter}
                  onChange={(e) => onContextChange(e.target.value as any)}
                  className={selectClass}
              >
                  <option value="ALL">Tutti</option>
                  <option value="PERSONAL">Personale</option>
                  <option value="WORK">Lavoro / Business</option>
              </select>
              <User size={16} className={iconClass} />
            </div>
          </div>

          {/* Amount Type Filter */}
          <div>
            <label className={labelClass}>Flusso</label>
            <div className={selectContainerClass}>
              <select
                  value={amountFilter}
                  onChange={(e) => onAmountChange(e.target.value as any)}
                  className={selectClass}
              >
                  <option value="ALL">Tutto</option>
                  <option value="INCOME">Entrate (Positivi)</option>
                  <option value="EXPENSE">Uscite (Negativi)</option>
              </select>
              <Coins size={16} className={iconClass} />
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block"></div>

          {/* Toggle: View Transfers */}
          <div className="relative flex items-end h-full">
             <label className={`
                flex items-center justify-between cursor-pointer select-none w-full border rounded-2xl px-5 py-3 transition-all group
                ${viewTransfers ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}
             `}>
                <div className="flex items-center gap-3">
                   <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center transition-colors
                      ${viewTransfers ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}
                   `}>
                      <Check size={12} strokeWidth={3} />
                   </div>
                   <div className="flex flex-col">
                      <span className={`text-sm font-bold ${viewTransfers ? 'text-indigo-900' : 'text-slate-600'}`}>Vedi Trasferimenti</span>
                      <span className="text-[10px] text-slate-400 font-medium">Includi giroconti</span>
                   </div>
                </div>
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={viewTransfers}
                  onChange={(e) => onViewTransfersChange(e.target.checked)}
                />
             </label>
          </div>

        </div>

      </div>
    </div>
  );
};