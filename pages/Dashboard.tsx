
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { AppSection } from '../types';

export const Dashboard: React.FC = () => {
  const { transactions, accounts, investments, investmentTrends } = useFinance();
  const { navigateTo } = useNavigation();
  
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth(); 
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [rates, setRates] = useState<Record<string, number>>({ CHF: 1, EUR: 1, USD: 1 });

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
    return unique.sort((a, b) => b - a);
  }, [transactions, currentYear]);

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

  // Funzione di navigazione con filtri
  const goToTransactions = (monthIdx: number, type: 'income' | 'variable' | 'fixed' | 'work') => {
    const params: any = {
        year: selectedYear.toString(),
        months: [monthIdx + 1],
        search: '',
        accounts: [],
        category: '',
        subcategory: '',
        tag: ''
    };

    if (type === 'income') {
        // Entrate: Income OR Personal positive
        params.types = ['income', 'personal'];
        params.amountSign = 'positive';
    } else if (type === 'variable') {
        // Uscite Variabili: Personal negative
        params.types = ['personal'];
        params.amountSign = 'negative';
    } else if (type === 'fixed') {
        // Uscite Fisse: Essential (ignoro segno, di solito negativo)
        params.types = ['essential'];
        params.amountSign = 'all';
    } else if (type === 'work') {
        // Lavoro: Work (ignoro segno)
        params.types = ['work'];
        params.amountSign = 'all';
    }

    navigateTo(AppSection.Movimenti, params);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anno Selezionato</span>
            <div className="mt-2 relative">
               <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-transparent text-3xl font-black text-white outline-none appearance-none cursor-pointer z-10 relative border-none p-0 focus:ring-0">
                 {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
               </select>
               <div className="absolute top-1/2 right-0 -translate-y-1/2 pointer-events-none text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg></div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50"><p className="text-[10px] text-slate-400 font-medium">Contesto temporale dashboard</p></div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-rose-200 hover:shadow-lg hover:shadow-rose-50 transition-all">
          <div>
             <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uscite Variabili ({monthName})</span><div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div></div>
             <div className="text-2xl font-black text-slate-900 mt-1">CHF {variableExpensesMonth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="mt-4"><p className="text-[10px] text-slate-400 font-medium leading-relaxed">Totale spese 'Personal' registrate nel mese corrente.</p></div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all">
          <div>
             <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patrimonio Spendibile</span><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div></div>
             <div className="text-2xl font-black text-slate-900 mt-1">CHF {spendableWealth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="mt-4"><p className="text-[10px] text-slate-400 font-medium leading-relaxed">Saldo aggregato convertito in CHF (tassi odierni).</p></div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all">
          <div>
             <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Investimenti Totali</span><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div></div>
             <div className="text-2xl font-black text-slate-900 mt-1">CHF {totalInvestments.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="mt-4"><div className="flex items-center space-x-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[10px] text-slate-400 font-bold uppercase">Portafogli Personali (CHF)</span></div></div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
         <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center space-x-3">
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               </div>
               <h3 className="text-lg font-bold text-slate-900">Matrice Annuale {selectedYear}</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">Valori in CHF</span>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[800px] table-fixed">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                     <th className="w-1/6 px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Mese</th>
                     <th className="w-1/6 px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Entrate (Personal +)</th>
                     <th className="w-1/6 px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Uscite Variabili (Personal -)</th>
                     <th className="w-1/6 px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Uscite Fisse (Essential)</th>
                     <th className="w-1/6 px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Lavoro (Netto)</th>
                     <th className="w-1/6 px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 bg-slate-100/30">Totale</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {matrixData.map((data, idx) => {
                     const rowTotal = data.income + data.variable + data.fixed + data.work;
                     return (
                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                           <td className="px-4 py-5 text-sm font-bold text-slate-700 capitalize text-left">
                              {monthNames[idx]}
                           </td>
                           <td 
                             onClick={() => goToTransactions(idx, 'income')}
                             className="px-4 py-5 text-center font-mono text-sm font-medium text-emerald-600 bg-emerald-50/30 cursor-pointer hover:bg-emerald-100 transition-colors hover:scale-105"
                             title="Vedi movimenti Entrate"
                           >
                              {data.income !== 0 ? data.income.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                           </td>
                           <td 
                             onClick={() => goToTransactions(idx, 'variable')}
                             className="px-4 py-5 text-center font-mono text-sm font-medium text-rose-600 cursor-pointer hover:bg-rose-100 transition-colors hover:scale-105"
                             title="Vedi movimenti Uscite Variabili"
                           >
                              {data.variable !== 0 ? data.variable.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                           </td>
                           <td 
                             onClick={() => goToTransactions(idx, 'fixed')}
                             className="px-4 py-5 text-center font-mono text-sm font-medium text-rose-600 bg-rose-50/30 cursor-pointer hover:bg-rose-100 transition-colors hover:scale-105"
                             title="Vedi movimenti Uscite Fisse"
                           >
                              {data.fixed !== 0 ? data.fixed.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                           </td>
                           <td 
                             onClick={() => goToTransactions(idx, 'work')}
                             className={`px-4 py-5 text-center font-mono text-sm font-bold cursor-pointer hover:scale-105 transition-transform ${data.work >= 0 ? 'text-indigo-600 hover:bg-indigo-50' : 'text-rose-600 hover:bg-rose-50'}`}
                             title="Vedi movimenti Lavoro"
                           >
                              {data.work !== 0 ? data.work.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                           </td>
                           <td className={`px-4 py-5 text-center font-mono text-sm font-black border-l border-slate-50 ${rowTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {rowTotal !== 0 ? rowTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '-'}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
               <tfoot className="bg-slate-100/50 border-t border-slate-200">
                  <tr>
                     <td className="px-4 py-5 text-xs font-black text-slate-900 uppercase tracking-widest text-left">Totale Anno</td>
                     <td className="px-4 py-5 text-center font-bold text-base text-emerald-700">{matrixTotals.income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                     <td className="px-4 py-5 text-center font-bold text-base text-rose-700">{matrixTotals.variable.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                     <td className="px-4 py-5 text-center font-bold text-base text-rose-700">{matrixTotals.fixed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                     <td className={`px-4 py-5 text-center font-bold text-base ${matrixTotals.work >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>{matrixTotals.work.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                     <td className={`px-4 py-5 text-center font-black text-base border-l border-slate-200/50 ${grandTotalNet >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{grandTotalNet.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>
    </div>
  );
};
