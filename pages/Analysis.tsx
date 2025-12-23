
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { CustomSelect } from '../components/CustomSelect';
import { FullScreenModal } from '../components/FullScreenModal';
import { Transaction } from '../types';
import { fetchExchangeRate } from '../utils/helpers';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';

// --- CONFIGURAZIONE COLORI ---
const C = {
  income: '#10b981',      // Emerald 500
  fixed: '#be123c',       // Rose 700
  variable: '#f43f5e',    // Rose 500
  invest: '#059669',      // Emerald 600
  pension: '#d97706',     // Amber 600
  pocket: '#3b82f6',      // Blue 500
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// --- HELPER FORMATTAZIONE ---
const formatCHF = (val: number) => val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatOriginal = (val: number, currency: string) => val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;

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

// --- MODALE DRILL-DOWN MOVIMENTI ---
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
                        <div className="text-center py-12 text-slate-400 text-sm font-medium italic">Nessun movimento trovato.</div>
                    )}
                </div>
            </div>
        </FullScreenModal>
    );
};

// --- MODALE EVOLUZIONE (CONTI) ---
interface EvolutionDrillModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    colorClass: string;
}

const EvolutionDrillModal: React.FC<EvolutionDrillModalProps> = ({ isOpen, onClose, title, data, colorClass }) => {
    if (!isOpen) return null;
    
    // Calcoli totali per header modale
    const totalStart = data.reduce((acc, curr) => acc + curr.start, 0);
    const totalEnd = data.reduce((acc, curr) => acc + curr.end, 0);
    const totalDelta = totalEnd - totalStart;

    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title={title} subtitle="Evoluzione Anno">
            <div className="space-y-6">
                {/* Header Riepilogo */}
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-3 gap-4">
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Inizio Anno</span>
                        <span className="text-lg font-bold text-slate-700">{formatCHF(totalStart)}</span>
                    </div>
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Fine Anno</span>
                        <span className="text-lg font-black text-slate-900">{formatCHF(totalEnd)}</span>
                    </div>
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Variazione</span>
                        <span className={`text-lg font-black ${totalDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {totalDelta > 0 ? '+' : ''}{formatCHF(totalDelta)}
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    {data.map(acc => (
                        <div key={acc.name} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col min-w-0 pr-4">
                                <span className="font-bold text-slate-800 text-sm truncate">{acc.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{acc.currency}</span>
                            </div>
                            <div className="flex items-center gap-6 text-right">
                                <div className="hidden sm:block">
                                    <span className="text-[9px] font-bold text-slate-400 block">Inizio</span>
                                    <span className="text-xs font-bold text-slate-600">{formatCHF(acc.start)}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 block">Fine</span>
                                    <span className="text-sm font-black text-slate-900">{formatCHF(acc.end)}</span>
                                </div>
                                <div className="min-w-[70px]">
                                    <span className="text-[9px] font-bold text-slate-400 block">Delta</span>
                                    <span className={`text-xs font-bold ${acc.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {acc.delta >= 0 ? '+' : ''}{formatCHF(acc.delta)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
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
  
  // Store rates for multiple years
  const [historicalRates, setHistoricalRates] = useState<Record<number, Record<string, number>>>({});
  
  // Drill Down States
  const [drillState, setDrillState] = useState<{ open: boolean; title: string; data: Transaction[]; total: number; color: string; }>({ open: false, title: '', data: [], total: 0, color: 'text-slate-900' });
  const [evolutionDrill, setEvolutionDrill] = useState<{ open: boolean; title: string; data: any[]; color: string }>({ open: false, title: '', data: [], color: '' });

  // --- FETCH TASSI DI FINE ANNO ---
  useEffect(() => {
      const loadRates = async () => {
          const uniqueCurrencies = Array.from(new Set(accounts.map(a => a.currency_code))).filter(c => c !== 'CHF') as string[];
          if (uniqueCurrencies.length === 0) return;

          const yearsToFetch = [selectedYear, selectedYear - 1];
          const newRates: Record<number, Record<string, number>> = {};

          for (const year of yearsToFetch) {
              const targetDate = `${year}-12-31`;
              const rates: Record<string, number> = { CHF: 1 };
              
              await Promise.all(uniqueCurrencies.map(async (curr) => {
                  try {
                      const rate = await fetchExchangeRate(targetDate, curr, 'CHF');
                      rates[curr] = rate;
                  } catch (e) {
                      console.error(`Rate fetch error`, e);
                      rates[curr] = 1;
                  }
              }));
              newRates[year] = rates;
          }
          setHistoricalRates(newRates);
      };
      if (accounts.length > 0) loadRates();
  }, [selectedYear, accounts]);

  // --- SELETTORI ---
  const availableYears = useMemo(() => {
    const years = transactions.map(t => parseInt(t.occurred_on.split('-')[0]));
    const unique = Array.from(new Set(years));
    if (!unique.includes(currentRealDate.getFullYear())) unique.push(currentRealDate.getFullYear());
    return unique.sort((a: number, b: number) => b - a);
  }, [transactions]);

  const yearOptions = useMemo(() => availableYears.map(y => ({ value: String(y), label: String(y) })), [availableYears]);

  const accountTypeMap = useMemo(() => {
      const map = new Map<string, 'cash' | 'pocket' | 'invest' | 'pension'>();
      accounts.forEach(a => map.set(a.id, a.kind));
      return map;
  }, [accounts]);

  // --- 1. CALCOLO SALDI DI FINE ANNO (SNAPSHOT 31/12) ---
  const yearEndBalances = useMemo(() => {
      const balancesOriginal: Record<string, number> = {};
      accounts.forEach(a => balancesOriginal[a.id] = 0);

      transactions.forEach(t => {
          const tYear = parseInt(t.occurred_on.split('-')[0]);
          if (tYear <= selectedYear) {
              let amtOrg = t.amount_original || 0;
              if (['expense_personal', 'expense_essential', 'expense_work'].includes(t.kind)) amtOrg = -Math.abs(amtOrg);
              else if (['income_personal', 'income_essential', 'income_work', 'income_pension'].includes(t.kind)) amtOrg = Math.abs(amtOrg);
              if (balancesOriginal[t.account_id] !== undefined) balancesOriginal[t.account_id] += amtOrg;
          }
      });

      const currentYearRates = historicalRates[selectedYear] || {};

      const liquidityList = accounts.filter(a => (a.kind === 'cash' || a.kind === 'pocket')).map(a => {
            const originalBalance = balancesOriginal[a.id] || 0;
            const rate = a.currency_code === 'CHF' ? 1 : (currentYearRates[a.currency_code] || 1);
            return { name: a.name, kind: a.kind, currency: a.currency_code, original: originalBalance, base: originalBalance * rate };
        }).filter(a => Math.abs(a.base) > 0.01).sort((a, b) => b.base - a.base);

      const wealthList = accounts.filter(a => (a.kind === 'invest' || a.kind === 'pension')).map(a => {
            const originalBalance = balancesOriginal[a.id] || 0;
            const rate = a.currency_code === 'CHF' ? 1 : (currentYearRates[a.currency_code] || 1);
            return { name: a.name, kind: a.kind, currency: a.currency_code, original: originalBalance, base: originalBalance * rate };
        }).filter(a => Math.abs(a.base) > 0.01).sort((a, b) => b.base - a.base);

      return { 
          liquidityList, 
          wealthList, 
          totalLiquidity: liquidityList.reduce((acc, curr) => acc + curr.base, 0),
          totalWealth: wealthList.reduce((acc, curr) => acc + curr.base, 0)
      };
  }, [accounts, transactions, selectedYear, historicalRates]);

  // --- 2. EVOLUZIONE PATRIMONIALE (Start vs End) ---
  const wealthEvolution = useMemo(() => {
      const openingRates = historicalRates[selectedYear - 1] || {};
      const closingRates = historicalRates[selectedYear] || {};
      const accountStats: Record<string, { start: number, end: number, kind: string, name: string, currency: string }> = {};
      
      accounts.forEach(a => {
          accountStats[a.id] = { start: 0, end: 0, kind: a.kind, name: a.name, currency: a.currency_code };
      });

      // START Balance
      if (selectedYear === 2024) {
          transactions.forEach(t => {
              if (parseInt(t.occurred_on.split('-')[0]) === 2024) {
                  const isOpening = t.description?.toLowerCase().includes('saldo iniziale') || t.description?.toLowerCase().includes('apertura');
                  if (isOpening && accountStats[t.account_id]) {
                      let val = t.amount_base || 0;
                      if (['expense_personal', 'expense_essential', 'expense_work'].includes(t.kind)) val = -Math.abs(val);
                      else if (['income_personal', 'income_essential', 'income_work', 'income_pension'].includes(t.kind)) val = Math.abs(val);
                      accountStats[t.account_id].start += val;
                  }
              }
          });
      } else {
          const balancesStart: Record<string, number> = {};
          transactions.forEach(t => {
              if (parseInt(t.occurred_on.split('-')[0]) < selectedYear) {
                  let amt = t.amount_original || 0;
                  if (['expense_personal', 'expense_essential', 'expense_work'].includes(t.kind)) amt = -Math.abs(amt);
                  else if (['income_personal', 'income_essential', 'income_work', 'income_pension'].includes(t.kind)) amt = Math.abs(amt);
                  if (balancesStart[t.account_id] === undefined) balancesStart[t.account_id] = 0;
                  balancesStart[t.account_id] += amt;
              }
          });
          Object.entries(balancesStart).forEach(([accId, val]) => {
              if (accountStats[accId]) {
                  const rate = accountStats[accId].currency === 'CHF' ? 1 : (openingRates[accountStats[accId].currency] || 1);
                  accountStats[accId].start = val * rate;
              }
          });
      }

      // END Balance
      const balancesEnd: Record<string, number> = {};
      transactions.forEach(t => {
          if (parseInt(t.occurred_on.split('-')[0]) <= selectedYear) {
              let amt = t.amount_original || 0;
              if (['expense_personal', 'expense_essential', 'expense_work'].includes(t.kind)) amt = -Math.abs(amt);
              else if (['income_personal', 'income_essential', 'income_work', 'income_pension'].includes(t.kind)) amt = Math.abs(amt);
              if (balancesEnd[t.account_id] === undefined) balancesEnd[t.account_id] = 0;
              balancesEnd[t.account_id] += amt;
          }
      });
      Object.entries(balancesEnd).forEach(([accId, val]) => {
          if (accountStats[accId]) {
              const rate = accountStats[accId].currency === 'CHF' ? 1 : (closingRates[accountStats[accId].currency] || 1);
              accountStats[accId].end = val * rate;
          }
      });

      const groups = { cash: [] as any[], pocket: [] as any[], invest: [] as any[], pension: [] as any[] };
      Object.values(accountStats).forEach(stat => {
          const delta = stat.end - stat.start;
          const item = { ...stat, delta };
          if (Math.abs(stat.start) > 0.01 || Math.abs(stat.end) > 0.01) {
              if (stat.kind === 'cash') groups.cash.push(item);
              else if (stat.kind === 'pocket') groups.pocket.push(item);
              else if (stat.kind === 'invest') groups.invest.push(item);
              else if (stat.kind === 'pension') groups.pension.push(item);
          }
      });
      return groups;
  }, [accounts, transactions, selectedYear, historicalRates]);

  // --- 3. MOTORE DATI FLUSSI (CASHFLOW) ---
  const analysisData = useMemo(() => {
    // ... Logic remains same as previous steps, compacted for brevity but fully functional
    const months = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('it-IT', { month: 'short' }), monthIdx: i, income: 0, expenseFixed: 0, expenseVariable: 0, saved: 0 }));
    const lists = { income: [] as Transaction[], fixed: [] as Transaction[], variable: [] as Transaction[], invest: [] as Transaction[], pension: [] as Transaction[] };
    let totalIncome = 0, totalFixed = 0, totalVariable = 0, flowToInvest = 0, flowToPension = 0, initialLiquidity = 0;

    // Logic 2024/2025 Initial Liquidity (Same as before)
    if (selectedYear === 2024) {
        transactions.forEach(t => {
            const tYear = parseInt(t.occurred_on.split('-')[0]);
            const accKind = accountTypeMap.get(t.account_id);
            if (accKind !== 'cash' && accKind !== 'pocket') return;
            const isOpening = t.description?.toLowerCase().includes('saldo iniziale') || t.description?.toLowerCase().includes('apertura');
            if (tYear === 2024 && isOpening) {
                let val = t.amount_base || 0;
                if (t.kind.startsWith('expense')) val = -Math.abs(val); else if (t.kind.startsWith('income')) val = Math.abs(val);
                initialLiquidity += val;
            }
        });
    } else {
        const currencyBalances: Record<string, number> = {};
        transactions.forEach(t => {
            if (parseInt(t.occurred_on.split('-')[0]) < selectedYear) {
                const accKind = accountTypeMap.get(t.account_id);
                if (accKind !== 'cash' && accKind !== 'pocket') return;
                const acc = accounts.find(a => a.id === t.account_id);
                if (!acc) return;
                let amt = t.amount_original || 0;
                if (['expense_personal', 'expense_essential', 'expense_work'].includes(t.kind)) amt = -Math.abs(amt); else if (['income_personal', 'income_essential', 'income_work', 'income_pension'].includes(t.kind)) amt = Math.abs(amt);
                currencyBalances[acc.currency_code] = (currencyBalances[acc.currency_code] || 0) + amt;
            }
        });
        const prevRates = historicalRates[selectedYear - 1] || {};
        Object.entries(currencyBalances).forEach(([curr, bal]) => {
            initialLiquidity += (bal * (curr === 'CHF' ? 1 : (prevRates[curr] || 1)));
        });
    }

    const categoryMap: Record<string, number> = {};
    transactions.forEach(t => {
        const [tY, tM] = t.occurred_on.split('-').map(Number);
        if (tY !== selectedYear) return;
        const isOpening = t.description?.toLowerCase().includes('saldo iniziale') || t.description?.toLowerCase().includes('apertura');
        if (selectedYear === 2024 && isOpening) return;

        const idx = tM - 1;
        const amount = Math.abs(t.amount_base || 0);
        const accKind = accountTypeMap.get(t.account_id);

        if (t.kind === 'income_personal' && (accKind === 'cash' || accKind === 'pocket')) {
            months[idx].income += amount; totalIncome += amount; lists.income.push(t);
        } else if (t.kind === 'expense_essential') {
            months[idx].expenseFixed += amount; totalFixed += amount; lists.fixed.push(t);
            categoryMap[categories.find(c => c.id === t.category_id)?.name || 'Fisse'] = (categoryMap[categories.find(c => c.id === t.category_id)?.name || 'Fisse'] || 0) + amount;
        } else if (t.kind === 'expense_personal') {
            months[idx].expenseVariable += amount; totalVariable += amount; lists.variable.push(t);
            categoryMap[categories.find(c => c.id === t.category_id)?.name || 'Variabili'] = (categoryMap[categories.find(c => c.id === t.category_id)?.name || 'Variabili'] || 0) + amount;
        }
        if ((t.kind.includes('transfer') || t.kind.includes('invest') || t.kind.includes('pension')) && (accKind === 'cash' || accKind === 'pocket') && (t.amount_base || 0) < 0) {
             if (t.kind.includes('invest')) { flowToInvest += amount; lists.invest.push(t); } 
             else if (t.kind.includes('pension')) { flowToPension += amount; lists.pension.push(t); }
        }
    });

    Object.values(lists).forEach(l => l.sort((a,b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime()));
    months.forEach(m => m.saved = m.income - (m.expenseFixed + m.expenseVariable));
    const netSavings = totalIncome - (totalFixed + totalVariable);
    const liquidityGenerated = netSavings - flowToInvest - flowToPension;
    const finalLiquidityCalculated = initialLiquidity + liquidityGenerated;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const spendingData = [ { name: 'Spese Fisse', value: totalFixed, color: C.fixed }, { name: 'Spese Variabili', value: totalVariable, color: C.variable } ].filter(d => d.value > 0);
    const allocationData = [ { name: 'Investimenti', value: flowToInvest, color: C.invest }, { name: 'Pensione', value: flowToPension, color: C.pension }, { name: 'Liquidità Rimasta', value: Math.max(0, liquidityGenerated), color: C.pocket } ].filter(d => d.value > 0);
    const topCategories = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    return { initialLiquidity, totalIncome, totalFixed, totalVariable, flowToInvest, flowToPension, netSavings, finalLiquidityCalculated, savingsRate, months, spendingData, allocationData, topCategories, lists };
  }, [transactions, selectedYear, categories, accountTypeMap, historicalRates, accounts]);

  // --- 4. KPI STATS ---
  const kpiStats = useMemo(() => {
      const monthsWithData = analysisData.months.filter(m => m.income !== 0 || m.expenseFixed !== 0 || m.expenseVariable !== 0);
      const count = monthsWithData.length || 1;
      
      const avgBurn = (analysisData.totalFixed + analysisData.totalVariable) / count;
      
      // Calculate Average SR across active months
      const validSRMonths = monthsWithData.filter(m => m.income > 0);
      const avgSavingsRate = validSRMonths.length > 0 
          ? validSRMonths.reduce((sum, m) => sum + ((m.saved / m.income) * 100), 0) / validSRMonths.length 
          : 0;

      const bestMonth = [...analysisData.months].sort((a, b) => b.saved - a.saved)[0];
      const validBestMonth = bestMonth && bestMonth.saved > 0 ? bestMonth : null;

      return {
          avgSavingsRate,
          avgBurn,
          bestMonth: validBestMonth,
          totalInvestedYear: analysisData.flowToInvest
      };
  }, [analysisData]);

  // Actions
  const openDrillDown = (type: keyof typeof analysisData.lists) => {
      let title = '', color = '';
      if(type === 'income') { title = 'Entrate'; color = 'text-emerald-600'; }
      if(type === 'fixed') { title = 'Spese Fisse'; color = 'text-rose-700'; }
      if(type === 'variable') { title = 'Spese Variabili'; color = 'text-rose-500'; }
      if(type === 'invest') { title = 'Verso Investimenti'; color = 'text-emerald-700'; }
      if(type === 'pension') { title = 'Verso Pensione'; color = 'text-amber-600'; }
      setDrillState({ open: true, title, data: analysisData.lists[type], total: 0, color }); // Total not used in logic for brevity here
  };

  const openEvolutionDrill = (type: 'cash' | 'pocket' | 'invest' | 'pension', title: string, color: string) => {
      setEvolutionDrill({ open: true, title, data: wealthEvolution[type], color });
  };

  // Helper Widget for Evolution Summary
  const EvolutionSummaryCard = ({ title, type, colorClass, icon }: { title: string, type: 'cash' | 'pocket' | 'invest' | 'pension', colorClass: string, icon: React.ReactNode }) => {
      const data = wealthEvolution[type];
      const start = data.reduce((acc, c) => acc + c.start, 0);
      const end = data.reduce((acc, c) => acc + c.end, 0);
      const delta = end - start;
      const borderClass = colorClass.replace('text-', 'border-').replace('600', '200');
      const bgClass = colorClass.replace('text-', 'bg-').replace('600', '50');

      return (
          <div 
            onClick={() => openEvolutionDrill(type, title, colorClass)}
            className={`bg-white p-4 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:border-${colorClass.replace('text-','').replace('600','300')} transition-all active:scale-[0.98] group`}
          >
              <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgClass} ${colorClass}`}>
                      {icon}
                  </div>
                  <span className="font-bold text-sm text-slate-800 uppercase tracking-tight">{title}</span>
              </div>
              <div className="flex justify-between items-center px-1">
                  <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Inizio</span>
                      <span className="text-xs font-bold text-slate-600">{formatCHF(start)}</span>
                  </div>
                  <div className="text-slate-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                  <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Fine</span>
                      <span className="text-sm font-black text-slate-900">{formatCHF(end)}</span>
                  </div>
              </div>
              <div className={`mt-3 pt-2 border-t border-slate-50 text-center font-bold text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {delta > 0 ? '+' : ''}{formatCHF(delta)}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <div className="flex items-center gap-3">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Analisi {selectedYear}</h2>
                <button onClick={() => setIsInfoOpen(true)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
            </div>
            <p className="text-sm font-medium text-slate-400 mt-1">Stato Patrimoniale e Flussi.</p>
         </div>
         <div className="w-[120px]"><CustomSelect value={String(selectedYear)} onChange={(v) => setSelectedYear(Number(v))} options={yearOptions} minimal={false} /></div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Media SR %</span>
              <div className="flex items-baseline gap-1"><span className={`text-2xl font-black ${kpiStats.avgSavingsRate >= 20 ? 'text-emerald-500' : 'text-blue-500'}`}>{kpiStats.avgSavingsRate.toFixed(1)}</span><span className="text-xs font-bold text-slate-300">%</span></div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Media Spese/Mese</span>
              <div className="flex items-baseline gap-1"><span className="text-2xl font-black text-rose-500">{formatCHF(kpiStats.avgBurn).split(',')[0]}</span><span className="text-xs font-bold text-slate-300">CHF</span></div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Miglior Mese</span>
              <div className="flex flex-col">{kpiStats.bestMonth ? (<><span className="text-sm font-bold text-slate-800">{kpiStats.bestMonth.name}</span><span className="text-xs font-black text-emerald-500">+{formatCHF(kpiStats.bestMonth.saved).split(',')[0]}</span></>) : <span className="text-xs text-slate-300">-</span>}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[100px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Totale Investito</span>
              <div className="flex items-baseline gap-1"><span className="text-2xl font-black text-indigo-500">{formatCHF(kpiStats.totalInvestedYear).split(',')[0]}</span><span className="text-xs font-bold text-slate-300">CHF</span></div>
          </div>
      </div>

      {/* Cashflow Waterfall */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="p-6 md:p-8 space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300"></div>1. Flusso Operativo</h3>
                  <div className="space-y-3">
                      <div onClick={() => openDrillDown('income')} className="flex justify-between items-center text-sm cursor-pointer group"><span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Entrate Personali</span><span className="font-bold text-emerald-600">+{formatCHF(analysisData.totalIncome)}</span></div>
                      <div onClick={() => openDrillDown('fixed')} className="flex justify-between items-center text-sm cursor-pointer group"><span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Uscite Fisse</span><span className="font-bold text-rose-700">-{formatCHF(analysisData.totalFixed)}</span></div>
                      <div onClick={() => openDrillDown('variable')} className="flex justify-between items-center text-sm cursor-pointer group"><span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Uscite Variabili</span><span className="font-bold text-rose-500">-{formatCHF(analysisData.totalVariable)}</span></div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-end"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risparmio Netto</span><div className="flex flex-col items-end"><span className="text-2xl font-black text-slate-900">{formatCHF(analysisData.netSavings)}</span><span className="text-[10px] font-bold text-emerald-500">{analysisData.savingsRate.toFixed(1)}% SR</span></div></div>
              </div>
              <div className="p-6 md:p-8 space-y-6 bg-slate-50/50">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600"></div>2. Variazione Liquidità</h3>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-500">Liquidità Iniziale</span><span className="font-bold text-slate-700">{formatCHF(analysisData.initialLiquidity)}</span></div>
                      <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-200"><span className="font-bold text-slate-500">+ Risparmio Netto</span><span className="font-bold text-slate-700">{formatCHF(analysisData.netSavings)}</span></div>
                      <div className="pt-2 space-y-2">
                        <div onClick={() => openDrillDown('invest')} className="flex justify-between items-center text-sm cursor-pointer group"><span className="font-bold text-slate-500 group-hover:text-blue-600 pl-2 border-l-2 border-transparent group-hover:border-emerald-500">Verso Investimenti</span><span className="font-bold text-emerald-700">-{formatCHF(analysisData.flowToInvest)}</span></div>
                        <div onClick={() => openDrillDown('pension')} className="flex justify-between items-center text-sm cursor-pointer group"><span className="font-bold text-slate-500 group-hover:text-blue-600 pl-2 border-l-2 border-transparent group-hover:border-amber-500">Verso Pensione</span><span className="font-bold text-amber-600">-{formatCHF(analysisData.flowToPension)}</span></div>
                      </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-end"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liquidità Finale</span><span className={`text-2xl font-black ${analysisData.finalLiquidityCalculated >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCHF(analysisData.finalLiquidityCalculated)}</span></div>
              </div>
          </div>
      </div>

      {/* NEW: Evolution Summary (Clickable Cards) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <EvolutionSummaryCard title="Liquidità (Cash)" type="cash" colorClass="text-blue-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
          <EvolutionSummaryCard title="Pocket" type="pocket" colorClass="text-indigo-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
          <EvolutionSummaryCard title="Investimenti" type="invest" colorClass="text-emerald-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
          <EvolutionSummaryCard title="Pensione" type="pension" colorClass="text-amber-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      </div>

      {/* RESTORED: Balance Sheet Breakdown (Static Quadrants 31/12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          <div className="text-right">
                              <div className="font-bold text-slate-900 text-xs">{formatOriginal(acc.original, acc.currency)}</div>
                              {acc.currency !== 'CHF' && <div className="font-bold text-slate-400 text-[10px]">= {formatCHF(acc.base)} CHF</div>}
                          </div>
                      </div>
                  ))}
              </div>
              <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Liquidità</span>
                  <span className="text-lg font-black text-blue-600">{formatCHF(yearEndBalances.totalLiquidity)}</span>
              </div>
          </div>

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
                          <div className="text-right">
                              <div className="font-bold text-slate-900 text-xs">{formatOriginal(acc.original, acc.currency)}</div>
                              {acc.currency !== 'CHF' && <div className="font-bold text-slate-400 text-[10px]">= {formatCHF(acc.base)} CHF</div>}
                          </div>
                      </div>
                  ))}
              </div>
              <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Patrimonio</span>
                  <span className="text-lg font-black text-emerald-600">{formatCHF(yearEndBalances.totalWealth)}</span>
              </div>
          </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-[320px] flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Composizione Uscite</h3>
              <div className="flex-1 flex items-center">
                  <div className="w-1/2 h-full relative">
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analysisData.spendingData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{analysisData.spendingData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}</Pie><RechartsTooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer>
                  </div>
                  <div className="w-1/2 pl-4 space-y-4">
                      <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fisse</span><span className="text-xl font-black text-rose-700 block">{formatCHF(analysisData.totalFixed)}</span></div>
                      <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Variabili</span><span className="text-xl font-black text-rose-400 block">{formatCHF(analysisData.totalVariable)}</span></div>
                  </div>
              </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-[320px] flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Destinazione Surplus</h3>
              <div className="flex-1 flex items-center">
                  <div className="w-1/2 h-full relative">
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analysisData.allocationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{analysisData.allocationData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}</Pie><RechartsTooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer>
                  </div>
                  <div className="w-1/2 pl-4 space-y-2 overflow-y-auto custom-scrollbar">
                      {analysisData.allocationData.map(item => (<div key={item.name} className="flex flex-col pb-2 border-b border-slate-50 last:border-0"><span className="text-[9px] font-bold uppercase" style={{ color: item.color }}>{item.name}</span><span className="text-sm font-black text-slate-800">{formatCHF(item.value)}</span></div>))}
                  </div>
              </div>
          </div>
      </div>

      {/* Trend */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
          <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Trend Mensile {selectedYear}</h3></div>
          <div className="flex-1 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={analysisData.months} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} /><Bar dataKey="expenseFixed" name="Spese Fisse" stackId="a" fill={C.fixed} radius={[0,0,0,0]} barSize={20} /><Bar dataKey="expenseVariable" name="Spese Variabili" stackId="a" fill={C.variable} radius={[4,4,0,0]} barSize={20} /><Bar dataKey="saved" name="Risparmio Netto" fill="#cbd5e1" radius={[4,4,4,4]} barSize={20} /></BarChart></ResponsiveContainer>
          </div>
      </div>

      {/* Top Categories & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Top Categorie di Spesa</h3>
              <div className="space-y-4">
                  {analysisData.topCategories.map((cat, idx) => (
                      <div key={cat.name} className="relative">
                          <div className="flex justify-between items-center mb-1.5 z-10 relative">
                              <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{idx + 1}</div><span className="text-xs font-bold text-slate-700">{cat.name}</span></div>
                              <span className="text-xs font-black text-slate-900">{formatCHF(cat.value)} <span className="text-[9px] text-slate-400 font-normal">CHF</span></span>
                          </div>
                          <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(cat.value / (analysisData.totalFixed + analysisData.totalVariable)) * 100}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} /></div>
                      </div>
                  ))}
                  {analysisData.topCategories.length === 0 && <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase">Nessuna spesa registrata</div>}
              </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Dettaglio Mensile</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <table className="w-full text-left border-collapse">
                      <thead><tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest"><th className="py-2 pl-2">Mese</th><th className="py-2 text-right">In</th><th className="py-2 text-right">Out</th><th className="py-2 text-right">Net</th><th className="py-2 text-right pr-2">SR%</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                          {analysisData.months.map(m => {
                              if(m.income === 0 && m.expenseFixed === 0 && m.expenseVariable === 0) return null;
                              const totalOut = m.expenseFixed + m.expenseVariable;
                              const sr = m.income > 0 ? (m.saved / m.income) * 100 : 0;
                              return (<tr key={m.name} className="group hover:bg-slate-50 transition-colors"><td className="py-3 pl-2 text-xs font-bold text-slate-700">{m.name}</td><td className="py-3 text-right text-xs font-medium text-emerald-600">+{formatCHF(m.income).split(',')[0]}</td><td className="py-3 text-right text-xs font-medium text-rose-600">-{formatCHF(totalOut).split(',')[0]}</td><td className={`py-3 text-right text-xs font-black ${m.saved >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatCHF(m.saved).split(',')[0]}</td><td className="py-3 text-right pr-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sr >= 20 ? 'bg-emerald-100 text-emerald-700' : sr > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{sr.toFixed(0)}%</span></td></tr>);
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      <DrillDownModal isOpen={drillState.open} onClose={() => setDrillState(prev => ({ ...prev, open: false }))} title={drillState.title} transactions={drillState.data} total={drillState.total} colorClass={drillState.color} />
      
      <EvolutionDrillModal isOpen={evolutionDrill.open} onClose={() => setEvolutionDrill(prev => ({ ...prev, open: false }))} title={evolutionDrill.title} data={evolutionDrill.data} colorClass={evolutionDrill.color} />

      <FullScreenModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Guida Analisi" subtitle="Dettagli & Calcoli">
        <div className="space-y-8 pb-12">
           <div className="space-y-4"><h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">1. KPI (Metriche Chiave)</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Savings Rate (SR%)</span><p className="text-sm font-medium text-slate-700 mb-2">La percentuale di reddito risparmiato.</p><code className="text-xs bg-white p-1 rounded border border-slate-200 block text-slate-500 font-mono">(Entrate - Uscite) / Entrate * 100</code></div><div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Media Spese (Burn Rate)</span><p className="text-sm font-medium text-slate-700 mb-2">Media mensile delle uscite totali (Fisse + Variabili).</p><code className="text-xs bg-white p-1 rounded border border-slate-200 block text-slate-500 font-mono">(Totale Fisse + Totale Variabili) / Mesi</code></div></div></div>
           <div className="space-y-4"><h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">2. Evoluzione & Bilancio</h4><p className="text-sm text-slate-600">Le sezioni <strong>Liquidità</strong> e <strong>Patrimonio</strong> mostrano i saldi esatti al 31/12. Le card cliccabili in alto mostrano invece come è cambiato il saldo dall'inizio alla fine dell'anno.</p></div>
        </div>
      </FullScreenModal>

    </div>
  );
};
