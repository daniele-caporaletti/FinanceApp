
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { AppSection } from '../types';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';

export const Dashboard: React.FC = () => {
  const { transactions, accounts, investments, investmentTrends } = useFinance();
  const { navigateTo } = useNavigation();
  
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth(); 
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [rates, setRates] = useState<Record<string, number>>({ CHF: 1, EUR: 1, USD: 1 });
  const [isInfoOpen, setIsInfoOpen] = useState(false);

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
    const years = transactions.map(t => new Date(t.occurred_on).getFullYear());
    const unique = Array.from(new Set(years));
    if (!unique.includes(currentYear)) unique.push(currentYear);
    return unique.sort((a: number, b: number) => b - a);
  }, [transactions, currentYear]);

  // Convert availableYears to options for CustomSelect
  const yearOptions = useMemo(() => availableYears.map(y => ({ value: y, label: y.toString() })), [availableYears]);

  const variableExpensesMonth = useMemo(() => transactions.filter(t => {
        const d = new Date(t.occurred_on);
        return t.kind === 'personal' && t.amount_base < 0 && d.getFullYear() === selectedYear && d.getMonth() === currentMonthIndex;
      }).reduce((sum, t) => sum + Math.abs(t.amount_base || 0), 0), [transactions, selectedYear, currentMonthIndex]);

  const spendableWealth = useMemo(() => {
    const includedAccounts = accounts.filter(a => !a.exclude_from_overview);
    let totalCHF = 0;
    includedAccounts.forEach(acc => {
      const nativeBalance = transactions.filter(t => t.account_id === acc.id).reduce((sum, t) => {
           const amount = t.amount_original || 0;
           if (t.kind === 'expense') return sum - Math.abs(amount);
           if (t.kind === 'income') return sum + Math.abs(amount);
           return sum + amount;
        }, 0);
      totalCHF += nativeBalance * (rates[acc.currency_code] || 1);
    });
    return totalCHF;
  }, [accounts, transactions, rates]);

  const totalInvestments = useMemo(() => {
    let totalCHF = 0;
    investments.filter(i => !i.is_for_retirement).forEach(inv => {
      const trends = investmentTrends.filter(t => t.investment_id === inv.id);
      if (trends.length > 0) {
        const latest = trends.sort((a,b) => new Date(b.value_on).getTime() - new Date(a.value_on).getTime())[0];
        totalCHF += (latest.value_original || 0) * (rates[inv.currency] || 1);
      }
    });
    return totalCHF;
  }, [investments, investmentTrends, rates]);

  const matrixData = useMemo(() => {
    const data = Array.from({ length: 12 }, () => ({ income: 0, variable: 0, fixed: 0, work: 0 }));
    transactions.forEach(t => {
      const d = new Date(t.occurred_on);
      if (d.getFullYear() !== selectedYear) return;
      const monthIdx = d.getMonth();
      const amount = t.amount_base || 0;
      if (t.kind === 'income' || (t.kind === 'personal' && amount > 0)) data[monthIdx].income += amount;
      else if (t.kind === 'personal' && amount < 0) data[monthIdx].variable += amount;
      else if (t.kind === 'essential') data[monthIdx].fixed += amount;
      else if (t.kind === 'work') data[monthIdx].work += amount;
    });
    return data;
  }, [transactions, selectedYear]);

  const matrixTotals = useMemo(() => matrixData.reduce((acc, curr) => ({
      income: acc.income + curr.income,
      variable: acc.variable + curr.variable,
      fixed: acc.fixed + curr.fixed,
      work: acc.work + curr.work
    }), { income: 0, variable: 0, fixed: 0, work: 0 }), [matrixData]);

  const grandTotalNet = matrixTotals.income + matrixTotals.variable + matrixTotals.fixed + matrixTotals.work;
  const monthName = new Date(selectedYear, currentMonthIndex).toLocaleString('it-IT', { month: 'long' });

  const goToTransactions = (monthIdx: number, type: 'income' | 'variable' | 'fixed' | 'work') => {
    const monthsFilter = monthIdx === -1 ? [] : [monthIdx + 1];

    const params: any = {
        year: selectedYear.toString(),
        months: monthsFilter,
        search: '',
        accounts: [],
        category: '',
        subcategory: '',
        tag: ''
    };

    if (type === 'income') {
        params.types = ['income', 'personal'];
        params.amountSign = 'positive';
    } else if (type === 'variable') {
        params.types = ['personal'];
        params.amountSign = 'negative';
    } else if (type === 'fixed') {
        params.types = ['essential'];
        params.amountSign = 'all';
    } else if (type === 'work') {
        params.types = ['work'];
        params.amountSign = 'all';
    }

    navigateTo(AppSection.Movimenti, params);
  };

  const handleVariableExpensesClick = () => {
    navigateTo(AppSection.Movimenti, {
        year: selectedYear.toString(),
        months: [currentMonthIndex + 1],
        types: ['personal'],
        amountSign: 'negative'
    });
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 w-full max-w-full overflow-x-hidden pb-32">
      
      {/* Header Minimal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-3">
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Financial Overview</h2>
               <button 
                  onClick={() => setIsInfoOpen(true)}
                  className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
               >
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </button>
           </div>
           <p className="text-slate-400 font-medium mt-1 text-sm md:text-base">Benvenuto nella tua dashboard finanziaria.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 flex items-center space-x-2 self-start md:self-auto min-w-[120px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anno</span>
            <CustomSelect 
                value={selectedYear}
                onChange={(val) => setSelectedYear(Number(val))}
                options={yearOptions}
                minimal={true}
            />
        </div>
      </div>

      {/* Cards: Impilate verticalmente su mobile (grid-cols-1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Uscite Variabili */}
        <div 
            onClick={handleVariableExpensesClick}
            className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
        >
             <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-hover:text-blue-500 transition-colors">Uscite Variabili ({monthName})</div>
             <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                <span className="text-base md:text-lg text-slate-300 mr-1 font-bold">CHF</span>
                {variableExpensesMonth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
             </div>
        </div>

        {/* KPI 2: Patrimonio Spendibile */}
        <div 
            onClick={() => navigateTo(AppSection.Conti)}
            className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
        >
             <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-500 transition-colors">Patrimonio Spendibile</div>
             <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                <span className="text-base md:text-lg text-slate-300 mr-1 font-bold">CHF</span>
                {spendableWealth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
             </div>
        </div>

        {/* KPI 3: Investimenti Totali */}
        <div 
            onClick={() => navigateTo(AppSection.Investimenti)}
            className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
        >
             <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">Investimenti Totali</div>
             <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                <span className="text-base md:text-lg text-slate-300 mr-1 font-bold">CHF</span>
                {totalInvestments.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
             </div>
        </div>
      </div>

      {/* VISTA DESKTOP: Matrice Completa (Nascosta su Mobile) */}
      <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
         <div className="px-8 py-8 flex justify-between items-center bg-[#fcfdfe] border-b border-slate-50">
            <h3 className="text-lg font-bold text-slate-900">Matrice Cashflow {selectedYear}</h3>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Valori in CHF</span>
         </div>
         
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[800px] table-fixed text-left">
               <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                     <th className="w-[120px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mese</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Entrate</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Variabili</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Fisse</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Lavoro</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Totale</th>
                  </tr>
               </thead>
               <tbody>
                  {matrixData.map((data, idx) => {
                     const rowTotal = data.income + data.variable + data.fixed + data.work;
                     const isCurrent = new Date().getFullYear() === selectedYear && new Date().getMonth() === idx;

                     return (
                        <tr key={idx} className={`border-b border-slate-50 last:border-0 transition-colors ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                           <td className="px-6 py-4">
                              <span className={`text-sm font-bold ${isCurrent ? 'text-blue-600' : 'text-slate-700'}`}>{monthNames[idx]}</span>
                           </td>
                           <td onClick={() => goToTransactions(idx, 'income')} className="px-4 py-4 text-center cursor-pointer hover:bg-emerald-50/30 transition-colors">
                              <span className={`text-sm font-mono tracking-tight font-medium ${data.income !== 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                {data.income !== 0 ? data.income.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                              </span>
                           </td>
                           <td onClick={() => goToTransactions(idx, 'variable')} className="px-4 py-4 text-center cursor-pointer hover:bg-rose-50/30 transition-colors">
                              <span className={`text-sm font-mono tracking-tight font-medium ${data.variable !== 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                {data.variable !== 0 ? data.variable.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                              </span>
                           </td>
                           <td onClick={() => goToTransactions(idx, 'fixed')} className="px-4 py-4 text-center cursor-pointer hover:bg-rose-50/30 transition-colors">
                              <span className={`text-sm font-mono tracking-tight font-medium ${data.fixed !== 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                {data.fixed !== 0 ? data.fixed.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                              </span>
                           </td>
                           <td onClick={() => goToTransactions(idx, 'work')} className="px-4 py-4 text-center cursor-pointer hover:bg-indigo-50/30 transition-colors">
                              <span className={`text-sm font-mono tracking-tight font-medium ${data.work !== 0 ? (data.work > 0 ? 'text-indigo-600' : 'text-rose-500') : 'text-slate-300'}`}>
                                {data.work !== 0 ? data.work.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                              </span>
                           </td>
                           <td className="px-4 py-4 text-center cursor-default">
                               <span className={`text-sm font-mono tracking-tight font-bold ${rowTotal > 0 ? 'text-emerald-600' : rowTotal < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                  {rowTotal !== 0 ? rowTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                               </span>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
               <tfoot className="bg-slate-50/50 border-t border-slate-100">
                  <tr>
                     <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Totale</td>
                     <td className="px-4 py-5 text-center font-mono font-bold text-emerald-600 cursor-pointer hover:bg-emerald-100/30" onClick={() => goToTransactions(-1, 'income')}>
                        {matrixTotals.income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                     </td>
                     <td className="px-4 py-5 text-center font-mono font-bold text-rose-600 cursor-pointer hover:bg-rose-100/30" onClick={() => goToTransactions(-1, 'variable')}>
                        {matrixTotals.variable.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                     </td>
                     <td className="px-4 py-5 text-center font-mono font-bold text-rose-600 cursor-pointer hover:bg-rose-100/30" onClick={() => goToTransactions(-1, 'fixed')}>
                        {matrixTotals.fixed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                     </td>
                     <td className="px-4 py-5 text-center font-mono font-bold text-indigo-600 cursor-pointer hover:bg-indigo-100/30" onClick={() => goToTransactions(-1, 'work')}>
                        {matrixTotals.work.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                     </td>
                     <td className={`px-4 py-5 text-center font-mono font-black ${grandTotalNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{grandTotalNet.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>

      {/* VISTA MOBILE: Lista Compatta Mensile */}
      <div className="md:hidden space-y-3">
        {matrixData.map((data, idx) => {
            const rowTotal = data.income + data.variable + data.fixed + data.work;
            const isCurrent = new Date().getFullYear() === selectedYear && new Date().getMonth() === idx;
            // Mostriamo solo i mesi che hanno dati o il mese corrente
            if (rowTotal === 0 && data.income === 0 && data.variable === 0 && data.fixed === 0 && !isCurrent) return null;

            return (
                <div key={idx} className={`bg-white rounded-[1.2rem] p-4 border shadow-sm ${isCurrent ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100'}`}>
                    {/* Intestazione Riga: Mese e Totale Netto */}
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-50">
                        <span className={`text-base font-bold capitalize ${isCurrent ? 'text-blue-600' : 'text-slate-900'}`}>{monthNames[idx]}</span>
                        <div className={`text-sm font-black ${rowTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {rowTotal > 0 ? '+' : ''}{rowTotal.toLocaleString('it-IT', { minimumFractionDigits: 0 })} <span className="text-[10px] text-slate-300">CHF</span>
                        </div>
                    </div>
                    
                    {/* Griglia Dettagli 2x2 */}
                    <div className="grid grid-cols-2 gap-2">
                        <div onClick={() => goToTransactions(idx, 'income')} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl cursor-pointer active:bg-slate-100">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Entrate</span>
                             <span className={`text-xs font-bold ${data.income !== 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{data.income !== 0 ? `+${data.income.toLocaleString('it-IT', { minimumFractionDigits: 0 })}` : '-'}</span>
                        </div>
                        <div onClick={() => goToTransactions(idx, 'variable')} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl cursor-pointer active:bg-slate-100">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Variabili</span>
                             <span className={`text-xs font-bold ${data.variable !== 0 ? 'text-rose-500' : 'text-slate-300'}`}>{data.variable !== 0 ? data.variable.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span>
                        </div>
                        <div onClick={() => goToTransactions(idx, 'fixed')} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl cursor-pointer active:bg-slate-100">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Fisse</span>
                             <span className={`text-xs font-bold ${data.fixed !== 0 ? 'text-rose-500' : 'text-slate-300'}`}>{data.fixed !== 0 ? data.fixed.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span>
                        </div>
                         <div onClick={() => goToTransactions(idx, 'work')} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl cursor-pointer active:bg-slate-100">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Lavoro</span>
                             <span className={`text-xs font-bold ${data.work !== 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{data.work !== 0 ? data.work.toLocaleString('it-IT', { minimumFractionDigits: 0 }) : '-'}</span>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Informazioni App"
        subtitle="Version 1.2.0"
      >
        <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-2">FinanceWeb OS</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Un sistema completo per la gestione delle finanze personali, progettato per tracciare entrate, uscite, investimenti e patrimonio netto in modo semplice e intuitivo.
                </p>
            </div>

            <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Funzionalità Principali</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 3.666V19a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h4.5A2.5 2.5 0 0112 4.5V7" /></svg>
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-slate-800">Tracciamento Spese</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Categorizzazione automatica e manuale di ogni transazione.</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-slate-800">Investimenti</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Monitoraggio ROI e performance dei fondi personali e pensionistici.</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-slate-800">Multi-Valuta</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Supporto nativo per CHF, EUR e USD con conversione automatica.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Note Legali & Privacy</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">
                    Questa applicazione è ad uso strettamente personale. I dati sono salvati su database Supabase privato e protetto da RLS (Row Level Security). Nessun dato viene condiviso con terze parti.
                 </p>
            </div>

             <div className="pt-8 border-t border-slate-50 text-center">
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Designed for You</p>
            </div>
        </div>
      </FullScreenModal>

    </div>
  );
};
