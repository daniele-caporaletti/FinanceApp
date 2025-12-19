
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
  const { transactions, accounts, investments, investmentTrends, essentialTransactions, categories } = useFinance();
  const { navigateTo } = useNavigation();
  
  const currentRealDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentRealDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentRealDate.getMonth()); // 0-11

  const [rates, setRates] = useState<Record<string, number>>({ CHF: 1, EUR: 1, USD: 1 });
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isInvestmentsHidden, setIsInvestmentsHidden] = useState(true); // Blur attivo di default
  
  // Tab state for the bottom-left panel
  const [listTab, setListTab] = useState<'recent' | 'essential'>('recent');

  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [resEur, resUsd] = await Promise.all([
          fetch('https://api.frankfurter.app/latest?from=EUR&to=CHF'),
          fetch('https://api.frankfurter.app/latest?from=USD&to=CHF')
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

  // --- CALCOLI WIDGET ---

  // 1. Patrimonio (SEMPRE ATTUALE - NON DIPENDE DAI FILTRI TEMPORALI)
  const wealthData = useMemo(() => {
    // A. Liquidità (Current)
    const includedAccounts = accounts.filter(a => !a.exclude_from_overview);
    let liquidityCHF = 0;
    includedAccounts.forEach(acc => {
      const nativeBalance = transactions.filter(t => t.account_id === acc.id).reduce((sum, t) => {
           const amount = t.amount_original || 0;
           if (t.kind === 'expense') return sum - Math.abs(amount);
           if (t.kind === 'income') return sum + Math.abs(amount);
           return sum + amount;
        }, 0);
      liquidityCHF += nativeBalance * (rates[acc.currency_code] || 1);
    });

    // B. Investimenti (Current - Latest Trend available)
    let investmentsCHF = 0;
    investments.filter(i => !i.is_for_retirement).forEach(inv => { 
      const trends = investmentTrends.filter(t => t.investment_id === inv.id);
      if (trends.length > 0) {
        // Prendi il più recente in assoluto
        const latest = trends.sort((a,b) => new Date(b.value_on).getTime() - new Date(a.value_on).getTime())[0];
        investmentsCHF += (latest.value_original || 0) * (rates[inv.currency] || 1);
      }
    });

    return { liquidity: liquidityCHF, investments: investmentsCHF, total: liquidityCHF + investmentsCHF };
  }, [accounts, transactions, investments, investmentTrends, rates]); // Rimosso selectedYear/Month dalle dipendenze

  // 2. Pulse (Basato su selectedMonth e selectedYear)
  const currentMonthStats = useMemo(() => {
      let income = 0;
      let variableExpense = 0; // Absolute value
      let fixedExpense = 0;    // Absolute value
      
      transactions.forEach(t => {
          const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
          // Filtra esattamente per anno e mese selezionati
          if (tYear === selectedYear && (tMonth - 1) === selectedMonth) {
              
              const amt = t.amount_base || 0;
              
              if (t.kind === 'transfer' || t.kind === 'work') return;

              if (amt > 0) {
                  income += amt;
              } else if (amt < 0) {
                  const absAmt = Math.abs(amt);
                  if (t.kind === 'essential') fixedExpense += absAmt;
                  else variableExpense += absAmt; // Personal expenses
              }
          }
      });
      
      const netBalance = income - variableExpense - fixedExpense;
      const totalExpense = fixedExpense + variableExpense;
      
      const totalVolume = income + fixedExpense + variableExpense;
      const denominator = totalVolume > 0 ? totalVolume : 1;

      const variablePct = (variableExpense / denominator) * 100;
      const fixedPct = (fixedExpense / denominator) * 100;
      const incomePct = (income / denominator) * 100;

      return { income, fixedExpense, variableExpense, totalExpense, variablePct, fixedPct, incomePct, netBalance };
  }, [transactions, selectedYear, selectedMonth]);

  // 3. Status Spese Essenziali (Basato su selectedMonth e selectedYear)
  const essentialsStatus = useMemo(() => {
      const activeEssentials = essentialTransactions.filter(e => {
          const [eYear, eMonth] = e.occurred_on.split('-').map(Number);
          return e.is_active && eYear === selectedYear && (eMonth - 1) === selectedMonth;
      });

      const total = activeEssentials.length;
      let paid = 0;
      let remainingAmount = 0;

      activeEssentials.forEach(ess => {
          const isPaid = transactions.some(t => {
              return t.essential_transaction_id === ess.id;
          });

          if (isPaid) {
              paid++;
          } else {
              remainingAmount += Math.abs(ess.amount_original);
          }
      });

      return { total, paid, remainingAmount };
  }, [essentialTransactions, transactions, selectedYear, selectedMonth]);

  // 4. Ultimi Movimenti (Filtrati per MESE selezionato)
  const recentTransactions = useMemo(() => {
      return transactions
        .filter(t => {
            const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
            return (
                tYear === selectedYear && 
                (tMonth - 1) === selectedMonth &&
                t.kind !== 'essential' && 
                t.kind !== 'transfer'
            );
        })
        .sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime())
        .slice(0, 9); // Max 9 items
  }, [transactions, selectedYear, selectedMonth]);

  // 4b. Essential Expenses List (Filtered by selectedMonth)
  const currentMonthEssentials = useMemo(() => {
      const active = essentialTransactions.filter(e => {
          const [eYear, eMonth] = e.occurred_on.split('-').map(Number);
          return e.is_active && eYear === selectedYear && (eMonth - 1) === selectedMonth;
      });
      
      return active.map(rec => {
          const isPaid = transactions.some(t => t.essential_transaction_id === rec.id);
          const parts = rec.occurred_on.split('-');
          const day = parseInt(parts[2]);

          return { ...rec, isPaid, day };
      }).sort((a, b) => {
          if (a.isPaid === b.isPaid) return a.day - b.day;
          return a.isPaid ? 1 : -1;
      });
  }, [essentialTransactions, transactions, selectedYear, selectedMonth]);

  // 5. Matrice Dati (Sempre Annuale, ma evidenzia mese corrente)
  const matrixData = useMemo(() => {
    const data = Array.from({ length: 12 }, () => ({ income: 0, variable: 0, fixed: 0, workIncome: 0, workExpense: 0 }));
    transactions.forEach(t => {
      const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
      if (tYear !== selectedYear) return;
      
      const monthIdx = tMonth - 1;
      const amount = t.amount_base || 0;
      
      if (t.kind === 'income' || (t.kind === 'personal' && amount > 0)) data[monthIdx].income += amount;
      else if (t.kind === 'personal' && amount < 0) data[monthIdx].variable += amount;
      else if (t.kind === 'essential') data[monthIdx].fixed += amount;
      else if (t.kind === 'work') {
          if (amount >= 0) data[monthIdx].workIncome += amount;
          else data[monthIdx].workExpense += amount;
      }
    });
    return data;
  }, [transactions, selectedYear]);

  const matrixTotals = useMemo(() => matrixData.reduce((acc, curr) => ({
      income: acc.income + curr.income,
      variable: acc.variable + curr.variable,
      fixed: acc.fixed + curr.fixed,
      workIncome: acc.workIncome + curr.workIncome,
      workExpense: acc.workExpense + curr.workExpense
    }), { income: 0, variable: 0, fixed: 0, workIncome: 0, workExpense: 0 }), [matrixData]);

  const grandTotalNet = matrixTotals.income + matrixTotals.variable + matrixTotals.fixed + matrixTotals.workIncome + matrixTotals.workExpense;

  // --- NAVIGATION HELPERS ---
  const goToTransactions = (monthIdx: number, type: 'income' | 'variable' | 'fixed' | 'work_income' | 'work_expense') => {
    const monthsFilter = monthIdx === -1 ? [] : [monthIdx + 1];
    const params: any = { year: selectedYear.toString(), months: monthsFilter, search: '', accounts: [], category: '', subcategory: '', tag: '' };

    if (type === 'income') { params.types = ['income', 'personal']; params.amountSign = 'positive'; } 
    else if (type === 'variable') { params.types = ['personal']; params.amountSign = 'negative'; } 
    else if (type === 'fixed') { params.types = ['essential']; params.amountSign = 'all'; } 
    else if (type === 'work_income') { params.types = ['work']; params.amountSign = 'positive'; }
    else if (type === 'work_expense') { params.types = ['work']; params.amountSign = 'negative'; }

    navigateTo(AppSection.Movimenti, params);
  };

  const getKindBadge = (kind: string) => {
      if (kind === 'personal') return <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Personal</span>;
      if (kind === 'work') return <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Work</span>;
      return null;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 w-full max-w-full overflow-x-hidden pb-32">
      
      {/* 1. HEADER & PATRIMONIO (Fixed/Current) */}
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

          {/* NET WORTH SECTION (Liquidità + Investimenti) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* CARD 1: LIQUIDITA' */}
              <div 
                onClick={() => navigateTo(AppSection.Conti)}
                className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden h-[110px] flex flex-col justify-center"
              >
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg></div>
                 <div className="relative z-10">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Liquidità (Conti)
                    </span>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">CHF {wealthData.liquidity.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                 </div>
              </div>

              {/* CARD 2: INVESTIMENTI (Con Pulsante Blur) */}
              <div 
                onClick={() => navigateTo(AppSection.Investimenti)}
                className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden h-[110px] flex flex-col justify-center"
              >
                 {/* Background Icon */}
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>
                 
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Investimenti (Personali)
                        </span>
                        {/* Blur Toggle Button Inline */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsInvestmentsHidden(!isInvestmentsHidden); }}
                            className="p-1 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors"
                            title={isInvestmentsHidden ? "Mostra" : "Nascondi"}
                        >
                            {isInvestmentsHidden ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                    <div className={`text-2xl font-black text-slate-900 tracking-tight transition-all duration-300 ${isInvestmentsHidden ? 'blur-md select-none opacity-50' : ''}`}>
                        CHF {wealthData.investments.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                 </div>
              </div>
          </div>
      </div>

      {/* SEPARATOR & FILTERS (Sticky, Redesigned) */}
      <div className="flex items-center justify-between py-2 border-t border-b border-slate-200/50 sticky top-0 bg-[#f9fafb]/95 backdrop-blur-md z-30 -mx-4 px-4 md:mx-0 md:px-0 mt-2">
          {/* Title Anchor */}
          <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Analisi Periodo</h3>
          </div>
          
          {/* Selettori Anno e Mese (Compact) */}
          <div className="flex gap-2">
              <div className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center space-x-2 min-w-[130px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mese</span>
                  <CustomSelect value={selectedMonth} onChange={(val) => setSelectedMonth(Number(val))} options={monthOptions} minimal={true} anchor="right" />
              </div>
              <div className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center space-x-2 min-w-[100px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anno</span>
                  <CustomSelect value={selectedYear} onChange={(val) => setSelectedYear(Number(val))} options={yearOptions} minimal={true} anchor="right" />
              </div>
          </div>
      </div>

      {/* 2. ANALISI MENSILE (Pulse, Essentials) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          
          {/* Widget: Situazione Mensile (Compact) */}
          <div onClick={() => navigateTo(AppSection.Analisi)} className="md:col-span-2 bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pulse di {monthNames[selectedMonth]} {selectedYear}</h3>
                  <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Saldo Personale</span>
                      <span className={`text-base font-black ${currentMonthStats.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {currentMonthStats.netBalance.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                      </span>
                  </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex relative mb-3">
                  <div className="h-full bg-indigo-500 transition-all duration-500 relative group flex-shrink-0" style={{ width: `${currentMonthStats.variablePct}%` }}></div>
                  <div className="h-full bg-rose-500 transition-all duration-500 relative group flex-shrink-0 border-l border-white/20" style={{ width: `${currentMonthStats.fixedPct}%` }}></div>
                  <div className="h-full bg-emerald-500 transition-all duration-500 relative group flex-shrink-0 border-l border-white/20" style={{ width: `${currentMonthStats.incomePct}%` }}></div>
              </div>

              {/* Legenda Dettagli: Compact */}
              <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start gap-0.5">
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Variabili</span></div>
                      <span className="text-xs font-black text-slate-700 pl-3">{currentMonthStats.variableExpense.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Essenziali</span></div>
                      <span className="text-xs font-black text-slate-700">{currentMonthStats.fixedExpense.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Entrate</span></div>
                      <span className="text-xs font-black text-slate-700 pr-3">{currentMonthStats.income.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                  </div>
              </div>
          </div>

          {/* Widget: Spese Essenziali (Compact) */}
          <div onClick={() => navigateTo(AppSection.SpeseEssenziali)} className="bg-slate-900 p-4 rounded-[1.5rem] shadow-lg shadow-slate-200 cursor-pointer hover:bg-slate-800 transition-colors text-white relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-3 opacity-10"><svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="m9 14 2 2 4-4" /></svg></div>
              <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 relative z-10">Spese Essenziali</h3>
                  <div className="flex items-baseline gap-1 relative z-10">
                      <span className="text-2xl font-black">{essentialsStatus.paid}</span>
                      <span className="text-sm font-medium text-slate-500">/ {essentialsStatus.total}</span>
                  </div>
              </div>
              
              {essentialsStatus.remainingAmount > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700 relative z-10">
                      <p className="text-[8px] text-slate-400 uppercase font-bold">Rimanente stimato</p>
                      <p className="text-xs font-bold text-white">~ {essentialsStatus.remainingAmount.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</p>
                  </div>
              )}
          </div>
      </div>

      {/* 3. DETTAGLIO (RECENTI & MATRICE) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Lista Recenti / Essenziali Preview */}
          <div className="xl:col-span-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
                  <div className="flex space-x-4">
                      <button 
                        onClick={() => setListTab('recent')}
                        className={`text-sm font-bold uppercase tracking-wide transition-colors ${listTab === 'recent' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Recenti
                      </button>
                      <div className="w-px bg-slate-200 h-4 self-center"></div>
                      <button 
                        onClick={() => setListTab('essential')}
                        className={`text-sm font-bold uppercase tracking-wide transition-colors ${listTab === 'essential' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Fisse ({monthNames[selectedMonth]})
                      </button>
                  </div>
                  <button onClick={() => navigateTo(listTab === 'recent' ? AppSection.Movimenti : AppSection.SpeseEssenziali)} className="text-xs font-bold text-blue-600 hover:underline">Vedi Tutti</button>
              </div>
              
              <div className="p-2">
                  
                  {/* TAB: Recenti Variabili */}
                  {listTab === 'recent' && (
                      <>
                        {recentTransactions.map(tx => {
                            const { category, subcategory } = getCategoryInfo(tx.category_id);
                            return (
                                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors gap-3">
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="text-xs font-black text-slate-700 truncate">{category}</span>
                                            {getKindBadge(tx.kind)}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 truncate">{subcategory !== '-' ? subcategory : 'Generale'}</span>
                                            {tx.tag && <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">#{tx.tag}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                        <span className={`text-xs font-black ${(tx.amount_base || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[9px] text-slate-300 font-bold">{new Date(tx.occurred_on).toLocaleDateString('it-IT', {day: 'numeric', month: 'short'})}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {recentTransactions.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">Nessun movimento trovato per {monthNames[selectedMonth]} {selectedYear} (esclusi fissi).</div>
                        )}
                      </>
                  )}

                  {/* TAB: Spese Fisse (Essenziali) del Mese */}
                  {listTab === 'essential' && (
                      <>
                        {currentMonthEssentials.map(rec => (
                            <div 
                                key={rec.id} 
                                onClick={() => navigateTo(AppSection.SpeseEssenziali)}
                                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors gap-3 cursor-pointer group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${rec.isPaid ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-300 group-hover:border-blue-200'}`}>
                                        {rec.isPaid ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <span className="text-[9px] font-bold">{rec.day}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-xs font-black truncate ${rec.isPaid ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                            {rec.name}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {rec.isPaid ? 'Pagato' : `Scade il ${rec.day}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <span className={`text-xs font-black block ${rec.isPaid ? 'text-slate-300' : 'text-slate-900'}`}>
                                        {Math.abs(rec.amount_original).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{rec.currency_original}</span>
                                </div>
                            </div>
                        ))}
                        {currentMonthEssentials.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">Nessuna spesa essenziale trovata per questo periodo ({monthNames[selectedMonth]} {selectedYear}).</div>
                        )}
                      </>
                  )}

              </div>
          </div>

          {/* Matrice Cashflow (Riorganizzata: Entrate | Uscite (Var+Fix) | Lavoro | Netto) */}
          <div className="xl:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <div className="px-6 py-5 bg-[#fcfdfe] border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Cashflow {selectedYear}</h3>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">CHF</span>
             </div>
             
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-[600px] table-fixed text-left">
                   <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                         <th className="w-[80px] px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mese</th>
                         <th className="px-2 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Entrate</th>
                         <th className="px-2 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Uscite <span className="text-[8px] font-medium text-slate-400 normal-case block">(Var / Fisse)</span></th>
                         <th className="px-2 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Lavoro <span className="text-[8px] font-medium text-slate-400 normal-case block">(Entrate / Uscite)</span></th>
                         <th className="px-2 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Netto</th>
                      </tr>
                   </thead>
                   <tbody>
                      {matrixData.map((data, idx) => {
                         const rowTotal = data.income + data.variable + data.fixed + data.workIncome + data.workExpense;
                         const isSelected = idx === selectedMonth;
                         
                         // Mostra solo righe con dati o mese selezionato per risparmiare spazio
                         if (rowTotal === 0 && data.income === 0 && !isSelected) return null;

                         return (
                            <tr key={idx} className={`border-b border-slate-50 last:border-0 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                               <td className="px-4 py-2 align-middle">
                                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>{monthNames[idx].substring(0,3)}</span>
                               </td>
                               
                               {/* Entrate */}
                               <td onClick={() => goToTransactions(idx, 'income')} className="px-2 py-2 text-center align-middle cursor-pointer hover:bg-emerald-50/50 transition-colors">
                                  <span className={`text-xs font-mono font-medium ${data.income !== 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    {data.income !== 0 ? data.income.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}
                                  </span>
                               </td>

                               {/* Uscite (Variabili + Fisse) */}
                               <td className="px-2 py-2 text-center align-middle cursor-pointer hover:bg-slate-50 transition-colors">
                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                      {/* Variabili (Indaco) */}
                                      <span 
                                        onClick={() => goToTransactions(idx, 'variable')}
                                        className={`text-[10px] font-mono font-bold leading-none hover:underline ${data.variable !== 0 ? 'text-indigo-500' : 'text-slate-300'}`}
                                      >
                                        {data.variable !== 0 ? data.variable.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}
                                      </span>
                                      {/* Fisse (Rosa) */}
                                      <span 
                                        onClick={() => goToTransactions(idx, 'fixed')}
                                        className={`text-[10px] font-mono font-bold leading-none hover:underline ${data.fixed !== 0 ? 'text-rose-500' : 'text-slate-300'}`}
                                      >
                                        {data.fixed !== 0 ? data.fixed.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}
                                      </span>
                                  </div>
                               </td>

                               {/* Lavoro (Entrate + Uscite) */}
                               <td className="px-2 py-2 text-center align-middle cursor-pointer hover:bg-amber-50/50 transition-colors">
                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                      {/* Work Income (Positive - Lighter Yellow) */}
                                      <span 
                                        onClick={() => goToTransactions(idx, 'work_income')}
                                        className={`text-[10px] font-mono font-bold leading-none hover:underline ${data.workIncome !== 0 ? 'text-amber-500' : 'text-slate-300'}`}
                                      >
                                        {data.workIncome !== 0 ? data.workIncome.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}
                                      </span>
                                      {/* Work Expense (Negative - Reddish Yellow) */}
                                      <span 
                                        onClick={() => goToTransactions(idx, 'work_expense')}
                                        className={`text-[10px] font-mono font-bold leading-none hover:underline ${data.workExpense !== 0 ? 'text-orange-600' : 'text-slate-300'}`}
                                      >
                                        {data.workExpense !== 0 ? data.workExpense.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}
                                      </span>
                                  </div>
                               </td>

                               {/* Netto */}
                               <td className="px-2 py-2 text-center align-middle">
                                   <span className={`text-xs font-mono font-bold ${rowTotal > 0 ? 'text-emerald-600' : rowTotal < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                      {rowTotal !== 0 ? rowTotal.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}
                                   </span>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                   <tfoot className="bg-slate-50/50 border-t border-slate-100">
                      <tr>
                         <td className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase align-middle">TOT</td>
                         <td onClick={() => goToTransactions(-1, 'income')} className="px-2 py-2 text-center font-mono text-xs font-bold text-emerald-600 cursor-pointer hover:bg-slate-100">{matrixTotals.income.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</td>
                         <td className="px-2 py-2 text-center align-middle">
                             <div className="flex flex-col gap-0.5 items-center justify-center">
                                <span onClick={() => goToTransactions(-1, 'variable')} className="text-[10px] font-mono font-bold text-indigo-500 leading-none cursor-pointer hover:underline">{matrixTotals.variable.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                                <span onClick={() => goToTransactions(-1, 'fixed')} className="text-[10px] font-mono font-bold text-rose-500 leading-none cursor-pointer hover:underline">{matrixTotals.fixed.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                             </div>
                         </td>
                         <td className="px-2 py-2 text-center align-middle">
                             <div className="flex flex-col gap-0.5 items-center justify-center">
                                <span onClick={() => goToTransactions(-1, 'work_income')} className="text-[10px] font-mono font-bold text-amber-500 leading-none cursor-pointer hover:underline">{matrixTotals.workIncome.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                                <span onClick={() => goToTransactions(-1, 'work_expense')} className="text-[10px] font-mono font-bold text-orange-600 leading-none cursor-pointer hover:underline">{matrixTotals.workExpense.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                             </div>
                         </td>
                         <td className={`px-2 py-2 text-center font-mono text-xs font-black align-middle ${grandTotalNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{grandTotalNet.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</td>
                      </tr>
                   </tfoot>
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
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600">I movimenti classificati come <span className="font-bold text-slate-900">Work</span> (rimborsi spese, stipendi extra, spese aziendali) e <span className="font-bold text-slate-900">Transfer</span> (giroconti) sono <strong>esclusi</strong> dai grafici "Pulse" e "Ripartizione Spese" per non falsare il calcolo delle spese nette personali.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600">Nel <strong>Cashflow</strong>, la colonna "Lavoro" separa le entrate (giallo chiaro, sopra) dalle uscite (arancio scuro, sotto) classificate come 'Work'.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600">Il <strong>Savings Rate</strong> è calcolato come: <em className="text-slate-500">(Entrate - Uscite) / Entrate</em>.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600">Le spese sono convertite in CHF alla data del movimento.</p>
                 </li>
              </ul>
           </div>
        </div>
      </FullScreenModal>

    </div>
  );
};
