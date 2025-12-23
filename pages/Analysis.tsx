
import React, { useMemo, useState } from 'react';
import { useFinance } from '../FinanceContext';
import { CustomSelect } from '../components/CustomSelect';
import { FullScreenModal } from '../components/FullScreenModal';
import { Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';

// --- CONFIGURAZIONE COLORI ---
const C = {
  income: '#10b981',      // Emerald 500
  fixed: '#be123c',       // Rose 700 (Spese Fisse - Essential)
  variable: '#f43f5e',    // Rose 500 (Spese Variabili - Personal)
  invest: '#059669',      // Emerald 600
  pension: '#d97706',     // Amber 600
  pocket: '#3b82f6',      // Blue 500
  surplus: '#94a3b8',     // Slate 400 (Liquidità rimanente)
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// --- HELPER FORMATTAZIONE ---
const formatCHF = (val: number) => val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// --- TOOLTIP GRAFICI ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl z-50">
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
           <div key={index} className="text-xs font-bold flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
              <span className="text-slate-600">{entry.name}:</span>
              <span className="text-slate-900">{formatCHF(entry.value)}</span>
           </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- MODALE DRILL-DOWN ---
interface DrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    transactions: Transaction[];
    total: number;
    colorClass: string;
}

const DrillDownModal: React.FC<DrillDownModalProps> = ({ isOpen, onClose, title, transactions, total, colorClass }) => {
    if (!isOpen) return null;

    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title={title} subtitle="Dettaglio Movimenti">
            <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Totale Periodo</span>
                    <span className={`text-2xl font-black ${colorClass}`}>{formatCHF(total)} <span className="text-sm text-slate-300">CHF</span></span>
                </div>
                
                <div className="space-y-2">
                    {transactions.length > 0 ? transactions.map(tx => {
                        const amount = tx.amount_base || 0;
                        const isPositive = amount >= 0;
                        
                        return (
                            <div key={tx.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold text-slate-800">{new Date(tx.occurred_on).toLocaleDateString('it-IT')}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]">{tx.description || tx.kind}</span>
                                        {tx.tag && <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 uppercase">{tx.tag}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isPositive ? '+' : ''}{formatCHF(amount)}
                                    </span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-12 text-slate-400 text-sm font-medium italic">Nessun movimento trovato per i criteri selezionati.</div>
                    )}
                </div>
            </div>
        </FullScreenModal>
    );
};

export const Analysis: React.FC = () => {
  const { transactions, categories, accounts } = useFinance();
  const currentRealDate = new Date();
  
  const [selectedYear, setSelectedYear] = useState<number>(currentRealDate.getFullYear());
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Drill Down State
  const [drillState, setDrillState] = useState<{
      open: boolean;
      title: string;
      data: Transaction[];
      total: number;
      color: string;
  }>({ open: false, title: '', data: [], total: 0, color: 'text-slate-900' });

  // --- SELETTORI ---
  const availableYears = useMemo(() => {
    const years = transactions.map(t => parseInt(t.occurred_on.split('-')[0]));
    const unique = Array.from(new Set(years));
    if (!unique.includes(currentRealDate.getFullYear())) unique.push(currentRealDate.getFullYear());
    return unique.sort((a, b) => b - a);
  }, [transactions]);

  const yearOptions = useMemo(() => availableYears.map(y => ({ value: String(y), label: String(y) })), [availableYears]);

  // --- MAP ACCOUNT TYPES ---
  const accountTypeMap = useMemo(() => {
      const map = new Map<string, 'cash' | 'pocket' | 'invest' | 'pension'>();
      accounts.forEach(a => map.set(a.id, a.kind));
      return map;
  }, [accounts]);

  // --- CALCOLO SALDI DI FINE ANNO (BALANCE SHEET) ---
  const yearEndBalances = useMemo(() => {
      const balances: Record<string, number> = {};
      
      // Inizializza tutti i conti a 0
      accounts.forEach(a => balances[a.id] = 0);

      // Somma tutte le transazioni FINO alla fine dell'anno selezionato
      transactions.forEach(t => {
          const tYear = parseInt(t.occurred_on.split('-')[0]);
          if (tYear <= selectedYear) {
              const amount = t.amount_base || 0;
              // Logica di segno standard: expense è negativo, income positivo
              let val = amount;
              if (t.kind.startsWith('expense') && amount > 0) val = -amount;
              else if (t.kind.startsWith('income') && amount < 0) val = Math.abs(amount); // Correzione difensiva
              
              if (['expense_personal', 'expense_essential', 'expense_work'].includes(t.kind)) {
                  val = -Math.abs(amount);
              } else if (['income_personal', 'income_essential', 'income_work', 'income_pension'].includes(t.kind)) {
                  val = Math.abs(amount);
              } else {
                  val = amount; // transfer, adjustment hanno segno proprio
              }

              balances[t.account_id] = (balances[t.account_id] || 0) + val;
          }
      });

      // Dividi in gruppi
      const liquidityAccounts = accounts.filter(a => (a.kind === 'cash' || a.kind === 'pocket') && a.status === 'active');
      const wealthAccounts = accounts.filter(a => (a.kind === 'invest' || a.kind === 'pension') && a.status === 'active');

      const liquidityList = liquidityAccounts.map(a => ({ name: a.name, kind: a.kind, balance: balances[a.id] || 0 })).sort((a,b) => b.balance - a.balance);
      const wealthList = wealthAccounts.map(a => ({ name: a.name, kind: a.kind, balance: balances[a.id] || 0 })).sort((a,b) => b.balance - a.balance);

      const totalLiquidity = liquidityList.reduce((acc, curr) => acc + curr.balance, 0);
      const totalWealth = wealthList.reduce((acc, curr) => acc + curr.balance, 0);

      return { liquidityList, wealthList, totalLiquidity, totalWealth };
  }, [accounts, transactions, selectedYear]);


  // --- MOTORE DATI FLUSSI (CASHFLOW) ---
  const analysisData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(0, i).toLocaleString('it-IT', { month: 'short' }),
      monthIdx: i,
      income: 0,
      expenseFixed: 0,
      expenseVariable: 0,
      saved: 0 
    }));

    // Accumulatori Liste (Per Drill-Down)
    const lists = {
        income: [] as Transaction[],
        fixed: [] as Transaction[],
        variable: [] as Transaction[],
        invest: [] as Transaction[], // Moves to Wealth
        pension: [] as Transaction[], // Moves to Wealth
    };

    let totalIncome = 0;
    let totalFixed = 0;
    let totalVariable = 0;
    
    // Flussi verso patrimonio (Soldi che escono dalla liquidità)
    let flowToInvest = 0;
    let flowToPension = 0;

    // Calcolo Liquidità Iniziale (Cash + Pocket)
    let initialLiquidity = 0;
    
    // LOGICA LIQUIDITA' INIZIALE AGGIORNATA
    transactions.forEach(t => {
        const tYear = parseInt(t.occurred_on.split('-')[0]);
        const accKind = accountTypeMap.get(t.account_id);
        const isLiquidityAccount = accKind === 'cash' || accKind === 'pocket';

        if (!isLiquidityAccount) return;

        // Normalizzazione segno per il calcolo
        let val = t.amount_base || 0;
        if (t.kind.startsWith('expense')) val = -Math.abs(val);
        else if (t.kind.startsWith('income')) val = Math.abs(val);
        // Transfer e Adjustment mantengono il segno del DB

        if (selectedYear === 2024) {
            // REGOLA 2024 (Primo Anno): Conta solo le transazioni esplicite "Saldo Iniziale" del 2024
            if (tYear === 2024 && t.description?.toLowerCase().includes('saldo iniziale')) {
                initialLiquidity += val;
            }
        } else {
            // REGOLA ANNI SUCCESSIVI: Prendi il saldo finale di TUTTI gli anni precedenti
            // Somma tutto ciò che è successo PRIMA dell'anno selezionato
            if (tYear < selectedYear) {
                initialLiquidity += val;
            }
        }
    });

    // Categorie Spese (per Top 5)
    const categoryMap: Record<string, number> = {};

    transactions.forEach(t => {
        const [tY, tM] = t.occurred_on.split('-').map(Number);
        if (tY !== selectedYear) return; // Analizziamo solo l'anno corrente per i flussi

        const monthIdx = tM - 1;
        const amount = t.amount_base || 0; 
        const amountAbs = Math.abs(amount);
        const accKind = accountTypeMap.get(t.account_id);

        // 1. ENTRATE (Su conti di liquidità)
        if (t.kind === 'income_personal' && (accKind === 'cash' || accKind === 'pocket')) {
            months[monthIdx].income += amountAbs;
            totalIncome += amountAbs;
            lists.income.push(t);
        }

        // 2. USCITE FISSE
        else if (t.kind === 'expense_essential') {
            months[monthIdx].expenseFixed += amountAbs;
            totalFixed += amountAbs;
            lists.fixed.push(t);
            const catName = categories.find(c => c.id === t.category_id)?.name || 'Fisse (Essential)';
            categoryMap[catName] = (categoryMap[catName] || 0) + amountAbs;
        }
        
        // 3. USCITE VARIABILI
        else if (t.kind === 'expense_personal') {
            months[monthIdx].expenseVariable += amountAbs;
            totalVariable += amountAbs;
            lists.variable.push(t);
            const catName = categories.find(c => c.id === t.category_id)?.name || 'Variabili (Personal)';
            categoryMap[catName] = (categoryMap[catName] || 0) + amountAbs;
        }

        // 4. FLUSSI VERSO PATRIMONIO (Uscita da Cash/Pocket -> Entrata in Invest/Pension)
        if (t.kind.includes('transfer') || t.kind.includes('invest') || t.kind.includes('pension')) {
             if ((accKind === 'cash' || accKind === 'pocket') && amount < 0) {
                 if (t.kind.includes('invest')) {
                     flowToInvest += amountAbs;
                     lists.invest.push(t);
                 } else if (t.kind.includes('pension')) {
                     flowToPension += amountAbs;
                     lists.pension.push(t);
                 }
             }
        }
    });

    // Sort lists
    Object.values(lists).forEach(l => l.sort((a,b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime()));

    months.forEach(m => {
        m.saved = m.income - (m.expenseFixed + m.expenseVariable);
    });

    const netSavings = totalIncome - (totalFixed + totalVariable); 
    
    // Liquidità Finale = Iniziale + Net Savings - Uscite verso Patrimonio
    const liquidityGenerated = netSavings - flowToInvest - flowToPension;
    const finalLiquidityCalculated = initialLiquidity + liquidityGenerated;
    
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const spendingData = [
        { name: 'Spese Fisse', value: totalFixed, color: C.fixed },
        { name: 'Spese Variabili', value: totalVariable, color: C.variable },
    ].filter(d => d.value > 0);

    const allocationData = [
        { name: 'Investimenti', value: flowToInvest, color: C.invest },
        { name: 'Pensione', value: flowToPension, color: C.pension },
        { name: 'Liquidità Rimasta', value: Math.max(0, liquidityGenerated), color: C.pocket },
    ].filter(d => d.value > 0);

    const topCategories = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return {
        initialLiquidity,
        totalIncome,
        totalFixed, totalVariable,
        flowToInvest, flowToPension,
        netSavings,
        finalLiquidityCalculated,
        savingsRate,
        months, spendingData, allocationData, topCategories,
        lists
    };

  }, [transactions, selectedYear, categories, accountTypeMap]);

  // --- KPI STATS (New Additions) ---
  const kpiStats = useMemo(() => {
      // Filtra mesi attivi per non falsare la media con mesi futuri/vuoti
      const activeMonths = analysisData.months.filter(m => m.income > 0 || m.expenseFixed > 0 || m.expenseVariable > 0);
      const count = activeMonths.length || 1;
      
      const avgSavingsRate = activeMonths.reduce((sum, m) => sum + (m.income > 0 ? (m.saved / m.income) * 100 : 0), 0) / count;
      const avgBurn = (analysisData.totalFixed + analysisData.totalVariable) / count;
      
      const sortedBySavings = [...activeMonths].sort((a,b) => b.saved - a.saved);
      const bestMonth = sortedBySavings.length > 0 ? sortedBySavings[0] : null;

      const totalInvestedYear = analysisData.flowToInvest + analysisData.flowToPension;

      return { avgSavingsRate, avgBurn, bestMonth, totalInvestedYear };
  }, [analysisData]);

  // --- ACTIONS ---
  const openDrillDown = (type: keyof typeof analysisData.lists) => {
      let title = '';
      let color = '';
      let total = 0;

      switch(type) {
          case 'income': title = 'Entrate'; color = 'text-emerald-600'; total = analysisData.totalIncome; break;
          case 'fixed': title = 'Spese Fisse'; color = 'text-rose-700'; total = analysisData.totalFixed; break;
          case 'variable': title = 'Spese Variabili'; color = 'text-rose-500'; total = analysisData.totalVariable; break;
          case 'invest': title = 'Verso Investimenti'; color = 'text-emerald-700'; total = analysisData.flowToInvest; break;
          case 'pension': title = 'Verso Pensione'; color = 'text-amber-600'; total = analysisData.flowToPension; break;
      }
      
      setDrillState({ 
          open: true, 
          title, 
          data: analysisData.lists[type], 
          total, 
          color 
      });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <div className="flex items-center gap-3">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Analisi {selectedYear}</h2>
                <button onClick={() => setIsInfoOpen(true)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
            </div>
            <p className="text-sm font-medium text-slate-400 mt-1">Stato Patrimoniale e Flussi.</p>
         </div>
         <div className="w-[120px]">
             <CustomSelect 
                value={String(selectedYear)} 
                onChange={(v) => setSelectedYear(Number(v))} 
                options={yearOptions} 
                minimal={false} 
             />
         </div>
      </div>

      {/* KPI GRID (NEW) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Media SR %</span>
              <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${kpiStats.avgSavingsRate >= 20 ? 'text-emerald-500' : 'text-blue-500'}`}>{kpiStats.avgSavingsRate.toFixed(1)}</span>
                  <span className="text-xs font-bold text-slate-300">%</span>
              </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Media Spese/Mese</span>
              <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-rose-500">{formatCHF(kpiStats.avgBurn).split(',')[0]}</span>
                  <span className="text-xs font-bold text-slate-300">CHF</span>
              </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Miglior Mese</span>
              <div className="flex flex-col">
                  {kpiStats.bestMonth ? (
                      <>
                        <span className="text-sm font-bold text-slate-800">{kpiStats.bestMonth.name}</span>
                        <span className="text-xs font-black text-emerald-500">+{formatCHF(kpiStats.bestMonth.saved).split(',')[0]}</span>
                      </>
                  ) : <span className="text-xs text-slate-300">-</span>}
              </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Totale Investito (YTD)</span>
              <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-indigo-500">{formatCHF(kpiStats.totalInvestedYear).split(',')[0]}</span>
                  <span className="text-xs font-bold text-slate-300">CHF</span>
              </div>
          </div>
      </div>

      {/* CASHFLOW STATEMENT (WATERFALL) */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              
              {/* STEP 1: OPERATING CASHFLOW */}
              <div className="p-6 md:p-8 space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      1. Flusso Operativo
                  </h3>
                  
                  <div className="space-y-3">
                      <div onClick={() => openDrillDown('income')} className="flex justify-between items-center text-sm cursor-pointer group">
                          <span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Entrate Personali</span>
                          <span className="font-bold text-emerald-600">+{formatCHF(analysisData.totalIncome)}</span>
                      </div>
                      <div onClick={() => openDrillDown('fixed')} className="flex justify-between items-center text-sm cursor-pointer group">
                          <span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Uscite Fisse</span>
                          <span className="font-bold text-rose-700">-{formatCHF(analysisData.totalFixed)}</span>
                      </div>
                      <div onClick={() => openDrillDown('variable')} className="flex justify-between items-center text-sm cursor-pointer group">
                          <span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Uscite Variabili</span>
                          <span className="font-bold text-rose-500">-{formatCHF(analysisData.totalVariable)}</span>
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risparmio Netto</span>
                      <div className="flex flex-col items-end">
                          <span className="text-2xl font-black text-slate-900">{formatCHF(analysisData.netSavings)}</span>
                          <span className="text-[10px] font-bold text-emerald-500">{analysisData.savingsRate.toFixed(1)}% SR</span>
                      </div>
                  </div>
              </div>

              {/* STEP 2: RECONCILIATION */}
              <div className="p-6 md:p-8 space-y-6 bg-slate-50/50">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      2. Variazione Liquidità
                  </h3>

                  <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-500">Liquidità Iniziale (Cash + Pockets)</span>
                          <span className="font-bold text-slate-700">{formatCHF(analysisData.initialLiquidity)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-200">
                          <span className="font-bold text-slate-500">+ Risparmio Netto</span>
                          <span className="font-bold text-slate-700">{formatCHF(analysisData.netSavings)}</span>
                      </div>
                      
                      <div className="pt-2 space-y-2">
                        <div onClick={() => openDrillDown('invest')} className="flex justify-between items-center text-sm cursor-pointer group">
                            <span className="font-bold text-slate-500 group-hover:text-blue-600 transition-colors pl-2 border-l-2 border-transparent group-hover:border-emerald-500">Verso Investimenti</span>
                            <span className="font-bold text-emerald-700">-{formatCHF(analysisData.flowToInvest)}</span>
                        </div>
                        <div onClick={() => openDrillDown('pension')} className="flex justify-between items-center text-sm cursor-pointer group">
                            <span className="font-bold text-slate-500 group-hover:text-blue-600 transition-colors pl-2 border-l-2 border-transparent group-hover:border-amber-500">Verso Pensione</span>
                            <span className="font-bold text-amber-600">-{formatCHF(analysisData.flowToPension)}</span>
                        </div>
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liquidità Finale</span>
                      <span className={`text-2xl font-black ${analysisData.finalLiquidityCalculated >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {formatCHF(analysisData.finalLiquidityCalculated)}
                      </span>
                  </div>
              </div>

          </div>
      </div>

      {/* 3. BALANCE SHEET BREAKDOWN (NEW) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LIQUIDITY ACCOUNTS */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div> Liquidità (Cash & Pockets)
                  </h3>
                  <span className="text-xs font-black text-slate-300 uppercase">Al 31/12</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 max-h-[250px]">
                  {yearEndBalances.liquidityList.map(acc => (
                      <div key={acc.name} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{acc.name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{acc.kind}</span>
                          </div>
                          <span className="font-black text-slate-900">{formatCHF(acc.balance)}</span>
                      </div>
                  ))}
              </div>
              <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Liquidità</span>
                  <span className="text-lg font-black text-blue-600">{formatCHF(yearEndBalances.totalLiquidity)}</span>
              </div>
          </div>

          {/* WEALTH ACCOUNTS */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Patrimonio (Invest & Pension)
                  </h3>
                  <span className="text-xs font-black text-slate-300 uppercase">Al 31/12</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 max-h-[250px]">
                  {yearEndBalances.wealthList.map(acc => (
                      <div key={acc.name} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{acc.name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{acc.kind}</span>
                          </div>
                          <span className="font-black text-slate-900">{formatCHF(acc.balance)}</span>
                      </div>
                  ))}
              </div>
              <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Patrimonio</span>
                  <span className="text-lg font-black text-emerald-600">{formatCHF(yearEndBalances.totalWealth)}</span>
              </div>
          </div>
      </div>

      {/* 4. CHARTS: SPESE & ALLOCAZIONE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-[320px] flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div> Composizione Uscite
              </h3>
              <div className="flex-1 flex items-center">
                  <div className="w-1/2 h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={analysisData.spendingData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {analysisData.spendingData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                  ))}
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip />} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 pl-4 space-y-4">
                      <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fisse</span><span className="text-xl font-black text-rose-700 block">{formatCHF(analysisData.totalFixed)}</span></div>
                      <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Variabili</span><span className="text-xl font-black text-rose-400 block">{formatCHF(analysisData.totalVariable)}</span></div>
                  </div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-[320px] flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Destinazione Surplus
              </h3>
              <div className="flex-1 flex items-center">
                  <div className="w-1/2 h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={analysisData.allocationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {analysisData.allocationData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                  ))}
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip />} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 pl-4 space-y-2 overflow-y-auto custom-scrollbar">
                      {analysisData.allocationData.map(item => (
                          <div key={item.name} className="flex flex-col pb-2 border-b border-slate-50 last:border-0">
                              <span className="text-[9px] font-bold uppercase" style={{ color: item.color }}>{item.name}</span>
                              <span className="text-sm font-black text-slate-800">{formatCHF(item.value)}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* 5. TREND MENSILE */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Trend Mensile {selectedYear}</h3>
          </div>
          <div className="flex-1 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysisData.months} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="expenseFixed" name="Spese Fisse" stackId="a" fill={C.fixed} radius={[0,0,0,0]} barSize={20} />
                      <Bar dataKey="expenseVariable" name="Spese Variabili" stackId="a" fill={C.variable} radius={[4,4,0,0]} barSize={20} />
                      <Bar dataKey="saved" name="Risparmio Netto" fill="#cbd5e1" radius={[4,4,4,4]} barSize={20} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* 6. TOP SPESE & DETTAGLIO MENSILE TABLE (NEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Top Categorie di Spesa</h3>
              <div className="space-y-4">
                  {analysisData.topCategories.map((cat, idx) => (
                      <div key={cat.name} className="relative">
                          <div className="flex justify-between items-center mb-1.5 z-10 relative">
                              <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{idx + 1}</div>
                                  <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                              </div>
                              <span className="text-xs font-black text-slate-900">{formatCHF(cat.value)} <span className="text-[9px] text-slate-400 font-normal">CHF</span></span>
                          </div>
                          <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                    width: `${(cat.value / (analysisData.totalFixed + analysisData.totalVariable)) * 100}%`,
                                    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                                }} 
                              />
                          </div>
                      </div>
                  ))}
                  {analysisData.topCategories.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase">Nessuna spesa registrata</div>
                  )}
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Dettaglio Mensile</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              <th className="py-2 pl-2">Mese</th>
                              <th className="py-2 text-right">In</th>
                              <th className="py-2 text-right">Out</th>
                              <th className="py-2 text-right">Net</th>
                              <th className="py-2 text-right pr-2">SR%</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {analysisData.months.map(m => {
                              // Skip future months in table if they are 0
                              if(m.income === 0 && m.expenseFixed === 0 && m.expenseVariable === 0) return null;
                              
                              const totalOut = m.expenseFixed + m.expenseVariable;
                              const sr = m.income > 0 ? (m.saved / m.income) * 100 : 0;
                              return (
                                  <tr key={m.name} className="group hover:bg-slate-50 transition-colors">
                                      <td className="py-3 pl-2 text-xs font-bold text-slate-700">{m.name}</td>
                                      <td className="py-3 text-right text-xs font-medium text-emerald-600">+{formatCHF(m.income).split(',')[0]}</td>
                                      <td className="py-3 text-right text-xs font-medium text-rose-600">-{formatCHF(totalOut).split(',')[0]}</td>
                                      <td className={`py-3 text-right text-xs font-black ${m.saved >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatCHF(m.saved).split(',')[0]}</td>
                                      <td className="py-3 text-right pr-2">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sr >= 20 ? 'bg-emerald-100 text-emerald-700' : sr > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                              {sr.toFixed(0)}%
                                          </span>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      <DrillDownModal 
        isOpen={drillState.open}
        onClose={() => setDrillState(prev => ({ ...prev, open: false }))}
        title={drillState.title}
        transactions={drillState.data}
        total={drillState.total}
        colorClass={drillState.color}
      />

      <FullScreenModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Guida Analisi" subtitle="Dettagli & Calcoli">
        <div className="space-y-8 pb-12">
           
           {/* SECTION 1: KEY METRICS */}
           <div className="space-y-4">
               <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">1. KPI (Metriche Chiave)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Savings Rate (SR%)</span>
                       <p className="text-sm font-medium text-slate-700 mb-2">La percentuale di reddito risparmiato.</p>
                       <code className="text-xs bg-white p-1 rounded border border-slate-200 block text-slate-500 font-mono">
                           (Entrate - Uscite) / Entrate * 100
                       </code>
                       <p className="text-[10px] text-slate-400 mt-2 italic">Es. Entri 5.000, Spendi 3.000 -> SR 40%</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Media Spese (Burn Rate)</span>
                       <p className="text-sm font-medium text-slate-700 mb-2">Media mensile delle uscite totali (Fisse + Variabili).</p>
                       <code className="text-xs bg-white p-1 rounded border border-slate-200 block text-slate-500 font-mono">
                           (Totale Fisse + Totale Variabili) / Mesi
                       </code>
                   </div>
               </div>
           </div>

           {/* SECTION 2: CASHFLOW */}
           <div className="space-y-4">
               <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">2. Flusso Operativo</h4>
               <div className="space-y-3 text-sm text-slate-600">
                   <p>Questa sezione (riquadro in alto a sinistra) mostra il risultato netto delle tue operazioni quotidiane.</p>
                   <ul className="space-y-2 pl-4 border-l-2 border-slate-100">
                       <li className="flex flex-col">
                           <span className="font-bold text-emerald-600">Entrate Personali</span>
                           <span className="text-xs">Somma di tutte le transazioni di tipo <code>income_personal</code> accreditate su conti Cash o Pocket.</span>
                       </li>
                       <li className="flex flex-col">
                           <span className="font-bold text-rose-700">Uscite Fisse</span>
                           <span className="text-xs">Somma di tutte le transazioni di tipo <code>expense_essential</code>.</span>
                       </li>
                       <li className="flex flex-col">
                           <span className="font-bold text-rose-500">Uscite Variabili</span>
                           <span className="text-xs">Somma di tutte le transazioni di tipo <code>expense_personal</code>.</span>
                       </li>
                       <li className="flex flex-col mt-1 pt-1 border-t border-dashed border-slate-200">
                           <span className="font-bold text-slate-900">Risparmio Netto (Surplus)</span>
                           <span className="text-xs">Differenza matematica: <code className="bg-slate-50 px-1">Entrate - (Fisse + Variabili)</code>. Rappresenta la nuova liquidità generata nell'anno.</span>
                       </li>
                   </ul>
               </div>
           </div>

           {/* SECTION 3: LIQUIDITY RECONCILIATION */}
           <div className="space-y-4">
               <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">3. Variazione Liquidità</h4>
               <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-sm text-slate-600 space-y-4">
                   <p className="font-medium text-slate-800">
                       Come viene calcolata la "Liquidità Finale"?
                   </p>
                   
                   <div>
                       <span className="text-xs font-bold text-slate-400 uppercase block mb-1">A. Liquidità Iniziale (Start)</span>
                       <ul className="text-xs list-disc pl-4 space-y-1">
                           <li><strong>Anno 2024:</strong> Somma solo i movimenti con nota esatta "Saldo Iniziale".</li>
                           <li><strong>Anni Successivi (es. 2025):</strong> Somma matematica di TUTTI i movimenti su conti Cash/Pocket avvenuti <em>prima</em> del 1 Gennaio dell'anno selezionato. Corrisponde al saldo finale dell'anno precedente.</li>
                       </ul>
                   </div>

                   <div>
                       <span className="text-xs font-bold text-slate-400 uppercase block mb-1">B. Movimenti Patrimoniali (Out)</span>
                       <p className="text-xs mb-1">Il Risparmio Netto (punto 2) non rimane tutto in cassa. Una parte viene spostata verso il patrimonio:</p>
                       <ul className="text-xs list-disc pl-4 space-y-1">
                           <li><strong>Verso Investimenti:</strong> Bonifici da Cash/Pocket a conti <code>invest</code>.</li>
                           <li><strong>Verso Pensione:</strong> Bonifici da Cash/Pocket a conti <code>pension</code>.</li>
                       </ul>
                   </div>

                   <div className="bg-white p-3 rounded-lg border border-blue-200 mt-2">
                       <span className="text-[10px] font-bold text-blue-500 uppercase block mb-1">Formula Finale</span>
                       <code className="text-xs font-mono font-bold text-slate-700">
                           Liq. Finale = Iniziale + Risparmio Netto - (Investimenti + Pensione)
                       </code>
                   </div>
               </div>
           </div>

           {/* SECTION 4: BALANCE SHEET */}
           <div className="space-y-4">
               <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">4. Stato Patrimoniale</h4>
               <div className="text-sm text-slate-600 space-y-2">
                   <p>Questa sezione (in basso a sinistra) fotografa i saldi esatti al <strong>31 Dicembre</strong> dell'anno selezionato.</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                       <div className="border border-slate-200 rounded-xl p-3">
                           <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div><span className="font-bold text-slate-800 text-xs uppercase">Liquidità</span></div>
                           <p className="text-xs">Include tutti i conti di tipo <code>cash</code> e <code>pocket</code>. I trasferimenti interni tra questi conti non cambiano il totale, spostano solo i soldi da una tasca all'altra.</p>
                       </div>
                       <div className="border border-slate-200 rounded-xl p-3">
                           <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="font-bold text-slate-800 text-xs uppercase">Patrimonio</span></div>
                           <p className="text-xs">Include i conti <code>invest</code> e <code>pension</code>. Qui i soldi crescono (o calano) e sono considerati "bloccati" rispetto alla liquidità operativa.</p>
                       </div>
                   </div>
               </div>
           </div>

        </div>
      </FullScreenModal>

    </div>
  );
};
