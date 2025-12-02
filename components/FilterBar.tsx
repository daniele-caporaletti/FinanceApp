
import React, { useState } from 'react';
import { Calendar, Filter, Layers, Tag, Repeat, Briefcase, BarChart3, Wallet, Coins, User, ChevronDown, ChevronUp, Search, PieChart } from 'lucide-react';
import { DbAccount, DbCategory, DbSubcategory } from '../types';
import { CustomSelect } from './CustomSelect';

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
  searchQuery: string;

  onYearChange: (year: number | 'ALL') => void;
  onMonthChange: (month: number | 'ALL') => void;
  onCategoryChange: (categoryId: string | 'ALL') => void;
  onSubcategoryChange: (subcategoryId: string | 'ALL') => void;
  onAccountChange: (accountId: string | 'ALL') => void;
  
  onRecurrenceChange: (val: 'ALL' | 'ONE_OFF' | 'RECURRING') => void;
  onContextChange: (val: 'ALL' | 'PERSONAL' | 'WORK') => void;
  onAmountChange: (val: 'ALL' | 'INCOME' | 'EXPENSE') => void;
  
  onViewTransfersChange: (val: boolean) => void;
  onSearchChange: (val: string) => void;
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
  searchQuery,
  onYearChange,
  onMonthChange,
  onCategoryChange,
  onSubcategoryChange,
  onAccountChange,
  onRecurrenceChange,
  onContextChange,
  onAmountChange,
  onViewTransfersChange,
  onSearchChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const availableSubcategories = selectedCategoryId === 'ALL' 
    ? [] 
    : subcategories.filter(s => s.category_id === selectedCategoryId);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 mb-6 transition-all relative z-20">
      
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
        
        {/* --- GRID SYSTEM FOR PERFECT ALIGNMENT --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            
            {/* 1. Global Search */}
            <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Ricerca Libera</label>
                <div className="relative w-full">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow h-[42px]"
                    placeholder="Cerca in note, categorie, tag..."
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                </div>
            </div>

            {/* 2. Year */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Anno</label>
              <CustomSelect
                value={selectedYear}
                onChange={onYearChange}
                options={[
                  { value: 'ALL', label: 'Tutti gli anni' },
                  ...years.map(y => ({ value: y, label: y.toString() }))
                ]}
                icon={<Calendar size={14} />}
              />
            </div>

            {/* 3. Month */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Mese</label>
              <CustomSelect
                value={selectedMonth}
                onChange={onMonthChange}
                options={[
                  { value: 'ALL', label: 'Tutti i mesi' },
                  ...MONTHS.map((m, i) => ({ value: i, label: m }))
                ]}
                icon={<Calendar size={14} />}
              />
            </div>

            {/* 4. Account */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Conto</label>
              <CustomSelect
                value={selectedAccountId}
                onChange={onAccountChange}
                options={[
                  { value: 'ALL', label: 'Tutti i conti' },
                  ...accounts.map(a => ({ value: a.id, label: a.name }))
                ]}
                icon={<Wallet size={14} />}
              />
            </div>

            {/* 5. Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Categoria</label>
              <CustomSelect
                value={selectedCategoryId}
                onChange={onCategoryChange}
                options={[
                  { value: 'ALL', label: 'Tutte le categorie' },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
                ]}
                icon={<Layers size={14} />}
              />
            </div>

            {/* 6. Subcategory */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Sottocategoria</label>
              <CustomSelect
                value={selectedSubcategoryId}
                onChange={onSubcategoryChange}
                options={[
                  { value: 'ALL', label: selectedCategoryId === 'ALL' ? '-' : 'Tutte' },
                  ...availableSubcategories.map(s => ({ value: s.id, label: s.name }))
                ]}
                disabled={selectedCategoryId === 'ALL'}
                icon={<Tag size={14} />}
              />
            </div>

             {/* 7. Amount Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Tipo Importo</label>
              <CustomSelect
                value={amountFilter}
                onChange={onAmountChange}
                options={[
                  { value: 'ALL', label: 'Tutti' },
                  { value: 'INCOME', label: 'Entrate' },
                  { value: 'EXPENSE', label: 'Uscite' }
                ]}
                icon={<Coins size={14} />}
              />
            </div>

            {/* 8. Recurrence */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Ricorrenza</label>
              <CustomSelect
                value={recurrenceFilter}
                onChange={onRecurrenceChange}
                options={[
                  { value: 'ALL', label: 'Tutti' },
                  { value: 'ONE_OFF', label: 'Singoli' },
                  { value: 'RECURRING', label: 'Ricorrenti' }
                ]}
                icon={<Repeat size={14} />}
              />
            </div>

            {/* 9. Context */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Contesto</label>
              <CustomSelect
                value={contextFilter}
                onChange={onContextChange}
                options={[
                  { value: 'ALL', label: 'Tutti' },
                  { value: 'PERSONAL', label: 'Personale' },
                  { value: 'WORK', label: 'Lavoro' }
                ]}
                icon={<User size={14} />}
              />
            </div>

            {/* 10. Toggle: View Transfers (Span 2 on small screens for better fit) */}
            <div className="sm:col-span-2">
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Opzioni Visualizzazione</label>
               <label className="flex items-center cursor-pointer select-none group w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-[9px] hover:bg-slate-100 transition-colors h-[42px]">
                  <div className="relative shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={viewTransfers}
                      onChange={(e) => onViewTransfersChange(e.target.checked)}
                    />
                    <div className="block bg-slate-300 w-9 h-5 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform peer-checked:translate-x-4"></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-slate-600 group-hover:text-indigo-700 flex items-center gap-2 transition-colors">
                     <BarChart3 size={16} />
                     <span>Includi Giroconti / Trasferimenti</span>
                  </div>
               </label>
            </div>

        </div>
      </div>
    </div>
  );
};
