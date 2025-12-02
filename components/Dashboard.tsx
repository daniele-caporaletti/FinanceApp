
import React, { useState, useMemo } from 'react';
import { MegaTransaction, DbAccount, DbCategory } from '../types';
import { Calendar, TrendingDown, Wallet, Building2, Folder, ArrowUpRight, ChevronRight, Layers } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { splitCurrency, MONTHS, formatCurrency } from '../utils';

export interface NavigationFilters {
  year: number;
  month: number;
  recurrence: 'ALL' | 'ONE_OFF' | 'RECURRING';
  context: 'ALL' | 'PERSONAL' | 'WORK';
  amount: 'ALL' | 'INCOME' | 'EXPENSE';
  viewTransfers: boolean;
  categoryId?: string; 
  excludeCategoryId?: string; // New hidden filter support
}

interface DashboardProps {
  transactions: MegaTransaction[];
  accounts: DbAccount[];
  categories: DbCategory[]; 
  years: number[];
  onNavigateToAccounts: () => void;
  onNavigateToTransactions: (filters: NavigationFilters) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  accounts, 
  categories,
  years,
  onNavigateToAccounts,
  onNavigateToTransactions
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());

  // --- KPI Calculations ---
  const netWorthCHF = useMemo(() => {
    const selectedAccountIds = new Set(accounts.filter(a => a.is_select).map(a => a.id));
    return transactions
      .filter(t => selectedAccountIds.has(t.account_id))
      .reduce((sum, t) => sum + t.amount_base, 0);
  }, [transactions, accounts]);

  const activeAccountBalances = useMemo(() => {
    const activeAccounts = accounts.filter(a => a.is_active);
    const balances = new Map<string, number>();
    activeAccounts.forEach(a => balances.set(a.id, 0));
    transactions.forEach(t => {
      if (balances.has(t.account_id)) {
        balances.set(t.account_id, (balances.get(t.account_id) || 0) + t.amount_original);
      }
    });
    return activeAccounts.map(a => ({ ...a, balance: balances.get(a.id) || 0 }));
  }, [transactions, accounts]);

  const monthlyData = useMemo(() => {
    const data = Array(12).fill(null).map(() => ({
      variableExpenses: 0, 
      fixedExpenses: 0, 
      investments: 0, 
      totalCommitted: 0, 
      income: 0, 
      workAdvances: 0, 
      workReimbursements: 0
    }));

    transactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() !== selectedYear || !t.analytics_included) return;
      
      const monthIndex = date.getMonth();
      const amount = t.amount_base;
      const isWork = t.context === 'work';
      const isPersonal = t.context === 'personal';
      const recurrence = t.recurrence ? t.recurrence.toLowerCase() : '';
      const isRecurring = recurrence === 'recurring';
      const isOneOff = recurrence === 'one_off';
      
      // Check for Investment Category
      const isInvestment = t.category_name.toLowerCase() === 'investment';

      // Investment Logic
      if (isInvestment) {
        data[monthIndex].investments += amount;
      } 
      else if (amount < 0 && isPersonal && isOneOff) {
        data[monthIndex].variableExpenses += amount;
      }
      else if (amount < 0 && isPersonal && isRecurring) {
        data[monthIndex].fixedExpenses += amount;
      }
      else if (amount > 0 && isPersonal && isOneOff) {
        data[monthIndex].income += amount;
      }
      else if (amount < 0 && isWork && isOneOff) {
        data[monthIndex].workAdvances += amount;
      }
      else if (amount > 0 && isWork && isOneOff) {
        data[monthIndex].workReimbursements += amount;
      }
    });

    // Calculate Totals after processing all transactions
    data.forEach(d => {
      d.totalCommitted = d.fixedExpenses + d.investments;
    });

    return data;
  }, [transactions, selectedYear]);

  const spentThisMonth = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => new Date(t.date).getFullYear() === now.getFullYear() && 
                   new Date(t.date).getMonth() === now.getMonth() &&
                   t.amount_base < 0 && 
                   t.analytics_included && 
                   t.context === 'personal' && 
                   t.recurrence === 'one_off' &&
                   t.category_name.toLowerCase() !== 'investment') 
      .reduce((sum, t) => sum + t.amount_base, 0);
  }, [transactions]);

  // --- Breakdown Calculation ---
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { total: number, subcategories: Map<string, number> }>();
    let totalMonthExpense = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (
        d.getFullYear() === selectedYear && 
        d.getMonth() === selectedMonth && 
        t.amount_base < 0 && 
        t.analytics_included &&
        t.context === 'personal' &&
        t.category_name.toLowerCase() !== 'investment' 
      ) {
        const catName = t.category_name;
        const subName = (t.subcategory_name && t.subcategory_name !== '-') ? t.subcategory_name : 'Altro';
        const amount = Math.abs(t.amount_base);

        totalMonthExpense += amount;

        if (!map.has(catName)) {
          map.set(catName, { total: 0, subcategories: new Map() });
        }

        const catEntry = map.get(catName)!;
        catEntry.total += amount;

        const currentSubTotal = catEntry.subcategories.get(subName) || 0;
        catEntry.subcategories.set(subName, currentSubTotal + amount);
      }
    });

    const sortedCategories = Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
    
    return {
      total: totalMonthExpense,
      categories: sortedCategories
    };
  }, [transactions, selectedYear, selectedMonth]);

  const spentDisplay = splitCurrency(spentThisMonth);
  const netWorthDisplay = splitCurrency(netWorthCHF);
  const breakdownTotalDisplay = splitCurrency(monthlyBreakdown.total);

  // Handlers
  const handleSpentThisMonthClick = () => {
    const now = new Date();
    onNavigateToTransactions({ year: now.getFullYear(), month: now.getMonth(), recurrence: 'ONE_OFF', context: 'PERSONAL', amount: 'EXPENSE', viewTransfers: false });
  };

  const handleCellClick = (monthIndex: number, type: 'VAR' | 'FIX' | 'INV' | 'COMMITTED' | 'INC' | 'WORK_ADV' | 'WORK_REIMB') => {
    const filters: NavigationFilters = { year: selectedYear, month: monthIndex, recurrence: 'ALL', context: 'ALL', amount: 'ALL', viewTransfers: false };
    
    switch (type) {
      case 'VAR': 
        filters.recurrence = 'ONE_OFF'; filters.context = 'PERSONAL'; filters.amount = 'EXPENSE'; 
        break;
      case 'FIX': 
        filters.recurrence = 'RECURRING'; filters.context = 'PERSONAL'; filters.amount = 'EXPENSE';
        // HIDDEN LOGIC: Exclude investments from this view
        const invCatFix = categories.find(c => c.name.toLowerCase() === 'investment');
        if (invCatFix) filters.excludeCategoryId = invCatFix.id;
        break;
      case 'INV':
        const invCat = categories.find(c => c.name.toLowerCase() === 'investment');
        if (invCat) {
          filters.categoryId = invCat.id;
        }
        filters.amount = 'ALL'; 
        break;
      case 'COMMITTED':
        // Show Recurring Expenses (Personal) + Investments
        filters.recurrence = 'RECURRING'; filters.context = 'PERSONAL'; filters.amount = 'EXPENSE';
        break;
      case 'INC': 
        filters.recurrence = 'ONE_OFF'; filters.context = 'PERSONAL'; filters.amount = 'INCOME'; 
        break;
      case 'WORK_ADV': 
        filters.recurrence = 'ONE_OFF'; filters.context = 'WORK'; filters.amount = 'EXPENSE'; 
        break;
      case 'WORK_REIMB': 
        filters.recurrence = 'ONE_OFF'; filters.context = 'WORK'; filters.amount = 'INCOME'; 
        break;
    }
    onNavigateToTransactions(filters);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-8 pb-safe">
      
      {/* --- Top Row: KPIs + Year Selector --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        
        {/* Year Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm flex flex-col justify-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest"><Calendar size={14} /> Anno Fiscale</div>
            <CustomSelect
              value={selectedYear}
              onChange={(val) => setSelectedYear(val)}
              options={years.map(y => ({ value: y, label: y.toString() }))}
              placeholder="Seleziona Anno"
            />
        </div>

        {/* Spent This Month */}
        <div 
           onClick={handleSpentThisMonthClick}
           className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm cursor-pointer hover:shadow-md hover:border-rose-200 transition-all group relative overflow-hidden active:scale-95"
         >
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-500 rotate-12 transform scale-125"><TrendingDown size={100} /></div>
          <div className="flex items-center gap-2 mb-2 md:mb-4 text-slate-500 group-hover:text-rose-600 transition-colors text-[10px] md:text-xs font-bold uppercase tracking-widest">
            <span className="p-1 rounded bg-rose-50 text-rose-500"><TrendingDown size={14} /></span> Uscite Var. (Mese)
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono tracking-tighter text-slate-800">
            CHF <span className="text-rose-600">{spentThisMonth < 0 ? '-' : ''}{spentDisplay.integer}</span><span className="text-lg text-rose-500">.{spentDisplay.decimal}</span>
          </div>
        </div>

        {/* Net Worth */}
        <div 
          onClick={onNavigateToAccounts}
          className="lg:col-span-2 bg-slate-900 text-white rounded-xl p-4 md:p-8 shadow-xl cursor-pointer relative overflow-hidden group transition-transform active:scale-[0.99]"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[100px] md:min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/70 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                 <Building2 size={14} /> Patrimonio Netto
              </div>
              <div className="p-2 bg-white/10 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                 <ArrowUpRight size={16} />
              </div>
            </div>
            
            <div className="mt-2 md:mt-4">
              <div className="text-3xl md:text-5xl font-bold font-mono tracking-tighter text-white">
                CHF {netWorthCHF < 0 ? '-' : ''}{netWorthDisplay.integer}<span className="text-lg md:text-2xl text-slate-400">.{netWorthDisplay.decimal}</span>
              </div>
              <p className="text-white/40 text-xs md:text-sm mt-1 md:mt-2 font-medium">Totale asset convertiti</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Monthly Matrix --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
         <div className="px-4 md:px-6 py-3 md:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <Calendar size={18} />
               </div>
               <div>
                 <h3 className="font-bold text-slate-800 text-base md:text-lg leading-tight">Matrice Annuale</h3>
                 <p className="text-[10px] md:text-xs text-slate-400 font-medium">{selectedYear} Overview</p>
               </div>
            </div>
         </div>

         {/* --- DESKTOP TABLE VIEW (Visible on MD and up) --- */}
         <div className="hidden md:block overflow-x-auto custom-scrollbar p-1">
            <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-0">
               <thead>
                  <tr>
                     <th rowSpan={2} className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] md:text-[11px] sticky left-0 bg-white z-10 border-b border-slate-100 shadow-sm text-left align-bottom pb-3">Mese</th>
                     <th rowSpan={2} className="px-4 py-3 font-bold text-emerald-500 uppercase tracking-wider text-[10px] md:text-[11px] text-right border-b border-slate-100 border-r border-slate-100 align-bottom pb-3">Entrate</th>
                     <th rowSpan={2} className="px-4 py-3 font-bold text-rose-500 uppercase tracking-wider text-[10px] md:text-[11px] text-right border-b border-slate-100 border-r border-slate-100 align-bottom pb-3">Uscite Var.</th>
                     
                     {/* Grouped Header for Committed */}
                     <th colSpan={3} className="px-4 py-1 border border-slate-200 bg-slate-50 rounded-t-lg mx-1"></th>

                     <th rowSpan={2} className="px-4 py-3 font-bold text-blue-500 uppercase tracking-wider text-[10px] md:text-[11px] text-right border-b border-slate-100 border-l border-slate-100 align-bottom pb-3">Ant. Lavoro</th>
                     <th rowSpan={2} className="px-4 py-3 font-bold text-indigo-500 uppercase tracking-wider text-[10px] md:text-[11px] text-right border-b border-slate-100 align-bottom pb-3">Rimb. Lavoro</th>
                  </tr>
                  <tr>
                     {/* Sub-headers for Group */}
                     <th className="px-4 py-2 font-bold text-amber-600 uppercase tracking-wider text-[9px] md:text-[10px] text-right border-b border-slate-200 border-l border-slate-200 bg-slate-50/50">Fisse</th>
                     <th className="px-4 py-2 font-bold text-purple-600 uppercase tracking-wider text-[9px] md:text-[10px] text-right border-b border-slate-200 bg-slate-50/50">Investimenti</th>
                     <th className="px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-[9px] md:text-[10px] text-right border-b border-slate-200 border-r border-slate-200 bg-slate-100/50">Totale</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {monthlyData.map((data, index) => (
                    <tr key={index} className="hover:bg-indigo-50/30 transition-colors group">
                       <td className={`px-4 py-3 font-bold text-slate-700 bg-white sticky left-0 z-10 text-xs md:text-sm group-hover:bg-indigo-50/50 transition-colors ${selectedMonth === index ? 'text-indigo-600' : ''}`}>
                         {MONTHS[index]}
                         {selectedMonth === index && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block align-middle"></span>}
                       </td>
                       
                       <td onClick={() => handleCellClick(index, 'INC')} className="px-4 py-3 text-right cursor-pointer border-r border-slate-100">
                          <span className={`px-2 py-1 rounded-lg font-mono text-xs md:text-sm transition-colors ${data.income !== 0 ? 'text-emerald-600 group-hover:bg-emerald-100/50' : 'text-slate-300'}`}>
                            {data.income !== 0 ? `+${data.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                          </span>
                       </td>
                       
                       <td onClick={() => handleCellClick(index, 'VAR')} className="px-4 py-3 text-right cursor-pointer border-r border-slate-100">
                          <span className={`px-2 py-1 rounded-lg font-mono text-xs md:text-sm transition-colors ${data.variableExpenses !== 0 ? 'text-rose-600 group-hover:bg-rose-100/50' : 'text-slate-300'}`}>
                            {data.variableExpenses !== 0 ? data.variableExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>

                       {/* Grouped Columns Body */}
                       <td onClick={() => handleCellClick(index, 'FIX')} className="px-4 py-3 text-right cursor-pointer border-l border-slate-200 bg-slate-50/30">
                          <span className={`px-2 py-1 rounded-lg font-mono text-xs md:text-sm transition-colors ${data.fixedExpenses !== 0 ? 'text-amber-600 group-hover:bg-amber-100/50' : 'text-slate-300'}`}>
                            {data.fixedExpenses !== 0 ? data.fixedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'INV')} className="px-4 py-3 text-right cursor-pointer bg-slate-50/30">
                          <span className={`px-2 py-1 rounded-lg font-mono text-xs md:text-sm transition-colors ${data.investments !== 0 ? 'text-purple-600 group-hover:bg-purple-100/50' : 'text-slate-300'}`}>
                            {data.investments !== 0 ? data.investments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'COMMITTED')} className="px-4 py-3 text-right cursor-pointer border-r border-slate-200 bg-slate-100/50">
                          <span className={`px-2 py-1 rounded-lg font-mono text-xs md:text-sm font-bold transition-colors ${data.totalCommitted !== 0 ? 'text-slate-700 group-hover:bg-slate-200/50' : 'text-slate-300'}`}>
                            {data.totalCommitted !== 0 ? data.totalCommitted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>

                       <td onClick={() => handleCellClick(index, 'WORK_ADV')} className="px-4 py-3 text-right cursor-pointer border-l border-slate-100">
                          <span className={`px-2 py-1 rounded-lg font-mono text-xs md:text-sm transition-colors ${data.workAdvances !== 0 ? 'text-blue-600 group-hover:bg-blue-100/50' : 'text-slate-300'}`}>
                            {data.workAdvances !== 0 ? data.workAdvances.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'WORK_REIMB')} className="px-4 py-3 text-right cursor-pointer">
                          <span className={`px-2 py-1 rounded-lg font-mono text-xs md:text-sm transition-colors ${data.workReimbursements !== 0 ? 'text-indigo-600 group-hover:bg-indigo-100/50' : 'text-slate-300'}`}>
                            {data.workReimbursements !== 0 ? `+${data.workReimbursements.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* --- MOBILE CARD LIST VIEW (Visible on Small Screens) --- */}
         <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {monthlyData.map((data, index) => (
               <div key={index} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                     <span className={`font-bold text-sm uppercase tracking-wide ${selectedMonth === index ? 'text-indigo-600' : 'text-slate-700'}`}>
                        {MONTHS[index]}
                     </span>
                     {data.totalCommitted !== 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                           Impegni: {formatCurrency(data.totalCommitted)}
                        </span>
                     )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     {/* Row 1: Income / Var Expenses */}
                     <div 
                        onClick={() => handleCellClick(index, 'INC')}
                        className={`p-2 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${data.income !== 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                     >
                        <div className="text-[9px] uppercase font-bold mb-0.5 opacity-70">Entrate</div>
                        <div className="font-mono text-xs font-bold">{data.income !== 0 ? `+${formatCurrency(data.income)}` : '-'}</div>
                     </div>

                     <div 
                        onClick={() => handleCellClick(index, 'VAR')}
                        className={`p-2 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${data.variableExpenses !== 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                     >
                        <div className="text-[9px] uppercase font-bold mb-0.5 opacity-70">Uscite Var.</div>
                        <div className="font-mono text-xs font-bold">{data.variableExpenses !== 0 ? formatCurrency(data.variableExpenses) : '-'}</div>
                     </div>

                     {/* Row 2: Fixed / Inv */}
                     <div 
                        onClick={() => handleCellClick(index, 'FIX')}
                        className={`p-2 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${data.fixedExpenses !== 0 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                     >
                        <div className="text-[9px] uppercase font-bold mb-0.5 opacity-70">Fisse</div>
                        <div className="font-mono text-xs font-bold">{data.fixedExpenses !== 0 ? formatCurrency(data.fixedExpenses) : '-'}</div>
                     </div>

                     <div 
                        onClick={() => handleCellClick(index, 'INV')}
                        className={`p-2 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${data.investments !== 0 ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                     >
                        <div className="text-[9px] uppercase font-bold mb-0.5 opacity-70">Investimenti</div>
                        <div className="font-mono text-xs font-bold">{data.investments !== 0 ? formatCurrency(data.investments) : '-'}</div>
                     </div>
                  </div>
                  
                  {/* Row 3: Work (Only if present) */}
                  {(data.workAdvances !== 0 || data.workReimbursements !== 0) && (
                     <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div onClick={() => handleCellClick(index, 'WORK_ADV')} className="text-center cursor-pointer">
                           <div className="text-[9px] text-blue-500 font-bold uppercase">Ant. Lavoro</div>
                           <div className="font-mono text-xs text-blue-600">{formatCurrency(data.workAdvances)}</div>
                        </div>
                        <div onClick={() => handleCellClick(index, 'WORK_REIMB')} className="text-center cursor-pointer">
                           <div className="text-[9px] text-indigo-500 font-bold uppercase">Rimborsi</div>
                           <div className="font-mono text-xs text-indigo-600">+{formatCurrency(data.workReimbursements)}</div>
                        </div>
                     </div>
                  )}
               </div>
            ))}
         </div>
      </div>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* --- LEFT COL: Active Accounts --- */}
          <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[350px] md:h-[600px]">
                  <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Wallet size={18} className="text-indigo-600" /> I Miei Conti
                      </h3>
                      <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Saldi aggiornati</p>
                    </div>
                    <div className="bg-white border border-slate-200 px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                       {activeAccountBalances.length} Visibili
                    </div>
                  </div>

                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 border-b border-slate-100 shadow-sm">
                        <tr className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                          <th className="px-4 py-2 md:px-5 md:py-3 bg-slate-50/80">Conto</th>
                          <th className="px-4 py-2 md:px-5 md:py-3 bg-slate-50/80 text-center">Valuta</th>
                          <th className="px-4 py-2 md:px-5 md:py-3 bg-slate-50/80 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {activeAccountBalances.length === 0 ? (
                           <tr>
                              <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                 Nessun conto attivo.
                              </td>
                           </tr>
                        ) : (
                          activeAccountBalances.map((account) => (
                            <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-4 py-3 md:px-5 md:py-4">
                                <div className="font-bold text-slate-800 text-xs md:text-sm">{account.name}</div>
                              </td>
                              <td className="px-4 py-3 md:px-5 md:py-4 text-center">
                                <span className="inline-block px-1.5 py-0.5 md:px-2 md:py-0.5 bg-slate-100 rounded text-[9px] md:text-[10px] font-bold font-mono text-slate-500 border border-slate-200">
                                  {account.currency}
                                </span>
                              </td>
                              <td className={`px-4 py-3 md:px-5 md:py-4 text-right font-mono font-bold text-xs md:text-sm ${account.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatCurrency(account.balance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>
          </div>

          {/* --- RIGHT COL: Monthly Analysis --- */}
          <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[450px] md:h-[600px]">
                  {/* Header with Month Selector */}
                  <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 md:gap-4 shrink-0 bg-slate-50/50">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Folder size={18} /></div>
                          <div>
                             <h3 className="font-bold text-slate-800 text-base md:text-lg">Analisi Spese</h3>
                             <p className="text-[10px] md:text-xs text-slate-400 font-medium">Breakdown {selectedYear}</p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="w-full sm:w-40">
                            <CustomSelect
                              value={selectedMonth}
                              onChange={setSelectedMonth}
                              options={MONTHS.map((m, i) => ({ value: i, label: m }))}
                            />
                          </div>
                          <div className="flex flex-col items-end min-w-[100px] md:min-w-[120px]">
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Totale Uscite</div>
                             <div className="font-mono font-bold text-base md:text-lg text-rose-600 tracking-tight">
                                 CHF {breakdownTotalDisplay.integer}.{breakdownTotalDisplay.decimal}
                             </div>
                          </div>
                      </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {monthlyBreakdown.categories.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                             <div className="bg-slate-50 p-4 rounded-full mb-3"><TrendingDown size={32} className="text-slate-300" /></div>
                             <p>Nessuna uscita registrata.</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-slate-50 p-1 md:p-2">
                              {monthlyBreakdown.categories.map(([catName, data]) => (
                                  <div key={catName} className="p-3 md:p-4 rounded-xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100 mb-1">
                                      {/* Category Header */}
                                      <div className="flex justify-between items-center mb-2 md:mb-3">
                                          <div className="flex items-center gap-2 md:gap-3">
                                              <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs md:text-sm">
                                                  {catName.charAt(0)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                 <div className="font-bold text-slate-700 text-xs md:text-sm truncate">{catName}</div>
                                                 <div className="h-1 w-16 md:w-24 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((data.total / monthlyBreakdown.total) * 100, 100)}%` }}></div>
                                                 </div>
                                              </div>
                                          </div>
                                          <span className="font-mono font-bold text-slate-800 text-xs md:text-sm">
                                              {formatCurrency(data.total)}
                                          </span>
                                      </div>

                                      {/* Subcategories */}
                                      <div className="pl-9 md:pl-11 space-y-1.5 md:space-y-2">
                                          {Array.from(data.subcategories.entries()).map(([subName, amount]) => (
                                              <div key={subName} className="flex justify-between items-center text-[10px] md:text-xs text-slate-500 group py-1 border-b border-slate-50 last:border-0">
                                                  <span className="group-hover:text-indigo-600 transition-colors font-medium flex items-center gap-1">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors"></div>
                                                    {subName}
                                                  </span>
                                                  <span className="font-mono text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded">
                                                      {formatCurrency(amount)}
                                                  </span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      <div className="h-4 md:hidden"></div>
    </div>
  );
};
