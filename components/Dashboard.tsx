import React, { useState, useMemo } from 'react';
import { MegaTransaction, DbAccount } from '../types';
import { Calendar, TrendingDown, Wallet, Building2, ChevronRight, Folder, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface NavigationFilters {
  year: number;
  month: number;
  recurrence: 'ALL' | 'ONE_OFF' | 'RECURRING';
  context: 'ALL' | 'PERSONAL' | 'WORK';
  amount: 'ALL' | 'INCOME' | 'EXPENSE';
  viewTransfers: boolean;
}

interface DashboardProps {
  transactions: MegaTransaction[];
  accounts: DbAccount[];
  years: number[];
  onNavigateToAccounts: () => void;
  onNavigateToTransactions: (filters: NavigationFilters) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  accounts, 
  years,
  onNavigateToAccounts,
  onNavigateToTransactions
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());

  const MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

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
      variableExpenses: 0, fixedExpenses: 0, income: 0, workAdvances: 0, workReimbursements: 0
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

      if (amount < 0 && isPersonal && isOneOff) data[monthIndex].variableExpenses += amount;
      else if (amount < 0 && isPersonal && isRecurring) data[monthIndex].fixedExpenses += amount;
      else if (amount > 0 && isPersonal && isOneOff) data[monthIndex].income += amount;
      else if (amount < 0 && isWork && isOneOff) data[monthIndex].workAdvances += amount;
      else if (amount > 0 && isWork && isOneOff) data[monthIndex].workReimbursements += amount;
    });
    return data;
  }, [transactions, selectedYear]);

  const spentThisMonth = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => new Date(t.date).getFullYear() === now.getFullYear() && 
                   new Date(t.date).getMonth() === now.getMonth() &&
                   t.amount_base < 0 && t.analytics_included && t.context === 'personal' && t.recurrence === 'one_off')
      .reduce((sum, t) => sum + t.amount_base, 0);
  }, [transactions]);

  // --- Breakdown Calculation (TagManager Style) ---
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { total: number, subcategories: Map<string, number> }>();
    let totalMonthExpense = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      // Filter: Year Match AND Month Match AND Expense AND Analytics Included AND Personal Context
      if (
        d.getFullYear() === selectedYear && 
        d.getMonth() === selectedMonth && 
        t.amount_base < 0 && 
        t.analytics_included &&
        t.context === 'personal' 
      ) {
        const catName = t.category_name;
        const subName = (t.subcategory_name && t.subcategory_name !== '-') ? t.subcategory_name : 'Altro';
        const amount = Math.abs(t.amount_base); // We show expenses as positive numbers in the breakdown list

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

    // Sort by Total Descending
    const sortedCategories = Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
    
    return {
      total: totalMonthExpense,
      categories: sortedCategories
    };
  }, [transactions, selectedYear, selectedMonth]);

  // Handlers
  const handleSpentThisMonthClick = () => {
    const now = new Date();
    onNavigateToTransactions({ year: now.getFullYear(), month: now.getMonth(), recurrence: 'ONE_OFF', context: 'PERSONAL', amount: 'EXPENSE', viewTransfers: false });
  };

  const handleCellClick = (monthIndex: number, type: 'VAR' | 'FIX' | 'INC' | 'WORK_ADV' | 'WORK_REIMB') => {
    const filters: NavigationFilters = { year: selectedYear, month: monthIndex, recurrence: 'ALL', context: 'ALL', amount: 'ALL', viewTransfers: false };
    switch (type) {
      case 'VAR': filters.recurrence = 'ONE_OFF'; filters.context = 'PERSONAL'; filters.amount = 'EXPENSE'; break;
      case 'FIX': filters.recurrence = 'RECURRING'; filters.context = 'PERSONAL'; filters.amount = 'EXPENSE'; break;
      case 'INC': filters.recurrence = 'ONE_OFF'; filters.context = 'PERSONAL'; filters.amount = 'INCOME'; break;
      case 'WORK_ADV': filters.recurrence = 'ONE_OFF'; filters.context = 'WORK'; filters.amount = 'EXPENSE'; break;
      case 'WORK_REIMB': filters.recurrence = 'ONE_OFF'; filters.context = 'WORK'; filters.amount = 'INCOME'; break;
    }
    onNavigateToTransactions(filters);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-10">
      
      {/* --- Top Row: KPIs + Year Selector --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Year Selector (Global) */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/40 rounded-3xl p-6 shadow-sm flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest"><Calendar size={14} /> Anno Fiscale</div>
            <div className="relative">
              <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full bg-slate-50/80 border-0 text-slate-800 font-bold py-3 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors cursor-pointer text-lg appearance-none"
              >
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
        </div>

        {/* Spent This Month */}
        <div 
           onClick={handleSpentThisMonthClick}
           className="bg-white/80 backdrop-blur-sm border border-white/40 rounded-3xl p-6 shadow-sm cursor-pointer hover:shadow-lg hover:shadow-rose-100 transition-all group relative overflow-hidden active:scale-[0.98]"
         >
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-500 rotate-12 transform scale-125"><TrendingDown size={100} /></div>
          <div className="flex items-center gap-2 mb-4 text-slate-500 group-hover:text-rose-600 transition-colors text-xs font-bold uppercase tracking-widest">
            <span className="p-1 rounded bg-rose-50 text-rose-500"><TrendingDown size={14} /></span> Uscite Var. (Mese)
          </div>
          <div className="text-3xl font-bold font-mono tracking-tighter text-slate-800">
            CHF <span className="text-rose-600">{Math.abs(spentThisMonth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Net Worth (Spans 2 cols on LG) */}
        <div 
          onClick={onNavigateToAccounts}
          className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-8 shadow-2xl shadow-slate-900/10 cursor-pointer relative overflow-hidden group transition-transform active:scale-[0.99] hover:scale-[1.01]"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest">
                 <Building2 size={14} /> Patrimonio Netto
              </div>
              <div className="p-2 bg-white/10 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                 <ArrowUpRight size={16} />
              </div>
            </div>
            
            <div className="mt-4">
              <div className="text-5xl font-bold font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400">
                CHF {netWorthCHF.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-white/40 text-sm mt-2 font-medium">Totale asset convertiti in valuta base</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Monthly Matrix (Clean Grid) --- */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-white/40 overflow-hidden flex flex-col">
         <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <Calendar size={20} />
               </div>
               <div>
                 <h3 className="font-bold text-slate-800 text-lg leading-tight">Matrice Annuale</h3>
                 <p className="text-xs text-slate-400 font-medium">{selectedYear} Overview</p>
               </div>
            </div>
         </div>
         <div className="overflow-x-auto custom-scrollbar p-1">
            <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-0">
               <thead>
                  <tr>
                     <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px] sticky left-0 bg-white/95 backdrop-blur z-10 border-b border-slate-100">Mese</th>
                     <th className="px-6 py-4 font-bold text-rose-500 uppercase tracking-wider text-[11px] text-right border-b border-slate-100">Uscite Var.</th>
                     <th className="px-6 py-4 font-bold text-amber-500 uppercase tracking-wider text-[11px] text-right border-b border-slate-100">Uscite Fisse</th>
                     <th className="px-6 py-4 font-bold text-emerald-500 uppercase tracking-wider text-[11px] text-right border-b border-slate-100">Entrate</th>
                     <th className="px-6 py-4 font-bold text-blue-500 uppercase tracking-wider text-[11px] text-right border-b border-slate-100">Ant. Lavoro</th>
                     <th className="px-6 py-4 font-bold text-indigo-500 uppercase tracking-wider text-[11px] text-right border-b border-slate-100">Rimb. Lavoro</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {monthlyData.map((data, index) => (
                    <tr key={index} className="hover:bg-indigo-50/30 transition-colors group">
                       <td className={`px-6 py-4 font-bold text-slate-700 bg-white sticky left-0 z-10 group-hover:bg-indigo-50/50 transition-colors ${selectedMonth === index ? 'text-indigo-600' : ''}`}>
                         {MONTHS[index]}
                         {selectedMonth === index && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block align-middle"></span>}
                       </td>
                       
                       <td onClick={() => handleCellClick(index, 'VAR')} className="px-6 py-4 text-right cursor-pointer">
                          <span className={`px-2 py-1 rounded-lg font-mono transition-colors ${data.variableExpenses !== 0 ? 'text-rose-600 group-hover:bg-rose-100/50' : 'text-slate-300'}`}>
                            {data.variableExpenses !== 0 ? data.variableExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'FIX')} className="px-6 py-4 text-right cursor-pointer">
                          <span className={`px-2 py-1 rounded-lg font-mono transition-colors ${data.fixedExpenses !== 0 ? 'text-amber-600 group-hover:bg-amber-100/50' : 'text-slate-300'}`}>
                            {data.fixedExpenses !== 0 ? data.fixedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'INC')} className="px-6 py-4 text-right cursor-pointer">
                          <span className={`px-2 py-1 rounded-lg font-mono transition-colors ${data.income !== 0 ? 'text-emerald-600 group-hover:bg-emerald-100/50' : 'text-slate-300'}`}>
                            {data.income !== 0 ? `+${data.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'WORK_ADV')} className="px-6 py-4 text-right cursor-pointer">
                          <span className={`px-2 py-1 rounded-lg font-mono transition-colors ${data.workAdvances !== 0 ? 'text-blue-600 group-hover:bg-blue-100/50' : 'text-slate-300'}`}>
                            {data.workAdvances !== 0 ? data.workAdvances.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'WORK_REIMB')} className="px-6 py-4 text-right cursor-pointer">
                          <span className={`px-2 py-1 rounded-lg font-mono transition-colors ${data.workReimbursements !== 0 ? 'text-indigo-600 group-hover:bg-indigo-100/50' : 'text-slate-300'}`}>
                            {data.workReimbursements !== 0 ? `+${data.workReimbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT COL: Active Accounts --- */}
          <div className="lg:col-span-1 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-1"><Wallet size={20} className="text-slate-400" /> I Miei Conti</h3>
              
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-sm border border-white/40 overflow-hidden flex flex-col max-h-[600px] relative">
                  <div className="overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {activeAccountBalances.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Nessun conto attivo.</div>
                    ) : (
                        activeAccountBalances.map(acc => (
                            <div key={acc.id} className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="relative z-10 flex justify-between items-start mb-4">
                                    <div className="font-bold text-slate-700 truncate pr-2 text-lg">{acc.name}</div>
                                    <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded-md shadow-sm tracking-wide">{acc.currency}</span>
                                </div>
                                <div className="relative z-10">
                                   <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Saldo Attuale</div>
                                   <div className={`text-2xl font-mono font-bold tracking-tight ${acc.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                   </div>
                                </div>
                            </div>
                        ))
                    )}
                  </div>
              </div>
          </div>

          {/* --- RIGHT COL: Monthly Analysis --- */}
          <div className="lg:col-span-2 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-1"><Folder size={20} className="text-slate-400" /> Analisi Spese</h3>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-white/40 overflow-hidden flex flex-col h-[600px]">
                  {/* Header with Month Selector */}
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 bg-white/50">
                      <div className="flex items-center gap-3">
                          <div className="relative">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-white border border-slate-200 text-slate-800 font-bold py-2 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm cursor-pointer shadow-sm appearance-none hover:border-indigo-300 transition-colors"
                            >
                                {MONTHS.map((month, index) => <option key={index} value={index}>{month}</option>)}
                            </select>
                            <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                               <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>
                          <span className="text-slate-400 text-sm font-medium">{selectedYear}</span>
                      </div>
                      
                      <div className="flex flex-col items-end">
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Totale Uscite</div>
                         <div className="font-mono font-bold text-xl text-rose-600 tracking-tight">
                             CHF {monthlyBreakdown.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                         </div>
                      </div>
                  </div>

                  {/* Hierarchical List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {monthlyBreakdown.categories.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                             <div className="bg-slate-50 p-4 rounded-full mb-3"><TrendingDown size={32} className="text-slate-300" /></div>
                             <p>Nessuna uscita registrata.</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-slate-50 p-2">
                              {monthlyBreakdown.categories.map(([catName, data]) => (
                                  <div key={catName} className="p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-100 mb-1">
                                      {/* Category Header */}
                                      <div className="flex justify-between items-center mb-3">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                                                  <Folder size={18} />
                                              </div>
                                              <div>
                                                 <div className="font-bold text-slate-700">{catName}</div>
                                                 <div className="h-1.5 w-24 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((data.total / monthlyBreakdown.total) * 100, 100)}%` }}></div>
                                                 </div>
                                              </div>
                                          </div>
                                          <span className="font-mono font-bold text-slate-800 text-lg">
                                              {data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </span>
                                      </div>

                                      {/* Subcategories */}
                                      <div className="pl-14 space-y-2">
                                          {Array.from(data.subcategories.entries()).map(([subName, amount]) => (
                                              <div key={subName} className="flex justify-between items-center text-xs text-slate-500 group py-1 border-b border-slate-50 last:border-0">
                                                  <span className="group-hover:text-indigo-600 transition-colors font-medium flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors"></div>
                                                    {subName}
                                                  </span>
                                                  <span className="font-mono text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-md">
                                                      {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

    </div>
  );
};