import React, { useState, useMemo } from 'react';
import { MegaTransaction, DbAccount } from '../types';
import { Calendar, TrendingDown, Wallet, Building2, ChevronRight, Folder } from 'lucide-react';

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
      // Filter: Year Match AND Month Match AND Expense AND Analytics Included
      if (
        d.getFullYear() === selectedYear && 
        d.getMonth() === selectedMonth && 
        t.amount_base < 0 && 
        t.analytics_included
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Year Selector (Global) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase"><Calendar size={14} /> Anno Fiscale</div>
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold py-2 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
            >
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
        </div>

        {/* Spent This Month */}
        <div 
           onClick={handleSpentThisMonthClick}
           className="bg-white border border-slate-200 text-slate-800 rounded-2xl p-6 shadow-sm cursor-pointer hover:border-rose-200 hover:shadow-md transition-all group relative overflow-hidden active:scale-95"
         >
          <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity text-rose-500"><TrendingDown size={100} /></div>
          <div className="flex items-center gap-2 mb-3 text-slate-400 group-hover:text-rose-500 transition-colors text-xs font-bold uppercase tracking-widest">
            <TrendingDown size={14} /> Uscite Var. (Mese)
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-rose-600 relative z-10">
            CHF {Math.abs(spentThisMonth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Net Worth (Spans 2 cols on LG) */}
        <div 
          onClick={onNavigateToAccounts}
          className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl shadow-indigo-900/10 cursor-pointer relative overflow-hidden group transition-transform active:scale-95 hover:scale-[1.01]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={120} /></div>
          <div className="relative z-10 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-2 opacity-80 text-xs font-bold uppercase tracking-widest"><Building2 size={14} /> Patrimonio Netto</div>
            <div className="text-4xl font-bold font-mono tracking-tight mb-1">
              CHF {netWorthCHF.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* --- Monthly Matrix (Moved Here) --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Calendar size={20} className="text-slate-500" />
            <h3 className="font-bold text-slate-700">Matrice Annuale {selectedYear}</h3>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-white border-b border-slate-200">
                  <tr>
                     <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-xs sticky left-0 bg-white z-10 border-r border-slate-50">Mese</th>
                     <th className="px-6 py-4 font-bold text-rose-600 uppercase tracking-wider text-xs text-right">Uscite Var.</th>
                     <th className="px-6 py-4 font-bold text-amber-600 uppercase tracking-wider text-xs text-right">Uscite Fisse</th>
                     <th className="px-6 py-4 font-bold text-emerald-600 uppercase tracking-wider text-xs text-right">Entrate</th>
                     <th className="px-6 py-4 font-bold text-blue-600 uppercase tracking-wider text-xs text-right">Ant. Lavoro</th>
                     <th className="px-6 py-4 font-bold text-indigo-600 uppercase tracking-wider text-xs text-right">Rimb. Lavoro</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {monthlyData.map((data, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                       <td className={`px-6 py-4 font-medium text-slate-700 border-r border-slate-50 bg-white sticky left-0 z-10 ${selectedMonth === index ? 'text-indigo-600 bg-indigo-50/50' : ''}`}>{MONTHS[index]}</td>
                       <td onClick={() => handleCellClick(index, 'VAR')} className="px-6 py-4 text-right font-mono text-rose-600 cursor-pointer hover:bg-rose-50 hover:font-bold">{data.variableExpenses !== 0 ? data.variableExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                       <td onClick={() => handleCellClick(index, 'FIX')} className="px-6 py-4 text-right font-mono text-amber-600 bg-amber-50/30 cursor-pointer hover:bg-amber-100 hover:font-bold">{data.fixedExpenses !== 0 ? data.fixedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                       <td onClick={() => handleCellClick(index, 'INC')} className="px-6 py-4 text-right font-mono text-emerald-600 cursor-pointer hover:bg-emerald-50 hover:font-bold">{data.income !== 0 ? `+${data.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                       <td onClick={() => handleCellClick(index, 'WORK_ADV')} className="px-6 py-4 text-right font-mono text-blue-600 bg-blue-50/30 cursor-pointer hover:bg-blue-100 hover:font-bold">{data.workAdvances !== 0 ? data.workAdvances.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                       <td onClick={() => handleCellClick(index, 'WORK_REIMB')} className="px-6 py-4 text-right font-mono text-indigo-600 cursor-pointer hover:bg-indigo-50 hover:font-bold">{data.workReimbursements !== 0 ? `+${data.workReimbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
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
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Wallet size={20} /> I Miei Conti</h3>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
                  <div className="overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {activeAccountBalances.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Nessun conto attivo.</div>
                    ) : (
                        activeAccountBalances.map(acc => (
                            <div key={acc.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-slate-700 truncate pr-2">{acc.name}</div>
                                    <span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100">{acc.currency}</span>
                                </div>
                                <div className={`text-xl font-mono font-bold ${acc.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        ))
                    )}
                  </div>
              </div>
          </div>

          {/* --- RIGHT COL: Monthly Analysis (TagManager Style) --- */}
          <div className="lg:col-span-2 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Folder size={20} /> Analisi Spese</h3>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                  {/* Header with Month Selector */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                      <div className="flex items-center gap-3">
                          <select
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                              className="bg-white border border-slate-300 text-slate-800 font-bold py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer shadow-sm"
                          >
                              {MONTHS.map((month, index) => <option key={index} value={index}>{month}</option>)}
                          </select>
                          <span className="text-slate-400 text-sm font-medium">{selectedYear}</span>
                      </div>
                      
                      <div className="text-right">
                         <div className="text-xs text-slate-400 font-bold uppercase">Totale Uscite</div>
                         <div className="font-mono font-bold text-lg text-rose-600">
                             CHF {monthlyBreakdown.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                         </div>
                      </div>
                  </div>

                  {/* Hierarchical List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {monthlyBreakdown.categories.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                             <TrendingDown size={48} className="mb-2 text-slate-200" />
                             <p>Nessuna uscita registrata per questo mese.</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-slate-50">
                              {monthlyBreakdown.categories.map(([catName, data]) => (
                                  <div key={catName} className="p-4 hover:bg-slate-50/50 transition-colors">
                                      {/* Category Header */}
                                      <div className="flex justify-between items-center mb-2">
                                          <div className="flex items-center gap-2">
                                              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                  <Folder size={16} />
                                              </div>
                                              <span className="font-bold text-slate-700">{catName}</span>
                                          </div>
                                          <span className="font-mono font-bold text-slate-800">
                                              {data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </span>
                                      </div>

                                      {/* Subcategories */}
                                      <div className="pl-10 space-y-2 border-l-2 border-slate-100 ml-3">
                                          {Array.from(data.subcategories.entries()).map(([subName, amount]) => (
                                              <div key={subName} className="flex justify-between items-center text-xs text-slate-500 group">
                                                  <span className="group-hover:text-indigo-600 transition-colors">{subName}</span>
                                                  <span className="font-mono text-slate-600">
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