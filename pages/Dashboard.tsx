
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { AppSection } from '../types';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export const Dashboard: React.FC = () => {
  const { transactions, accounts, essentialTransactions, categories } = useFinance();
  const { navigateTo } = useNavigation();
  
  const currentRealDate = new Date();
  const currentDayOfMonth = currentRealDate.getDate(); // Per calcolo scaduti
  
  const [selectedYear, setSelectedYear] = useState<number>(currentRealDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentRealDate.getMonth()); // 0-11

  const [rates, setRates] = useState<Record<string, number>>({ CHF: 1, EUR: 1, USD: 1 });
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isInvestmentsHidden, setIsInvestmentsHidden] = useState(true); // Blur attivo di default
  
  // Tab state for the bottom-left panel
  const [listTab, setListTab] = useState<'recent' | 'essential'>('recent');

  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const shortMonthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [resEur, resUsd] = await Promise.all([
          fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=CHF'),
          fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=CHF')
        ]);
        const dataEur = await resEur.json();
        const dataUsd = await resUsd.json();
        setRates({ CHF: 1, EUR: dataEur.rates.CHF, USD: dataUsd.rates.CHF });
      } catch (error) { console.error(error); }
    };
    fetchRates();
  }, []);

  const availableYears = useMemo(() => {
    const years = transactions.map(t => parseInt(t.occurred_on.split('-')[0]));
    const unique = Array.from(new Set(years));
    if (!unique.includes(currentRealDate.getFullYear())) unique.push(currentRealDate.getFullYear());
    return unique.sort((a: number, b: number) => b - a);
  }, [transactions]);

  // Options for Selects
  const yearOptions = useMemo(() => availableYears.map(y => ({ value: y, label: y.toString() })), [availableYears]);
  const monthOptions = useMemo(() => monthNames.map((m, i) => ({ value: i, label: m })), [monthNames]);

  // Helper per categorie
  const getCategoryInfo = (id: string | null) => {
    if (!id) return { category: 'Generale', subcategory: '-' };
    const cat = categories.find(c => c.id === id);
    if (!cat) return { category: 'Generale', subcategory: '-' };
    const parent = cat.parent_id ? categories.find(p => p.id === cat.parent_id) : null;
    return { 
        category: parent ? parent.name : cat.name, 
        subcategory: parent ? cat.name : '-' 
    };
  };

  // Helper per account currency
  const getAccountCurrency = (accountId: string) => {
      const acc = accounts.find(a => a.id === accountId);
      return acc ? acc.currency_code : 'CHF';
  };

  // --- CALCOLI WIDGET ---

  // 1. Patrimonio
  const wealthData = useMemo(() => {
    const accountBalances: Record<string, number> = {};
    
    transactions.forEach(t => {
        const amount = t.amount_original || 0;
        let val = 0;
        if (t.kind.startsWith('expense_')) val = -Math.abs(amount);
        else if (t.kind.startsWith('income_')) val = Math.abs(amount);
        else val = amount;
        
        accountBalances[t.account_id] = (accountBalances[t.account_id] || 0) + val;
    });

    let liquidityCHF = 0;
    let investmentsCHF = 0;

    accounts.filter(a => !a.exclude_from_overview).forEach(acc => {
      const balance = accountBalances[acc.id] || 0;
      const chfValue = balance * (rates[acc.currency_code] || 1);
      
      if (acc.kind === 'invest') investmentsCHF += chfValue;
      else if (acc.kind === 'cash') liquidityCHF += chfValue;
    });

    return { liquidity: liquidityCHF, investments: investmentsCHF };
  }, [accounts, transactions, rates]); 

  // 2. Variabili Mese Corrente
  const currentMonthRealVariables = useMemo(() => {
      const now = new Date();
      const currentY = now.getFullYear();
      const currentM = now.getMonth();

      let total = 0;
      transactions.forEach(t => {
          const [tY, tM] = t.occurred_on.split('-').map(Number);
          if (tY === currentY && (tM - 1) === currentM && t.kind === 'expense_personal') {
              total += Math.abs(t.amount_base || 0);
          }
      });
      return total;
  }, [transactions]);

  // 3. Pulse
  const currentMonthStats = useMemo(() => {
      let income = 0;
      let variableExpense = 0; 
      let fixedExpense = 0;    
      
      transactions.forEach(t => {
          const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
          if (tYear === selectedYear && (tMonth - 1) === selectedMonth) {
              const absAmt = Math.abs(t.amount_base || 0);
              
              if (t.kind === 'expense_personal') variableExpense += absAmt;
              else if (t.kind === 'expense_essential') fixedExpense += absAmt;
              else if (['income_personal', 'income_essential', 'income_pension'].includes(t.kind)) income += absAmt;
          }
      });
      
      const netBalance = income - variableExpense - fixedExpense;
      const totalVolume = income + fixedExpense + variableExpense;
      const denominator = totalVolume > 0 ? totalVolume : 1;

      return { 
          income, fixedExpense, variableExpense, netBalance,
          variablePct: (variableExpense / denominator) * 100,
          fixedPct: (fixedExpense / denominator) * 100,
          incomePct: (income / denominator) * 100
      };
  }, [transactions, selectedYear, selectedMonth]);

  // 4. Status Spese Essenziali & Giroconti (WIDGET LOGIC)
  const essentialsBreakdown = useMemo(() => {
      const activeEssentials = essentialTransactions.filter(e => {
          const [eYear, eMonth] = e.occurred_on.split('-').map(Number);
          return eYear === selectedYear && (eMonth - 1) === selectedMonth;
      });

      // Gruppo 1: Spese Fisse (Expenses)
      const expenses = { total: 0, paid: 0, remainingAmount: 0 };
      // Gruppo 2: Allocazioni (Pocket, Invest, Pension)
      const allocations = { total: 0, paid: 0, remainingAmount: 0 };

      activeEssentials.forEach(rec => {
          const amount = Math.abs(rec.amount_original);
          
          // Check if paid (real execution)
          const isPaid = transactions.some(t => {
              if (t.essential_transaction_id !== rec.id) return false;
              if (rec.kind === 'expense_essential' || rec.kind === 'essential') {
                  // For Expenses: Must be an EXPENSE transaction
                  return t.kind.startsWith('expense');
              }
              // For Transfers: Any transaction is likely the execution
              return true;
          });
          
          const isAllocation = 
                rec.kind.includes('pocket') || 
                rec.kind.includes('invest') || 
                rec.kind.includes('pension') || 
                rec.kind.includes('budget') ||
                rec.kind === 'transfer';

          if (isAllocation) {
              allocations.total++;
              if (isPaid) allocations.paid++;
              else allocations.remainingAmount += amount;
          } else {
              // Expense
              expenses.total++;
              if (isPaid) expenses.paid++;
              else expenses.remainingAmount += amount;
          }
      });

      return { expenses, allocations };
  }, [essentialTransactions, transactions, selectedYear, selectedMonth]);

  // 5. Ultimi Movimenti
  const recentTransactions = useMemo(() => {
      return transactions
        .filter(t => {
            const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
            const isExcluded = t.kind === 'expense_essential' || t.kind.startsWith('transfer_') || t.kind === 'adjustment';
            return tYear === selectedYear && (tMonth - 1) === selectedMonth && !isExcluded;
        })
        .sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime())
        .slice(0, 15);
  }, [transactions, selectedYear, selectedMonth]);

  // 6. Lista Essenziali & Allocazioni (LIST LOGIC)
  const groupedEssentials = useMemo(() => {
      const active = essentialTransactions.filter(e => {
          const [eYear, eMonth] = e.occurred_on.split('-').map(Number);
          return eYear === selectedYear && (eMonth - 1) === selectedMonth;
      });
      
      const mapped = active.map(rec => {
          const parts = rec.occurred_on.split('-');
          const day = parseInt(parts[2]);
          
          // Classification matches the widget logic
          const isAllocation = 
                rec.kind.includes('pocket') || 
                rec.kind.includes('invest') || 
                rec.kind.includes('pension') || 
                rec.kind.includes('budget') ||
                rec.kind === 'transfer';
          
          // VERIFICA REALE: Pagato?
          const isPaid = transactions.some(t => {
              if (t.essential_transaction_id !== rec.id) return false;
              if (rec.kind === 'expense_essential' || rec.kind === 'essential') {
                  return t.kind.startsWith('expense');
              }
              return true;
          });

          // VERIFICA: Pronto? (Solo per Spese: Ha i fondi accantonati ma non è ancora uscita?)
          let isReady = false;
          if (!isAllocation && !isPaid) {
              isReady = transactions.some(t => 
                  t.essential_transaction_id === rec.id && (t.kind.startsWith('transfer') || t.kind === 'transfer')
              );
          }

          // VERIFICA SCADENZA
          const isCurrentMonthView = selectedYear === currentRealDate.getFullYear() && selectedMonth === currentRealDate.getMonth();
          const isPastMonthView = selectedYear < currentRealDate.getFullYear() || (selectedYear === currentRealDate.getFullYear() && selectedMonth < currentRealDate.getMonth());
          
          let isOverdue = false;
          if (!isPaid) {
              if (isPastMonthView) isOverdue = true;
              else if (isCurrentMonthView && currentDayOfMonth > day) isOverdue = true;
          }

          return { ...rec, isPaid, isReady, isOverdue, day, isAllocation };
      });

      const expenses = mapped.filter(r => !r.isAllocation).sort((a, b) => a.day - b.day);
      const allocations = mapped.filter(r => r.isAllocation).sort((a, b) => a.day - b.day);

      return { expenses, allocations };
  }, [essentialTransactions, transactions, selectedYear, selectedMonth, currentDayOfMonth, currentRealDate]);

  // 7. Matrice Dati
  const matrixData = useMemo(() => {
    const data = Array.from({ length: 12 }, () => ({ income: 0, variable: 0, fixed: 0, workIncome: 0, workExpense: 0 }));
    
    transactions.forEach(t => {
      const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
      if (tYear !== selectedYear) return;
      const monthIdx = tMonth - 1;
      const amount = Math.abs(t.amount_base || 0);
      
      switch (t.kind) {
          case 'income_personal': case 'income_essential': case 'income_pension':
              data[monthIdx].income += amount; break;
          case 'expense_personal':
              data[monthIdx].variable += amount; break;
          case 'expense_essential':
              data[monthIdx].fixed += amount; break;
          case 'income_work':
              data[monthIdx].workIncome += amount; break;
          case 'expense_work':
              data[monthIdx].workExpense += amount; break;
      }
    });
    return data;
  }, [transactions, selectedYear]);

  const goToTransactions = (monthIdx: number, type: 'income' | 'variable' | 'fixed' | 'work_income' | 'work_expense') => {
    const monthsFilter = monthIdx === -1 ? [] : [monthIdx + 1];
    const params: any = { year: selectedYear.toString(), months: monthsFilter, search: '', accounts: [], category: '', subcategory: '', tag: '' };

    if (type === 'income') { params.types = ['income_personal', 'income_essential', 'income_pension']; params.amountSign = 'positive'; } 
    else if (type === 'variable') { params.types = ['expense_personal']; params.amountSign = 'negative'; } 
    else if (type === 'fixed') { params.types = ['expense_essential']; params.amountSign = 'negative'; } 
    else if (type === 'work_income') { params.types = ['income_work']; params.amountSign = 'positive'; }
    else if (type === 'work_expense') { params.types = ['expense_work']; params.amountSign = 'negative'; }

    navigateTo(AppSection.Movimenti, params);
  };

  const handleVariableExpensesClick = () => {
      const now = new Date();
      navigateTo(AppSection.Movimenti, {
          year: now.getFullYear().toString(),
          months: [now.getMonth() + 1],
          types: ['expense_personal'],
          amountSign: 'negative'
      });
  };

  const getKindBadge = (kind: string) => {
      if (kind === 'expense_personal') return <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Personal</span>;
      if (kind === 'expense_work') return <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Work</span>;
      if (kind === 'income_work') return <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">Work Inc.</span>;
      return null;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 w-full max-w-full overflow-x-hidden pb-32">
      
      {/* 1. HEADER & PATRIMONIO */}
      <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <div className="flex items-center gap-3">
                   <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Dashboard</h2>
                   <button onClick={() => setIsInfoOpen(true)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                       <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </button>
               </div>
               <p className="text-slate-400 font-medium mt-1 text-sm">Panoramica completa delle tue finanze.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 -mx-2 px-2 md:mx-0 md:px-0">
              {/* CARD 1: USCITE VARIABILI */}
              <div onClick={handleVariableExpensesClick} className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-center h-auto min-h-[90px]">
                 <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1 truncate w-full">Uscite Variabili</span>
                    <div className="text-sm md:text-2xl font-black text-indigo-600 md:text-slate-900 tracking-tight truncate w-full">
                        {currentMonthRealVariables.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-[10px] md:text-base font-bold text-slate-400">CHF</span>
                    </div>
                 </div>
              </div>

              {/* CARD 2: LIQUIDITA' */}
              <div onClick={() => navigateTo(AppSection.Conti)} className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-center h-auto min-h-[90px]">
                 <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1 truncate w-full">Liquidità</span>
                    <div className="text-sm md:text-2xl font-black text-blue-600 md:text-slate-900 tracking-tight truncate w-full">
                        {wealthData.liquidity.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-[10px] md:text-base font-bold text-slate-400">CHF</span>
                    </div>
                 </div>
              </div>

              {/* CARD 3: INVESTIMENTI */}
              <div onClick={() => navigateTo(AppSection.Portfolio)} className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-center h-auto min-h-[90px] relative">
                 <button onClick={(e) => { e.stopPropagation(); setIsInvestmentsHidden(!isInvestmentsHidden); }} className="absolute top-1 right-1 p-1.5 text-slate-300 hover:text-slate-500 z-20 md:hidden">
                    {isInvestmentsHidden ? (<svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>)}
                 </button>
                 <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="flex items-center gap-1 mb-1 justify-center md:justify-start w-full">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">Investimenti</span>
                        <button onClick={(e) => { e.stopPropagation(); setIsInvestmentsHidden(!isInvestmentsHidden); }} className="hidden md:block p-0.5 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors">
                            {isInvestmentsHidden ? (<svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>)}
                        </button>
                    </div>
                    <div className={`text-sm md:text-2xl font-black text-emerald-600 md:text-slate-900 tracking-tight transition-all duration-300 truncate w-full ${isInvestmentsHidden ? 'blur-sm select-none opacity-50' : ''}`}>
                        {wealthData.investments.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-[10px] md:text-base font-bold text-slate-400">CHF</span>
                    </div>
                 </div>
              </div>
          </div>
      </div>

      {/* SEPARATOR & FILTERS */}
      <div className="flex items-center justify-between py-2 border-t border-b border-slate-200/50 sticky top-0 bg-[#f9fafb]/95 backdrop-blur-md z-30 -mx-4 px-4 md:mx-0 md:px-0 mt-2">
          <div className="flex items-center gap-2"><div className="w-1 h-4 bg-blue-600 rounded-full"></div><h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Analisi Periodo</h3></div>
          <div className="flex gap-2">
              <div className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center space-x-2 min-w-[130px]"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mese</span><CustomSelect value={selectedMonth} onChange={(val) => setSelectedMonth(Number(val))} options={monthOptions} minimal={true} anchor="right" /></div>
              <div className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center space-x-2 min-w-[100px]"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anno</span><CustomSelect value={selectedYear} onChange={(val) => setSelectedYear(Number(val))} options={yearOptions} minimal={true} anchor="right" /></div>
          </div>
      </div>

      {/* 2. ANALISI MENSILE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div onClick={() => navigateTo(AppSection.Analisi)} className="md:col-span-2 bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pulse di {monthNames[selectedMonth]} {selectedYear}</h3>
                  <div className="flex flex-col items-end"><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Saldo Personale</span><span className={`text-base font-black ${currentMonthStats.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currentMonthStats.netBalance.toLocaleString('it-IT', { minimumFractionDigits: 0 })} <span className="text-[10px] text-slate-400">CHF</span></span></div>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex relative mb-3">
                  <div className="h-full bg-indigo-500 transition-all duration-500 relative group flex-shrink-0" style={{ width: `${currentMonthStats.variablePct}%` }}></div>
                  <div className="h-full bg-rose-500 transition-all duration-500 relative group flex-shrink-0 border-l border-white/20" style={{ width: `${currentMonthStats.fixedPct}%` }}></div>
                  <div className="h-full bg-emerald-500 transition-all duration-500 relative group flex-shrink-0 border-l border-white/20" style={{ width: `${currentMonthStats.incomePct}%` }}></div>
              </div>
              <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start gap-0.5"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Variabili</span></div><span className="text-xs font-black text-slate-700 pl-3">{currentMonthStats.variableExpense.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span></div>
                  <div className="flex flex-col items-center gap-0.5"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Essenziali</span></div><span className="text-xs font-black text-slate-700">{currentMonthStats.fixedExpense.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span></div>
                  <div className="flex flex-col items-end gap-0.5"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Entrate</span></div><span className="text-xs font-black text-slate-700 pr-3">{currentMonthStats.income.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span></div>
              </div>
          </div>

          <div onClick={() => navigateTo(AppSection.SpeseEssenziali)} className="bg-white p-0 rounded-[1.5rem] border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all relative overflow-hidden flex flex-row items-stretch min-h-[100px]">
              <div className="w-1/2 p-4 flex flex-col justify-center border-r border-slate-100 relative">
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Spese Fisse</h3>
                  <div className="flex items-baseline gap-1 mb-1"><span className="text-xl font-black text-slate-900">{essentialsBreakdown.expenses.paid}</span><span className="text-[10px] font-medium text-slate-400">/ {essentialsBreakdown.expenses.total}</span></div>
                  <div className="mt-auto"><span className="text-[8px] text-slate-300 uppercase font-bold block">Rimanente</span><span className="text-xs font-bold text-rose-500 truncate block">{essentialsBreakdown.expenses.remainingAmount > 0 ? `~ ${essentialsBreakdown.expenses.remainingAmount.toLocaleString('it-IT', { minimumFractionDigits: 0 })}` : '0'} <span className="text-[9px] text-slate-400 font-normal">CHF</span></span></div>
              </div>
              <div className="w-1/2 p-4 flex flex-col justify-center relative bg-slate-50/30">
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Allocazione</h3>
                  <div className="flex items-baseline gap-1 mb-1"><span className="text-xl font-black text-slate-900">{essentialsBreakdown.allocations.paid}</span><span className="text-[10px] font-medium text-slate-400">/ {essentialsBreakdown.allocations.total}</span></div>
                  <div className="mt-auto"><span className="text-[8px] text-slate-300 uppercase font-bold block">Da Spostare</span><span className="text-xs font-bold text-blue-500 truncate block">{essentialsBreakdown.allocations.remainingAmount > 0 ? `~ ${essentialsBreakdown.allocations.remainingAmount.toLocaleString('it-IT', { minimumFractionDigits: 0 })}` : '0'} <span className="text-[9px] text-slate-400 font-normal">CHF</span></span></div>
              </div>
          </div>
      </div>

      {/* 3. DETTAGLIO */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px] xl:h-0 xl:min-h-full">
              <div className="px-6 py-5 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
                  <div className="flex space-x-4">
                      <button onClick={() => setListTab('recent')} className={`text-sm font-bold uppercase tracking-wide transition-colors ${listTab === 'recent' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Recenti</button>
                      <div className="w-px bg-slate-200 h-4 self-center"></div>
                      <button onClick={() => setListTab('essential')} className={`text-sm font-bold uppercase tracking-wide transition-colors ${listTab === 'essential' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Essenziali ({monthNames[selectedMonth]})</button>
                  </div>
                  <button onClick={() => navigateTo(listTab === 'recent' ? AppSection.Movimenti : AppSection.SpeseEssenziali)} className="text-xs font-bold text-blue-600 hover:underline">Vedi Tutti</button>
              </div>
              
              <div className="p-2 flex-1 overflow-y-auto no-scrollbar relative">
                  
                  {/* TAB: Recenti Variabili */}
                  {listTab === 'recent' && (
                      <>
                        {recentTransactions.map(tx => {
                            const { category, subcategory } = getCategoryInfo(tx.category_id);
                            const currency = getAccountCurrency(tx.account_id);
                            const dateObj = new Date(tx.occurred_on);
                            
                            return (
                                <div key={tx.id} className="flex items-center p-3 hover:bg-slate-50 rounded-2xl transition-all gap-3 border border-transparent hover:border-slate-100 cursor-pointer">
                                    {/* Date Box */}
                                    <div className="flex flex-col items-center justify-center w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{dateObj.toLocaleString('it-IT', { month: 'short' }).replace('.', '')}</span>
                                        <span className="text-sm font-black text-slate-700 leading-none">{dateObj.getDate()}</span>
                                    </div>
                                    
                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-black text-slate-800 truncate pr-2">{category}</span>
                                            <span className={`text-xs font-black whitespace-nowrap ${(tx.amount_base || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[9px] font-bold text-slate-300">{currency}</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className="text-[10px] font-medium text-slate-400 truncate">{subcategory !== '-' ? subcategory : (tx.description || 'Generale')}</span>
                                                {tx.tag && <span className="text-[9px] font-bold text-slate-300">#{tx.tag}</span>}
                                            </div>
                                            {getKindBadge(tx.kind)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {recentTransactions.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">Nessun movimento recente trovato per {monthNames[selectedMonth]} {selectedYear}.</div>
                        )}
                      </>
                  )}

                  {/* TAB: Essenziali (Spese & Allocazioni) */}
                  {listTab === 'essential' && (
                      <div>
                        {/* Spese Fisse */}
                        {groupedEssentials.expenses.length > 0 && (
                            <>
                                <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100/50">Spese Fisse</div>
                                {groupedEssentials.expenses.map(rec => (
                                    <div 
                                        key={rec.id} 
                                        onClick={() => navigateTo(AppSection.SpeseEssenziali)}
                                        className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 rounded-xl transition-colors gap-2 cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Icon Logic: Green (Paid), Blue (Ready/Accantonato), Red (Overdue), Grey (Scheduled) */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                                                rec.isPaid 
                                                    ? 'bg-emerald-100 border-emerald-200 text-emerald-600' 
                                                    : rec.isReady
                                                        ? 'bg-blue-100 border-blue-200 text-blue-600'
                                                        : rec.isOverdue 
                                                            ? 'bg-rose-50 border-rose-200 text-rose-500' 
                                                            : 'bg-white border-slate-200 text-slate-300'
                                            }`}>
                                                {rec.isPaid ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                ) : rec.isReady ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                ) : rec.isOverdue ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                ) : (
                                                    <span className="text-[9px] font-bold">{rec.day}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-black truncate ${rec.isPaid ? 'text-slate-600' : 'text-slate-800'}`}>
                                                    {rec.name}
                                                </span>
                                                <span className={`text-[10px] font-bold ${
                                                    rec.isPaid ? 'text-emerald-600' 
                                                    : rec.isReady ? 'text-blue-600'
                                                    : rec.isOverdue ? 'text-rose-500' 
                                                    : 'text-slate-400'
                                                }`}>
                                                    {rec.isPaid ? 'Pagato' : rec.isReady ? 'Pronta (Accantonata)' : rec.isOverdue ? `Scaduto il ${rec.day}` : `Scade il ${rec.day}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <span className={`text-xs font-black block ${rec.isPaid ? 'text-emerald-600' : rec.isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>
                                                {Math.abs(rec.amount_original).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase">{rec.currency_original}</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Allocazioni (Invest, Pension, Pocket) */}
                        {groupedEssentials.allocations.length > 0 && (
                            <>
                                <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100/50 mt-2">Risparmio & Investimenti</div>
                                {groupedEssentials.allocations.map(rec => (
                                    <div 
                                        key={rec.id} 
                                        onClick={() => navigateTo(AppSection.SpeseEssenziali)}
                                        className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 rounded-xl transition-colors gap-2 cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                                                rec.isPaid 
                                                    ? 'bg-blue-100 border-blue-200 text-blue-600' 
                                                    : rec.isOverdue 
                                                        ? 'bg-rose-50 border-rose-200 text-rose-500'
                                                        : 'bg-white border-slate-200 text-blue-300'
                                            }`}>
                                                {rec.isPaid ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                ) : rec.isOverdue ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                ) : (
                                                    <span className="text-[9px] font-bold">{rec.day}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-black truncate ${rec.isPaid ? 'text-slate-600' : 'text-slate-800'}`}>
                                                    {rec.name}
                                                </span>
                                                <span className={`text-[10px] font-bold ${rec.isPaid ? 'text-blue-600' : rec.isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    {rec.isPaid ? 'Eseguito' : rec.isOverdue ? `Scaduto il ${rec.day}` : `Previsto il ${rec.day}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <span className={`text-xs font-black block ${
                                                rec.isPaid 
                                                    ? 'text-blue-600' 
                                                    : rec.isOverdue 
                                                        ? 'text-rose-600' 
                                                        : 'text-slate-400'
                                            }`}>
                                                {Math.abs(rec.amount_original).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase">{rec.currency_original}</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {groupedEssentials.expenses.length === 0 && groupedEssentials.allocations.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">Nessuna voce pianificata trovata per {monthNames[selectedMonth]} {selectedYear}.</div>
                        )}
                      </div>
                  )}

              </div>
          </div>

          <div className="xl:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <div className="px-6 py-5 bg-[#fcfdfe] border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Cashflow {selectedYear}</h3>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">CHF</span>
             </div>
             
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-[350px] table-fixed text-left">
                   <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                         <th className="w-[50px] px-2 py-2 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Mese</th>
                         <th className="px-1 py-2 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Entrate</th>
                         <th className="px-1 py-2 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Uscite <span className="text-[8px] md:text-[10px] font-medium text-slate-400 normal-case block">(Var/Fix)</span></th>
                         <th className="px-1 py-2 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Lavoro <span className="text-[8px] md:text-[10px] font-medium text-slate-400 normal-case block">(In/Out)</span></th>
                         <th className="px-1 py-2 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Netto</th>
                      </tr>
                   </thead>
                   <tbody>
                      {matrixData.map((data, idx) => {
                         const rowTotal = (data.income + data.workIncome) - (data.variable + data.fixed + data.workExpense);
                         const isSelected = idx === selectedMonth;
                         
                         if (rowTotal === 0 && data.income === 0 && !isSelected) return null;

                         return (
                            <tr key={idx} className={`border-b border-slate-50 last:border-0 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                               <td className="px-2 py-2 align-middle">
                                  <span className={`text-xs md:text-sm font-bold ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>{monthNames[idx].substring(0,3)}</span>
                               </td>
                               <td onClick={() => goToTransactions(idx, 'income')} className="px-1 py-2 text-center align-middle cursor-pointer hover:bg-emerald-50/50 transition-colors"><span className={`text-xs md:text-sm font-mono font-medium ${data.income !== 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{data.income !== 0 ? data.income.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span></td>
                               <td className="px-1 py-2 text-center align-middle cursor-pointer hover:bg-slate-50 transition-colors">
                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                      <span onClick={() => goToTransactions(idx, 'variable')} className={`text-[10px] md:text-xs font-mono font-bold leading-none hover:underline ${data.variable !== 0 ? 'text-indigo-500' : 'text-slate-300'}`}>{data.variable !== 0 ? data.variable.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span>
                                      <span onClick={() => goToTransactions(idx, 'fixed')} className={`text-[10px] md:text-xs font-mono font-bold leading-none hover:underline ${data.fixed !== 0 ? 'text-rose-500' : 'text-slate-300'}`}>{data.fixed !== 0 ? data.fixed.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span>
                                  </div>
                               </td>
                               <td className="px-1 py-2 text-center align-middle cursor-pointer hover:bg-amber-50/50 transition-colors">
                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                      <span onClick={() => goToTransactions(idx, 'work_income')} className={`text-[10px] md:text-xs font-mono font-bold leading-none hover:underline ${data.workIncome !== 0 ? 'text-amber-500' : 'text-slate-300'}`}>{data.workIncome !== 0 ? data.workIncome.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span>
                                      <span onClick={() => goToTransactions(idx, 'work_expense')} className={`text-[10px] md:text-xs font-mono font-bold leading-none hover:underline ${data.workExpense !== 0 ? 'text-orange-600' : 'text-slate-300'}`}>{data.workExpense !== 0 ? data.workExpense.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span>
                                  </div>
                               </td>
                               <td className="px-1 py-2 text-center align-middle"><span className={`text-xs md:text-sm font-mono font-bold ${rowTotal > 0 ? 'text-emerald-600' : rowTotal < 0 ? 'text-rose-600' : 'text-slate-300'}`}>{rowTotal !== 0 ? rowTotal.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span></td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
      </div>

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Report Finanziario"
        subtitle="Help"
      >
        <div className="space-y-6">
           <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
               <p className="text-sm text-indigo-800 leading-relaxed font-medium">
                  Questa dashboard ti aiuta a capire dove vanno i tuoi soldi e quanto stai risparmiando.
               </p>
           </div>
           
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dettagli Calcoli</h4>
              <ul className="space-y-3">
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div><p className="text-sm text-slate-600">I movimenti classificati come <span className="font-bold text-slate-900">Work</span> (rimborsi spese, stipendi extra, spese aziendali) e <span className="font-bold text-slate-900">Transfer</span> (giroconti) sono <strong>esclusi</strong> dai grafici "Pulse" e "Ripartizione Spese" per non falsare il calcolo delle spese nette personali.</p></li>
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div><p className="text-sm text-slate-600">Nel <strong>Cashflow</strong>, la colonna "Lavoro" separa le entrate (giallo chiaro, sopra) dalle uscite (arancio scuro, sotto) classificate come 'Work'.</p></li>
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div><p className="text-sm text-slate-600">Il <strong>Savings Rate</strong> è calcolato come: <em className="text-slate-500">(Entrate - Uscite) / Entrate</em>.</p></li>
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div><p className="text-sm text-slate-600">Le spese sono convertite in CHF alla data del movimento.</p></li>
              </ul>
           </div>
        </div>
      </FullScreenModal>

    </div>
  );
};
