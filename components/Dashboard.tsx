
import React, { useState, useMemo, useEffect } from 'react';
import { MegaTransaction, DbAccount, DbCategory, DbInvestment, DbInvestmentTrend } from '../types';
import { Calendar, TrendingDown, Wallet, Building2, Folder, ArrowUpRight, ChevronRight, ChevronLeft, Info, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { splitCurrency, MONTHS, formatCurrency } from '../utils';
import { InfoModal } from './InfoModal';
import { calculateBaseAmountInCHF } from '../services/supabaseService';

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
  investments: DbInvestment[];
  investmentTrends: DbInvestmentTrend[];
  onNavigateToAccounts: () => void;
  onNavigateToInvestments: () => void;
  onNavigateToTransactions: (filters: NavigationFilters) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  accounts, 
  categories,
  years,
  investments,
  investmentTrends,
  onNavigateToAccounts,
  onNavigateToInvestments,
  onNavigateToTransactions
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [showInvestments, setShowInvestments] = useState(false);
  const [investmentStats, setInvestmentStats] = useState({ retirement: 0, personal: 0, total: 0 });
  
  // State for Mobile Matrix Navigation
  const [mobileMatrixMonth, setMobileMatrixMonth] = useState<number>(currentDate.getMonth());

  // Info Modal State
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  // --- KPI Calculations ---
  
  // 1. Spendable Assets (Patrimonio Spendibile) - Only is_select=true accounts
  const spendableAssetsCHF = useMemo(() => {
    const selectedAccountIds = new Set(accounts.filter(a => a.is_select).map(a => a.id));
    return transactions
      .filter(t => selectedAccountIds.has(t.account_id))
      .reduce((sum, t) => sum + t.amount_base, 0);
  }, [transactions, accounts]);

  // 2. Total Accounts Balance (All Active Accounts)
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

  const totalActiveAccountsBalance = useMemo(() => {
    const activeAccountIds = new Set(accounts.filter(a => a.is_active).map(a => a.id));
    return transactions
      .filter(t => activeAccountIds.has(t.account_id))
      .reduce((sum, t) => sum + t.amount_base, 0);
  }, [transactions, accounts]);

  // 3. Investment Totals (Async Calculation for Currency Conversion)
  useEffect(() => {
    const calcInvestments = async () => {
        let retirementSum = 0;
        let personalSum = 0;

        for (const inv of investments) {
            // Find latest trend for this investment
            const trends = investmentTrends.filter(t => t.investment_id === inv.id);
            // Sort descending by date
            trends.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
            
            const latest = trends.length > 0 ? trends[0] : null;
            if (!latest) continue;

            let valueInCHF = latest.value;

            // If currency is NOT CHF, calculate base amount using historical rate
            if (inv.currency !== 'CHF') {
                // Construct date string for end of month to get appropriate rate
                // Use latest.year and latest.month (0-indexed)
                // format: YYYY-MM-DD
                const dateStr = `${latest.year}-${String(latest.month + 1).padStart(2, '0')}-28`;
                valueInCHF = await calculateBaseAmountInCHF(latest.value, inv.currency, dateStr);
            }
            
            if (inv.is_for_retirement) {
                retirementSum += valueInCHF;
            } else {
                personalSum += valueInCHF;
            }
        }

        setInvestmentStats({
            retirement: retirementSum,
            personal: personalSum,
            total: retirementSum + personalSum
        });
    };

    calcInvestments();
  }, [investments, investmentTrends]);


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

  const spentDisplay = splitCurrency(spentThisMonth);
  // Fix KPI negative rounding visual bug
  const spentInteger = Math.abs(spentThisMonth) >= 1 ? splitCurrency(spentThisMonth).integer : '0';

  const spendableDisplay = splitCurrency(spendableAssetsCHF);
  const spendableInteger = Math.abs(spendableAssetsCHF) >= 1 ? splitCurrency(spendableAssetsCHF).integer : '0';
  
  const investDisplay = splitCurrency(investmentStats.total);
  const investInteger = Math.abs(investmentStats.total) >= 1 ? splitCurrency(investmentStats.total).integer : '0';

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

  const handlePrevMobileMonth = () => {
    setMobileMatrixMonth(prev => (prev === 0 ? 11 : prev - 1));
  };

  const handleNextMobileMonth = () => {
    setMobileMatrixMonth(prev => (prev === 11 ? 0 : prev + 1));
  };

  // Investment Bar Calc
  const invTotal = investmentStats.total > 0 ? investmentStats.total : 1; // avoid division by zero
  const retPercent = (investmentStats.retirement / invTotal) * 100;
  const persPercent = (investmentStats.personal / invTotal) * 100;

  // Data for the currently selected mobile month
  const mobileMonthData = monthlyData[mobileMatrixMonth];

  return (
    <div className="flex flex-col gap-4 md:gap-8 pb-safe">
      
      {/* --- Top Row: KPIs + Year Selector --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        
        {/* 1. Year Selector Card - UNIFIED LAYOUT */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-6 shadow-sm flex flex-col justify-between min-h-[90px] md:min-h-[140px]">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
               <Calendar size={14} /> Anno Fiscale
            </div>
            {/* Control pushed to bottom */}
            <div>
               <CustomSelect
                 value={selectedYear}
                 onChange={(val) => setSelectedYear(val)}
                 options={years.map(y => ({ value: y, label: y.toString() }))}
                 placeholder="Seleziona Anno"
               />
            </div>
        </div>

        {/* 2. Spent This Month - UNIFIED LAYOUT */}
        <div 
           onClick={handleSpentThisMonthClick}
           className="bg-white rounded-xl border border-slate-200 p-3 md:p-6 shadow-sm cursor-pointer hover:shadow-md hover:border-rose-200 transition-all group relative active:scale-95 flex flex-col justify-between min-h-[90px] md:min-h-[140px]"
         >
          {/* Isolated Background Overflow */}
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-500 rotate-12 transform scale-125"><TrendingDown size={100} /></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-slate-500 group-hover:text-rose-600 transition-colors text-[10px] md:text-xs font-bold uppercase tracking-widest">
                <span className="p-1 rounded bg-rose-50 text-rose-500"><TrendingDown size={14} /></span> Uscite Var. (Mese)
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveInfo('SPENT_VAR'); }}
                  className="ml-1 text-slate-300 hover:text-rose-500 transition-colors"
                >
                    <Info size={12} />
                </button>
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-xl md:text-3xl font-bold font-mono tracking-tighter text-slate-800">
                CHF <span className="text-rose-600">{spentThisMonth < 0 ? '-' : ''}{spentInteger}</span><span className="text-lg text-rose-500">.{spentDisplay.decimal}</span>
            </div>
          </div>
        </div>

        {/* 3. Spendable Assets - UNIFIED LAYOUT */}
        <div 
          onClick={onNavigateToAccounts}
          className="bg-slate-900 text-white rounded-xl p-3 md:p-6 shadow-xl cursor-pointer relative group transition-transform active:scale-[0.99] flex flex-col justify-between min-h-[90px] md:min-h-[140px]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
             <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>
          
          <div className="relative z-10 flex justify-between items-start">
              <div className="flex items-center gap-2 text-white/70 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                 <Building2 size={14} /> Patrimonio Spendibile
                 <button 
                   onClick={(e) => { e.stopPropagation(); setActiveInfo('ASSETS'); }}
                   className="ml-1 text-slate-500 hover:text-white transition-colors"
                 >
                    <Info size={12} />
                 </button>
              </div>
              <div className="p-2 bg-white/10 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                 <ArrowUpRight size={16} />
              </div>
          </div>
            
          <div className="relative z-10 mt-auto">
              <div className="text-xl md:text-3xl font-bold font-mono tracking-tighter text-white">
                CHF {spendableAssetsCHF < 0 ? '-' : ''}{spendableInteger}<span className="text-lg text-slate-400">.{spendableDisplay.decimal}</span>
              </div>
          </div>
        </div>

        {/* 4. Investments Summary - RESTORED RICH UI */}
        <div 
          onClick={(e) => { 
             if (showInvestments) onNavigateToInvestments();
          }}
          className="bg-indigo-600 text-white rounded-xl p-3 md:p-6 shadow-lg shadow-indigo-500/20 cursor-pointer relative group transition-transform active:scale-[0.99] flex flex-col justify-between min-h-[120px] md:min-h-[140px]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-8 -mb-8"></div>
          </div>
          
          <div className="relative z-10 flex items-center justify-between mb-2 md:mb-0">
               <div className="flex items-center gap-2 text-indigo-100 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                 <TrendingUp size={14} /> Investimenti Totali
                 <button 
                   onClick={(e) => { e.stopPropagation(); setActiveInfo('INVESTMENTS'); }}
                   className="ml-1 text-indigo-300 hover:text-white transition-colors"
                 >
                    <Info size={12} />
                 </button>
               </div>
               
               {/* Privacy Toggle Button */}
               <button 
                 onClick={(e) => { e.stopPropagation(); setShowInvestments(!showInvestments); }}
                 className="p-1.5 md:p-2 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors"
               >
                 {showInvestments ? <EyeOff size={14} className="md:w-4 md:h-4" /> : <Eye size={14} className="md:w-4 md:h-4" />}
               </button>
          </div>
             
          <div className="relative z-10 mt-auto">
               <div className={`transition-all duration-300 ${showInvestments ? '' : 'blur-md select-none'}`}>
                   <div className="text-xl md:text-3xl font-bold font-mono tracking-tighter text-white mb-2 md:mb-3">
                     CHF {investmentStats.total < 0 ? '-' : ''}{investInteger}<span className="text-lg text-indigo-200">.{investDisplay.decimal}</span>
                   </div>
                   
                   {/* Restored Visualization Bar */}
                   {investmentStats.total > 0 && (
                     <div className="space-y-1.5 opacity-90">
                        <div className="h-1.5 w-full bg-indigo-900/40 rounded-full flex overflow-hidden">
                           <div style={{ width: `${retPercent}%` }} className="bg-emerald-400 h-full" />
                           <div style={{ width: `${persPercent}%` }} className="bg-blue-400 h-full" />
                        </div>
                        <div className="flex justify-between text-[9px] font-medium text-indigo-200">
                           <span className="flex items-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" /> 
                             Pens. <span className="text-white font-mono ml-0.5">{formatCurrency(investmentStats.retirement)}</span>
                           </span>
                           <span className="flex items-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm" /> 
                             Pers. <span className="text-white font-mono ml-0.5">{formatCurrency(investmentStats.personal)}</span>
                           </span>
                        </div>
                     </div>
                   )}
               </div>
          </div>
        </div>

      </div>

      {/* --- Monthly Matrix --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible flex flex-col relative z-0">
         <div className="px-4 md:px-6 py-3 md:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <Calendar size={18} />
               </div>
               <div className="group relative flex items-center gap-2">
                 <div>
                   <h3 className="font-bold text-slate-800 text-base md:text-lg leading-tight">Matrice Annuale</h3>
                   <p className="text-[10px] md:text-xs text-slate-400 font-medium">{selectedYear} Overview</p>
                 </div>
                 <button 
                   onClick={() => setActiveInfo('MATRIX')}
                   className="p-1 text-slate-300 hover:text-indigo-500 hover:bg-slate-100 rounded-full transition-colors"
                 >
                    <Info size={14} />
                 </button>
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

         {/* --- MOBILE CARD VIEW (Single Month with Navigation) --- */}
         <div className="md:hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
               <button 
                 onClick={handlePrevMobileMonth}
                 className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
               >
                 <ChevronLeft size={18} />
               </button>
               
               <span className="font-bold text-sm uppercase tracking-wide text-slate-800">
                  {MONTHS[mobileMatrixMonth]}
               </span>
               
               <button 
                 onClick={handleNextMobileMonth}
                 className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
               >
                 <ChevronRight size={18} />
               </button>
            </div>

            <div className="p-4 bg-white hover:bg-slate-50 transition-colors">
               <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                     Riepilogo Mese
                  </div>
                  {mobileMonthData.totalCommitted !== 0 && (
                     <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                        Impegni: {formatCurrency(mobileMonthData.totalCommitted)}
                     </span>
                  )}
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  {/* Row 1: Income / Var Expenses */}
                  <div 
                     onClick={() => handleCellClick(mobileMatrixMonth, 'INC')}
                     className={`p-3 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${mobileMonthData.income !== 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                  >
                     <div className="text-[9px] uppercase font-bold mb-1 opacity-70">Entrate</div>
                     <div className="font-mono text-sm font-bold">{mobileMonthData.income !== 0 ? `+${formatCurrency(mobileMonthData.income)}` : '-'}</div>
                  </div>

                  <div 
                     onClick={() => handleCellClick(mobileMatrixMonth, 'VAR')}
                     className={`p-3 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${mobileMonthData.variableExpenses !== 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                  >
                     <div className="text-[9px] uppercase font-bold mb-1 opacity-70">Uscite Var.</div>
                     <div className="font-mono text-sm font-bold">{mobileMonthData.variableExpenses !== 0 ? formatCurrency(mobileMonthData.variableExpenses) : '-'}</div>
                  </div>

                  {/* Row 2: Fixed / Inv */}
                  <div 
                     onClick={() => handleCellClick(mobileMatrixMonth, 'FIX')}
                     className={`p-3 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${mobileMonthData.fixedExpenses !== 0 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                  >
                     <div className="text-[9px] uppercase font-bold mb-1 opacity-70">Fisse</div>
                     <div className="font-mono text-sm font-bold">{mobileMonthData.fixedExpenses !== 0 ? formatCurrency(mobileMonthData.fixedExpenses) : '-'}</div>
                  </div>

                  <div 
                     onClick={() => handleCellClick(mobileMatrixMonth, 'INV')}
                     className={`p-3 rounded-lg border text-center cursor-pointer active:scale-95 transition-transform ${mobileMonthData.investments !== 0 ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                  >
                     <div className="text-[9px] uppercase font-bold mb-1 opacity-70">Investimenti</div>
                     <div className="font-mono text-sm font-bold">{mobileMonthData.investments !== 0 ? formatCurrency(mobileMonthData.investments) : '-'}</div>
                  </div>
               </div>
               
               {/* Row 3: Work (Only if present) */}
               {(mobileMonthData.workAdvances !== 0 || mobileMonthData.workReimbursements !== 0) && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                     <div onClick={() => handleCellClick(mobileMatrixMonth, 'WORK_ADV')} className="text-center cursor-pointer">
                        <div className="text-[9px] text-blue-500 font-bold uppercase">Ant. Lavoro</div>
                        <div className="font-mono text-sm text-blue-600">{formatCurrency(mobileMonthData.workAdvances)}</div>
                     </div>
                     <div onClick={() => handleCellClick(mobileMatrixMonth, 'WORK_REIMB')} className="text-center cursor-pointer">
                        <div className="text-[9px] text-indigo-500 font-bold uppercase">Rimborsi</div>
                        <div className="font-mono text-sm text-indigo-600">+{formatCurrency(mobileMonthData.workReimbursements)}</div>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* --- LEFT COL: Active Accounts --- */}
          <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[350px] md:h-[600px]">
                  {/* Fixed Header */}
                  <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                          <Wallet size={18} />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                           I Miei Conti
                        </h3>
                        <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Saldi aggiornati</p>
                      </div>
                    </div>
                    {/* TOTAL ACTIVE ACCOUNTS BALANCE DISPLAY */}
                    <div className="text-right">
                       <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                          Totale Reale
                          <button 
                            onClick={() => setActiveInfo('REAL_TOTAL')}
                            className="ml-1 text-slate-300 hover:text-slate-500 transition-colors"
                          >
                             <Info size={10} />
                          </button>
                       </div>
                       <div className="text-xs md:text-sm font-bold font-mono text-slate-700">CHF {formatCurrency(totalActiveAccountsBalance)}</div>
                    </div>
                  </div>

                  {/* Scrollable List */}
                  <div className="overflow-y-auto custom-scrollbar flex-1 rounded-b-xl">
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
                                <span className="inline-block px-1.5 py-0.5 md:px-2.5 md:py-1 bg-slate-100 rounded-lg text-[10px] md:text-xs font-bold font-mono text-slate-600 border border-slate-200">
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
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[450px] md:h-[600px]">
                  {/* Header with Month Selector - Fixed Tooltip Clipping */}
                  <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 md:gap-4 shrink-0 bg-slate-50/50 rounded-t-xl">
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
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                                Totale Uscite
                                <button 
                                  onClick={() => setActiveInfo('EXPENSE_TOTAL')}
                                  className="ml-1 text-slate-300 hover:text-rose-400 transition-colors"
                                >
                                   <Info size={10} />
                                </button>
                             </div>
                             <div className="font-mono font-bold text-base md:text-lg text-rose-600 tracking-tight">
                                 CHF {breakdownTotalDisplay.integer}.{breakdownTotalDisplay.decimal}
                             </div>
                          </div>
                      </div>
                  </div>

                  {/* List - Rounded bottom */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar rounded-b-xl">
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

      {/* --- INFO MODALS --- */}
      
      <InfoModal 
        isOpen={activeInfo === 'SPENT_VAR'}
        onClose={() => setActiveInfo(null)}
        title="Uscite Variabili Mese"
      >
        Spese personali <strong>non ricorrenti</strong> (One-off) effettuate nel mese corrente.
        Rappresenta il denaro speso "sul momento" per acquisti, cibo, svago, ecc.
      </InfoModal>

      <InfoModal 
        isOpen={activeInfo === 'ASSETS'}
        onClose={() => setActiveInfo(null)}
        title="Patrimonio Spendibile"
      >
        <p>Rappresenta la tua <strong>liquidità operativa immediata</strong>.</p>
        <p className="mt-2">È la somma dei saldi dei soli conti contrassegnati come "Visibili" nei filtri (spunta blu). Serve a capire quanto puoi spendere dai tuoi conti principali senza contare conti di risparmio nascosti o investimenti.</p>
      </InfoModal>

      <InfoModal 
        isOpen={activeInfo === 'INVESTMENTS'}
        onClose={() => setActiveInfo(null)}
        title="Investimenti Totali"
      >
        <p>Valore di mercato attuale aggregato di tutti i tuoi investimenti (Pensione + Personali).</p>
        <p className="mt-2 text-indigo-600 font-medium">Nota sul calcolo:</p>
        <p className="mt-1">Se un investimento è in valuta estera (es. USD), il totale viene <strong>convertito automaticamente in CHF</strong> utilizzando il tasso di cambio storico del mese di riferimento dell'ultimo aggiornamento.</p>
      </InfoModal>

      <InfoModal 
        isOpen={activeInfo === 'MATRIX'}
        onClose={() => setActiveInfo(null)}
        title="Matrice Annuale"
      >
        <p>Una panoramica completa dei flussi di cassa mensili per l'anno selezionato.</p>
        <ul className="list-disc pl-4 mt-2 space-y-1">
           <li><strong>Uscite Var.:</strong> Spese una tantum (cibo, shopping).</li>
           <li><strong>Fisse:</strong> Spese ricorrenti obbligatorie (affitto, bollette) escludendo gli investimenti.</li>
           <li><strong>Investimenti:</strong> Movimenti con categoria 'Investment'.</li>
           <li><strong>Entrate:</strong> Stipendi e bonifici in entrata.</li>
        </ul>
      </InfoModal>

      <InfoModal 
        isOpen={activeInfo === 'REAL_TOTAL'}
        onClose={() => setActiveInfo(null)}
        title="Totale Reale Conti"
      >
        <p>Questo è il saldo effettivo di <strong>TUTTI</strong> i conti attivi presenti nel database.</p>
        <p className="mt-2">Include anche i conti che hai deciso di nascondere dai filtri o dalla dashboard principale. Rappresenta la somma algebrica di tutto il denaro che possiedi sui conti bancari.</p>
      </InfoModal>

      <InfoModal 
        isOpen={activeInfo === 'EXPENSE_TOTAL'}
        onClose={() => setActiveInfo(null)}
        title="Totale Uscite Analisi"
      >
        <p>Somma delle Uscite Personali (Variabili + Fisse) per il mese selezionato.</p>
        <p className="mt-2 text-rose-600 font-medium">Nota bene:</p>
        <p>Questo totale <strong>esclude</strong>:</p>
        <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
           <li>Spese di lavoro (rimborsabili).</li>
           <li>Movimenti verso Investimenti (che sono trasferimenti di capitale, non spese).</li>
           <li>Giroconti tra conti propri.</li>
        </ul>
      </InfoModal>

    </div>
  );
};
