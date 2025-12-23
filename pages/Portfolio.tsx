
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { Account, Transaction } from '../types';
import { FullScreenModal } from '../components/FullScreenModal';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { formatCurrency, fetchExchangeRate } from '../utils/helpers';

// --- TYPE DEFINITIONS ---
type PortfolioMetric = { 
  currentBalance: number; 
  invested: number; 
  pnl: number; 
  roi: number;
};

// --- CHART TOOLTIP ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
        <p className="text-xs font-bold text-slate-400 uppercase mb-2">{new Date(label).toLocaleDateString('it-IT')}</p>
        {payload.map((entry: any, index: number) => (
           <div key={index} className="text-xs font-bold flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
              <span className="text-slate-600">{entry.name}:</span>
              <span className="text-slate-900">{entry.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
           </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- MODALE AGGIORNAMENTO SALDO ---
interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, date: string, notes: string) => Promise<void>;
  account: Account | null;
  transactions: Transaction[];
}

const ReconcileModal: React.FC<ReconcileModalProps> = ({ isOpen, onClose, onSave, account, transactions }) => {
  const [realBalance, setRealBalance] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (isOpen) setRealBalance('');
  }, [isOpen]);

  // Calcolo dinamico del saldo alla data selezionata
  const balanceAtDate = useMemo(() => {
      if (!account || !date) return 0;
      
      return transactions
        .filter(t => t.occurred_on <= date) // Filtra solo transazioni avvenute entro la data selezionata
        .reduce((sum, t) => {
            const amount = t.amount_original || 0;
            if (t.kind === 'expense') return sum - Math.abs(amount);
            if (t.kind === 'income') return sum + Math.abs(amount);
            return sum + amount; // transfer, adjustment, etc.
        }, 0);
  }, [account, date, transactions]);

  if (!isOpen || !account) return null;

  const realBalNum = parseFloat(realBalance);
  // La differenza si basa sul saldo ALLA DATA selezionata, non ad oggi
  const diff = !isNaN(realBalNum) ? Math.round((realBalNum - balanceAtDate) * 100) / 100 : 0;
  const isGain = diff >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(realBalNum)) return;
    setLoading(true);
    try {
        await onSave(diff, date, `Allineamento valore di mercato (Retroattivo)`);
        onClose();
    } catch (e) { alert("Errore"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <div>
             <h2 className="text-lg font-black text-slate-900">Aggiorna Valore</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{account.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data Rilevazione</label>
              <input type="date" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={date} onChange={e => setDate(e.target.value)} />
           </div>

           <div className="space-y-1.5">
              <div className="flex justify-between px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valore Reale</label>
                  <span className="text-[10px] font-bold text-slate-400">
                      Saldo al {new Date(date).toLocaleDateString('it-IT')}: <span className="text-slate-700">{formatCurrency(balanceAtDate, account.currency_code)}</span>
                  </span>
              </div>
              <div className="relative">
                  <input 
                    type="number" step="0.01" required autoFocus
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-900 outline-none focus:border-blue-500 text-center"
                    value={realBalance}
                    onChange={e => setRealBalance(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{account.currency_code}</span>
              </div>
           </div>

           {realBalance && (
               <div className={`p-4 rounded-2xl border flex justify-between items-center ${isGain ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                   <span className="text-xs font-bold uppercase tracking-wide">Differenza P&L</span>
                   <span className="text-lg font-black">{isGain ? '+' : ''}{diff.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
           )}

           <button type="submit" disabled={loading || !realBalance} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-sm disabled:opacity-50">
               {loading ? '...' : 'Registra'}
           </button>
        </form>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export const Portfolio: React.FC = () => {
  const { accounts, transactions, addTransaction } = useFinance();
  const [reconcileModal, setReconcileModal] = useState<{ open: boolean; account: Account | null }>({ open: false, account: null });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // 1. Filtra Sicuro: Gestisce il caso in cui accounts sia undefined
  const { pensionAccounts, investAccounts } = useMemo(() => {
      if (!accounts) return { pensionAccounts: [], investAccounts: [] };
      return {
          pensionAccounts: accounts.filter(a => a.kind === 'pension' && a.status === 'active'),
          investAccounts: accounts.filter(a => a.kind === 'invest' && a.status === 'active')
      };
  }, [accounts]);

  // 2. Calcola Metriche per ogni conto
  const accountMetrics = useMemo(() => {
      const metrics: Record<string, PortfolioMetric> = {};

      // Combina tutti i conti di interesse
      [...pensionAccounts, ...investAccounts].forEach(acc => {
          const accTxs = transactions.filter(t => t.account_id === acc.id);
          
          let balance = 0;
          let invested = 0;

          accTxs.forEach(t => {
              const amount = t.amount_original || 0;
              
              if (t.kind === 'expense') {
                  balance -= Math.abs(amount);
                  invested -= Math.abs(amount);
              } else if (t.kind === 'income') {
                  balance += Math.abs(amount);
                  invested += Math.abs(amount);
              } else if (t.kind === 'transfer') {
                  balance += amount;
                  invested += amount;
              } else if (t.kind === 'adjustment') {
                  balance += amount;
                  // Invested doesn't change
              } else {
                  balance += amount;
                  invested += amount;
              }
          });

          const pnl = balance - invested;
          const roi = invested !== 0 ? (pnl / invested) * 100 : 0;

          metrics[acc.id] = { currentBalance: balance, invested, pnl, roi };
      });

      return metrics;
  }, [pensionAccounts, investAccounts, transactions]);

  // 3. Calcola Totali di Sezione
  const getSectionStats = (accs: Account[]) => {
      let totalValue = 0;
      let totalInvested = 0; 
      let totalPnL = 0;

      accs.forEach(a => {
          const m = accountMetrics[a.id] || { currentBalance: 0, invested: 0, pnl: 0, roi: 0 };
          totalValue += m.currentBalance;
          totalInvested += m.invested;
          totalPnL += m.pnl;
      });

      return { totalValue, totalPnL };
  };

  const pensionStats = useMemo(() => getSectionStats(pensionAccounts), [pensionAccounts, accountMetrics]);
  const investStats = useMemo(() => getSectionStats(investAccounts), [investAccounts, accountMetrics]);

  // 4. Dati per il dettaglio (Grafico e Storico)
  const selectedAccountData = useMemo(() => {
      if (!selectedAccountId) return null;
      const acc = accounts.find(a => a.id === selectedAccountId);
      if (!acc) return null;

      const txs = transactions
        .filter(t => t.account_id === acc.id)
        .sort((a,b) => new Date(a.occurred_on).getTime() - new Date(b.occurred_on).getTime());

      let runningBalance = 0;
      let runningInvested = 0;

      const chartData = txs.map(t => {
          const amount = t.amount_original || 0;
          
          if (t.kind === 'expense') {
             runningBalance -= Math.abs(amount);
             runningInvested -= Math.abs(amount);
          } else if (t.kind === 'income') {
             runningBalance += Math.abs(amount);
             runningInvested += Math.abs(amount);
          } else if (t.kind === 'adjustment') {
             runningBalance += amount;
          } else {
             runningBalance += amount;
             runningInvested += amount;
          }

          return {
              date: t.occurred_on,
              balance: runningBalance,
              invested: runningInvested,
              originalTx: t
          };
      });

      return { account: acc, history: chartData, transactions: [...txs].reverse() };
  }, [selectedAccountId, accounts, transactions]);


  const handleReconcile = async (amount: number, date: string, notes: string) => {
      if (!reconcileModal.account) return;
      
      const currency = reconcileModal.account.currency_code;
      let baseAmount = amount;

      // CALCOLO AMOUNT BASE CON API
      if (currency !== 'CHF') {
          const rate = await fetchExchangeRate(date, currency, 'CHF');
          baseAmount = amount * rate;
      }
      baseAmount = Math.round(baseAmount * 100) / 100;

      await addTransaction({
          account_id: reconcileModal.account.id,
          amount_original: amount,
          amount_base: baseAmount, // SALVIAMO IL CONTROVALORE CALCOLATO
          kind: 'adjustment',
          occurred_on: date,
          description: notes,
          category_id: null
      });
  };

  // --- COMPONENTI INTERNI PER LE DUE VISTE ---
  const renderDetailView = () => {
      if (!selectedAccountData) return null;
      const { account, history, transactions: txList } = selectedAccountData;
      const metrics = accountMetrics[account.id] || { currentBalance: 0, invested: 0, pnl: 0, roi: 0 };
      const isPositive = metrics.pnl >= 0;

      return (
        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
            {/* Header Dettaglio */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <button 
                    onClick={() => setSelectedAccountId(null)}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 truncate tracking-tight">{account.name}</h2>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{account.currency_code}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${account.kind === 'pension' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {account.kind === 'pension' ? 'Fondo Pensione' : 'Portafoglio'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm self-start md:self-auto">
                    <button 
                        onClick={() => setReconcileModal({ open: true, account })}
                        className="px-5 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wide hover:bg-blue-700 transition-all flex items-center space-x-2 shadow-lg shadow-blue-200"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span>Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* Note Account */}
            {account.note && (
                <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{account.note}</p>
                </div>
            )}

            {/* 4 KPI Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valore Attuale</span>
                    <div className="text-xl md:text-2xl font-black text-slate-900 mt-1 truncate">
                    {formatCurrency(metrics.currentBalance, account.currency_code)}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Versato</span>
                    <div className="text-xl md:text-2xl font-black text-slate-700 mt-1 truncate">
                    {formatCurrency(metrics.invested, account.currency_code)}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guadagno Netto</span>
                    <div className={`text-xl md:text-2xl font-black mt-1 truncate ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(metrics.pnl, account.currency_code)}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ROI Totale</span>
                    <div className={`text-xl md:text-2xl font-black mt-1 truncate ${metrics.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {metrics.roi > 0 ? '+' : ''}{metrics.roi.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* GRAFICO AREA CHART */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 h-[320px] w-full flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Analisi Performance</h3>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Versato</span></div>
                        <div className="flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Valore</span></div>
                    </div>
                </div>
                <div className="flex-1 w-full min-w-0">
                    {history.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => new Date(str).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })}
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} 
                                    dy={10} 
                                    minTickGap={30}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                    tickFormatter={(value) => `${value / 1000}k`} 
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="balance" 
                                    name="Valore"
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorValue)" 
                                />
                                <Area 
                                    type="stepAfter" 
                                    dataKey="invested" 
                                    name="Versato"
                                    stroke="#94a3b8" 
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorInvested)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">Dati insufficienti per il grafico</div>
                    )}
                </div>
            </div>

            {/* TABELLA STORICO */}
            <div className="bg-transparent md:bg-white md:rounded-[2rem] md:shadow-sm md:border md:border-slate-200 overflow-visible md:overflow-hidden relative z-10">
                <div className="px-2 md:px-8 py-3 md:py-5 md:bg-[#fcfdfe] md:border-b md:border-slate-100">
                    <h3 className="text-xs md:text-sm font-bold text-slate-500 md:text-slate-800 uppercase tracking-wide pl-2 md:pl-0 mb-2 md:mb-0">Storico Movimenti</h3>
                </div>
                
                {/* VISTA DESKTOP */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrizione</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Importo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {txList.map((tx) => {
                            const isAdj = tx.kind === 'adjustment';
                            const isPos = (tx.amount_original || 0) >= 0;
                            return (
                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                    {new Date(tx.occurred_on).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${isAdj ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                            {isAdj ? 'Rettifica Valore' : tx.kind === 'transfer' ? 'Versamento' : tx.kind}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">{tx.description || '-'}</td>
                                    <td className={`px-6 py-4 text-right text-sm font-black ${isAdj ? (isPos ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-900'}`}>
                                        {isPos ? '+' : ''}{formatCurrency(tx.amount_original || 0, account.currency_code)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>

                {/* VISTA MOBILE */}
                <div className="md:hidden space-y-2 p-0 pb-3">
                    {txList.map((tx) => {
                        const isAdj = tx.kind === 'adjustment';
                        const isPos = (tx.amount_original || 0) >= 0;
                        return (
                            <div key={tx.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-slate-600">
                                        {new Date(tx.occurred_on).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className={`text-sm font-black ${isAdj ? (isPos ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-900'}`}>
                                        {isPos ? '+' : ''}{formatCurrency(tx.amount_original || 0, account.currency_code)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className={`text-[10px] font-bold uppercase ${isAdj ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {isAdj ? 'Rettifica P&L' : tx.kind === 'transfer' ? 'Versamento' : tx.kind}
                                    </span>
                                    {tx.description && <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{tx.description}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      );
  };

  const renderListView = () => {
      // (Render logic identical to previous version, just needs re-inclusion for completeness)
      return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
           <div className="flex items-center gap-3 mb-2">
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Portfolio</h2>
               <button onClick={() => setIsInfoOpen(true)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </button>
          </div>
          <div className="h-2"></div>
    
          {/* SEZIONE 1: PREVIDENZA */}
          <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
               <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Previdenza & Pensione</h3>
                  </div>
               </div>
               {pensionAccounts.length > 0 && (
                 <div className="flex items-center space-x-6 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                    <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Attuale</span><span className="text-lg font-black text-slate-900">{formatCurrency(pensionStats.totalValue)} <span className="text-xs text-slate-400 font-bold">CHF</span></span></div>
                    <div className="hidden md:flex flex-col items-end border-l border-slate-100 pl-6"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guadagno Netto</span><span className={`text-lg font-black ${pensionStats.totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{pensionStats.totalPnL > 0 ? '+' : ''}{formatCurrency(pensionStats.totalPnL)}</span></div>
                 </div>
               )}
            </div>
            <div className="p-0">
                {pensionAccounts.length > 0 ? (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valore Attuale</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Investito</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Profitto</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ROI</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {pensionAccounts.map(acc => {
                                        const m = accountMetrics[acc.id] || { currentBalance: 0, invested: 0, pnl: 0, roi: 0 };
                                        return (<tr key={acc.id} onClick={() => setSelectedAccountId(acc.id)} className="group hover:bg-slate-50 cursor-pointer transition-colors"><td className="px-8 py-5"><div className="text-sm font-black text-slate-900">{acc.name}</div><span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">{acc.currency_code}</span></td><td className="px-8 py-5 text-right font-bold text-slate-900">{formatCurrency(m.currentBalance, acc.currency_code)}</td><td className="px-8 py-5 text-right text-xs font-mono text-slate-500">{formatCurrency(m.invested, acc.currency_code)}</td><td className={`px-8 py-5 text-right font-bold text-sm ${m.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.pnl > 0 ? '+' : ''}{formatCurrency(m.pnl, acc.currency_code)}</td><td className="px-8 py-5 text-right"><span className={`text-[10px] font-black px-2 py-1 rounded-lg ${m.roi >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{m.roi > 0 ? '+' : ''}{m.roi.toFixed(1)}%</span></td></tr>);
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden p-3 space-y-2">
                            {pensionAccounts.map(acc => {
                                const m = accountMetrics[acc.id];
                                return (<div key={acc.id} onClick={() => setSelectedAccountId(acc.id)} className="bg-white border border-slate-100 rounded-[1.2rem] shadow-sm p-4 active:scale-[0.98] transition-transform"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900">{acc.name}</span><span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{acc.currency_code}</span></div><div className="flex flex-col items-end"><span className="text-lg font-black text-slate-900">{formatCurrency(m.currentBalance, acc.currency_code)}</span></div></div><div className="pt-2 border-t border-slate-50 grid grid-cols-2 gap-4"><div><span className="text-[8px] font-bold text-slate-400 uppercase block">Investito</span><span className="text-xs font-mono font-medium text-slate-600">{formatCurrency(m.invested, acc.currency_code)}</span></div><div className="text-right"><span className="text-[8px] font-bold text-slate-400 uppercase block">ROI</span><span className={`text-xs font-black ${m.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.roi > 0 ? '+' : ''}{m.roi.toFixed(1)}%</span></div></div></div>);
                            })}
                        </div>
                    </>
                ) : (<div className="py-12 text-center text-slate-400 text-sm">Nessun fondo pensione trovato.</div>)}
            </div>
          </section>
    
          {/* SEZIONE 2: PORTAFOGLI PERSONALI */}
          <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
               <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Portafogli Personali</h3>
                  </div>
               </div>
               {investAccounts.length > 0 && (
                 <div className="flex items-center space-x-6 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                    <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Attuale</span><span className="text-lg font-black text-slate-900">{formatCurrency(investStats.totalValue)} <span className="text-xs text-slate-400 font-bold">CHF</span></span></div>
                    <div className="hidden md:flex flex-col items-end border-l border-slate-100 pl-6"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guadagno Netto</span><span className={`text-lg font-black ${investStats.totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{investStats.totalPnL > 0 ? '+' : ''}{formatCurrency(investStats.totalPnL)}</span></div>
                 </div>
               )}
            </div>
            <div className="p-0">
                {investAccounts.length > 0 ? (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valore Attuale</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Investito</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Profitto</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ROI</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {investAccounts.map(acc => {
                                        const m = accountMetrics[acc.id] || { currentBalance: 0, invested: 0, pnl: 0, roi: 0 };
                                        return (<tr key={acc.id} onClick={() => setSelectedAccountId(acc.id)} className="group hover:bg-slate-50 cursor-pointer transition-colors"><td className="px-8 py-5"><div className="text-sm font-black text-slate-900">{acc.name}</div><span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">{acc.currency_code}</span></td><td className="px-8 py-5 text-right font-bold text-slate-900">{formatCurrency(m.currentBalance, acc.currency_code)}</td><td className="px-8 py-5 text-right text-xs font-mono text-slate-500">{formatCurrency(m.invested, acc.currency_code)}</td><td className={`px-8 py-5 text-right font-bold text-sm ${m.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.pnl > 0 ? '+' : ''}{formatCurrency(m.pnl, acc.currency_code)}</td><td className="px-8 py-5 text-right"><span className={`text-[10px] font-black px-2 py-1 rounded-lg ${m.roi >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{m.roi > 0 ? '+' : ''}{m.roi.toFixed(1)}%</span></td></tr>);
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden p-3 space-y-2">
                            {investAccounts.map(acc => {
                                const m = accountMetrics[acc.id];
                                return (<div key={acc.id} onClick={() => setSelectedAccountId(acc.id)} className="bg-white border border-slate-100 rounded-[1.2rem] shadow-sm p-4 active:scale-[0.98] transition-transform"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900">{acc.name}</span><span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{acc.currency_code}</span></div><div className="flex flex-col items-end"><span className="text-lg font-black text-slate-900">{formatCurrency(m.currentBalance, acc.currency_code)}</span></div></div><div className="pt-2 border-t border-slate-50 grid grid-cols-2 gap-4"><div><span className="text-[8px] font-bold text-slate-400 uppercase block">Investito</span><span className="text-xs font-mono font-medium text-slate-600">{formatCurrency(m.invested, acc.currency_code)}</span></div><div className="text-right"><span className="text-[8px] font-bold text-slate-400 uppercase block">ROI</span><span className={`text-xs font-black ${m.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.roi > 0 ? '+' : ''}{m.roi.toFixed(1)}%</span></div></div></div>);
                            })}
                        </div>
                    </>
                ) : (<div className="py-12 text-center text-slate-400 text-sm">Nessun portafoglio personale trovato.</div>)}
            </div>
          </section>
        </div>
      );
  };

  return (
    <>
      {selectedAccountId ? renderDetailView() : renderListView()}

      <ReconcileModal 
        isOpen={reconcileModal.open} 
        onClose={() => setReconcileModal({ ...reconcileModal, open: false })}
        account={reconcileModal.account}
        onSave={handleReconcile}
        transactions={reconcileModal.account ? transactions.filter(t => t.account_id === reconcileModal.account?.id) : []}
      />

      <FullScreenModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Gestione Portfolio" subtitle="Help">
          <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      Gestisci i tuoi investimenti semplicemente tracciando i versamenti e aggiornando il valore di mercato quando vuoi.
                  </p>
              </div>
              <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Flusso di Lavoro</h4>
                  <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                          <div className="text-sm text-slate-600"><span className="font-bold text-slate-900 block mb-0.5">Versamento</span>Quando sposti soldi nel conto investimento (es. Bonifico), crea un normale <strong>Giroconto (Transfer)</strong> o una Spesa verso questo conto. Questo aumenta il "Capitale Investito".</div>
                      </li>
                      <li className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                          <div className="text-sm text-slate-600"><span className="font-bold text-slate-900 block mb-0.5">Aggiornamento Valore</span>Quando controlli il saldo reale (es. fine mese), clicca su <strong>Aggiorna</strong> nel dettaglio del conto e inserisci il valore totale che vedi. Il sistema calcolerà la differenza e creerà una transazione di "Rettifica" (Adjustment) che rappresenta il guadagno/perdita di mercato.</div>
                      </li>
                  </ul>
              </div>
          </div>
      </FullScreenModal>
    </>
  );
};
