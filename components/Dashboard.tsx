import React, { useState, useMemo } from 'react';
import { MegaTransaction, DbAccount } from '../types';
import { ChevronRight, TrendingUp, CreditCard, CalendarRange, ArrowDownRight, Wallet, ArrowUpRight, DollarSign, PieChart, Activity } from 'lucide-react';

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
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
  ];

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
        t.context === 'personal'
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

    return {
      total: totalMonthExpense,
      categories: Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total)
    };
  }, [transactions, selectedYear, selectedMonth]);

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

  const formatBigCurrency = (val: number) => {
    const absVal = Math.abs(val);
    const integerPart = Math.floor(absVal).toLocaleString('en-US');
    const decimalPart = (absVal % 1).toFixed(2).substring(2);
    return { integerPart, decimalPart };
  };

  const netWorthFormatted = formatBigCurrency(netWorthCHF);
  const spentFormatted = formatBigCurrency(spentThisMonth);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-[1600px] mx-auto">
      
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        
        {/* Year Selector Card */}
        <div className="md:col-span-3 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-36 md:h-auto group hover:border-indigo-100 transition-all">
           <div className="absolute right-[-20px] top-[-20px] bg-slate-50 w-32 h-32 rounded-full z-0 group-hover:scale-110 transition-transform duration-500"></div>
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest z-10 relative flex items-center gap-2">
              <CalendarRange size={14} /> Anno Fiscale
           </span>
           <div className="relative z-10 flex items-center mt-2 group-hover:translate-x-1 transition-transform">
             <div className="relative w-full">
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="appearance-none bg-transparent border-none text-5xl font-bold text-slate-800 focus:ring-0 cursor-pointer w-full z-20 relative p-0 hover:text-indigo-600 transition-colors tracking-tighter"
                >
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
             </div>
           </div>
        </div>

        {/* Expenses This Month Card */}
        <div 
           onClick={handleSpentThisMonthClick}
           className="md:col-span-4 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-lg hover:shadow-rose-100/50 transition-all relative overflow-hidden h-36 md:h-auto group"
         >
           <div className="absolute right-[-20px] bottom-[-20px] bg-rose-50 w-32 h-32 rounded-full z-0 group-hover:bg-rose-100 transition-colors duration-500"></div>
           <div className="flex flex-col h-full justify-between z-10 relative">
              <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-widest">
                <ArrowDownRight size={16} /> Uscite Var. Mese
              </div>
              <div className="text-4xl lg:text-5xl font-bold font-mono tracking-tighter text-rose-600">
                CHF {spentFormatted.integerPart}
                <span className="text-xl opacity-60 ml-1 font-sans font-medium text-rose-400">.{spentFormatted.decimalPart}</span>
              </div>
           </div>
        </div>

        {/* Net Worth Card */}
        <div 
          onClick={onNavigateToAccounts}
          className="md:col-span-5 bg-slate-900 rounded-[2rem] p-7 shadow-xl shadow-slate-900/20 cursor-pointer relative overflow-hidden group h-36 md:h-auto flex flex-col justify-center"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/30 rounded-full blur-[60px] group-hover:bg-indigo-500/40 transition-colors duration-500"></div>
          
          <div className="relative z-10 flex justify-between items-start h-full flex-col">
            <div className="text-indigo-200/80 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                 <Wallet size={14} /> Patrimonio Netto
            </div>
            <div className="text-4xl lg:text-5xl font-bold font-mono tracking-tighter text-white">
                CHF {netWorthFormatted.integerPart}
                <span className="text-xl opacity-60 ml-1 font-sans font-medium text-indigo-200">.{netWorthFormatted.decimalPart}</span>
            </div>
          </div>
          <div className="absolute bottom-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight className="text-white" size={24} />
          </div>
        </div>
      </div>

      {/* Monthly Matrix Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
         <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
               <CalendarRange size={20} />
            </div>
            <div>
               <h3 className="font-bold text-slate-800 text-lg tracking-tight">Matrice Annuale</h3>
               <p className="text-xs text-slate-400 font-medium">Panoramica flussi {selectedYear}</p>
            </div>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead>
                  <tr className="bg-slate-50/50">
                     <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] sticky left-0 bg-white z-20 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] border-b border-slate-100">Mese</th>
                     <th className="px-4 py-3 font-bold text-rose-500 uppercase tracking-wider text-[10px] text-right border-b border-slate-100">Uscite Var.</th>
                     <th className="px-4 py-3 font-bold text-amber-500 uppercase tracking-wider text-[10px] text-right border-b border-slate-100">Uscite Fisse</th>
                     <th className="px-4 py-3 font-bold text-emerald-500 uppercase tracking-wider text-[10px] text-right border-b border-slate-100">Entrate</th>
                     <th className="px-4 py-3 font-bold text-blue-500 uppercase tracking-wider text-[10px] text-right border-b border-slate-100">Ant. Lavoro</th>
                     <th className="px-4 py-3 font-bold text-indigo-500 uppercase tracking-wider text-[10px] text-right border-b border-slate-100">Rimb. Lavoro</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {monthlyData.map((data, index) => (
                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                       <td className={`px-4 py-3 font-bold text-slate-700 bg-white sticky left-0 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] group-hover:bg-slate-50/80 border-r border-slate-50`}>
                         <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold uppercase tracking-wide w-8 ${selectedMonth === index ? 'text-indigo-600' : 'text-slate-400'}`}>
                               {MONTHS[index]}
                            </span>
                            {selectedMonth === index && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
                         </div>
                       </td>
                       <td onClick={() => handleCellClick(index, 'VAR')} className="px-4 py-3 text-right cursor-pointer group-hover:scale-105 transition-transform origin-right">
                          <span className={`font-mono font-medium tracking-tight ${data.variableExpenses !== 0 ? 'text-rose-600' : 'text-slate-200'}`}>
                            {data.variableExpenses !== 0 ? data.variableExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'FIX')} className="px-4 py-3 text-right cursor-pointer group-hover:scale-105 transition-transform origin-right">
                          <span className={`font-mono font-medium tracking-tight ${data.fixedExpenses !== 0 ? 'text-amber-600' : 'text-slate-200'}`}>
                            {data.fixedExpenses !== 0 ? data.fixedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'INC')} className="px-4 py-3 text-right cursor-pointer group-hover:scale-105 transition-transform origin-right">
                          <span className={`font-mono font-medium tracking-tight ${data.income !== 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                            {data.income !== 0 ? data.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'WORK_ADV')} className="px-4 py-3 text-right cursor-pointer group-hover:scale-105 transition-transform origin-right">
                          <span className={`font-mono font-medium tracking-tight ${data.workAdvances !== 0 ? 'text-blue-600' : 'text-slate-200'}`}>
                            {data.workAdvances !== 0 ? data.workAdvances.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                       <td onClick={() => handleCellClick(index, 'WORK_REIMB')} className="px-4 py-3 text-right cursor-pointer group-hover:scale-105 transition-transform origin-right">
                          <span className={`font-mono font-medium tracking-tight ${data.workReimbursements !== 0 ? 'text-indigo-600' : 'text-slate-200'}`}>
                            {data.workReimbursements !== 0 ? data.workReimbursements.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* I MIEI CONTI (Restyled as Grid Cards) */}
          <div className="flex flex-col gap-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard size={24} className="text-indigo-600" /> I Miei Conti
                </h3>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                  {activeAccountBalances.length} Attivi
                </span>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeAccountBalances.map((acc, idx) => (
                  <div 
                    key={acc.id} 
                    className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between h-[160px]"
                  >
                     {/* Decorative Gradients */}
                     <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-20 group-hover:opacity-30 transition-opacity translate-x-10 -translate-y-10
                        ${idx % 3 === 0 ? 'bg-indigo-500' : idx % 3 === 1 ? 'bg-emerald-500' : 'bg-amber-500'}
                     `}></div>

                     <div className="relative z-10 flex justify-between items-start">
                        <div className="font-bold text-slate-700 tracking-tight text-lg">{acc.name}</div>
                        <div className="bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                           {acc.currency}
                        </div>
                     </div>
                     
                     <div className="relative z-10">
                        <div className="text-xs text-slate-400 font-medium mb-1">Saldo disponibile</div>
                        <div className={`text-2xl font-mono font-bold tracking-tight ${acc.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                           {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                     </div>
                  </div>
                ))}
                
                {/* Add Account Shortcut */}
                <div onClick={onNavigateToAccounts} className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer h-[160px] gap-2 group">
                   <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                      <Wallet size={20} />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-wide">Gestisci Conti</span>
                </div>
             </div>
          </div>

          {/* ANALISI SPESE (Restyled Cleaner) */}
          <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <PieChart size={24} className="text-rose-500" /> Analisi Spese
                 </h3>
                 
                 {/* Styled Month Selector for this section */}
                 <div className="relative group">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="appearance-none bg-white text-slate-700 font-bold text-xs pl-4 pr-10 py-2 rounded-full shadow-sm border border-slate-200 hover:border-indigo-300 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all uppercase tracking-wide"
                    >
                        {MONTHS.map((month, index) => <option key={index} value={index}>{month}</option>)}
                    </select>
                    <ChevronRight size={14} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                 </div>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full min-h-[400px]">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                      <div>
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Totale Uscite {MONTHS[selectedMonth]}</div>
                         <div className="font-mono font-bold text-3xl text-rose-600 tracking-tighter">
                            CHF {monthlyBreakdown.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </div>
                      </div>
                      <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center shadow-sm">
                         <Activity className="text-rose-500" size={24} />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                      {monthlyBreakdown.categories.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm space-y-2 opacity-60">
                             <DollarSign size={32} />
                             <p>Nessuna spesa personale.</p>
                          </div>
                      ) : (
                          <div className="flex flex-col gap-5">
                              {monthlyBreakdown.categories.map(([catName, data], idx) => {
                                const percent = Math.min((data.total / monthlyBreakdown.total) * 100, 100);
                                return (
                                  <div key={catName} className="group">
                                      <div className="flex justify-between items-end mb-2">
                                          <div className="flex items-center gap-2">
                                             {/* Badge Number for top expenses */}
                                             <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {idx + 1}
                                             </div>
                                             <div className="font-bold text-slate-700 text-sm">{catName}</div>
                                          </div>
                                          <div className="text-right">
                                             <div className="font-mono font-bold text-slate-800 text-sm">
                                                {data.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                             <div className="text-[10px] text-slate-400 font-medium">{percent.toFixed(1)}%</div>
                                          </div>
                                      </div>
                                      
                                      {/* Progress Bar */}
                                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden mb-2">
                                         <div 
                                            className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${percent}%`, opacity: Math.max(0.3, 1 - (idx * 0.15)) }}
                                         ></div>
                                      </div>
                                      
                                      {/* Subcategories Micro-list */}
                                      <div className="flex flex-wrap gap-2 pl-7">
                                          {Array.from(data.subcategories.entries()).slice(0, 3).map(([subName, amount]) => (
                                              <span key={subName} className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                  {subName}: <span className="font-mono text-slate-600">{amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                                              </span>
                                          ))}
                                          {data.subcategories.size > 3 && <span className="text-[10px] text-slate-400">+{data.subcategories.size - 3}</span>}
                                      </div>
                                  </div>
                              )})}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};