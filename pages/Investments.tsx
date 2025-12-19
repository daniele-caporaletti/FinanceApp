
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFinance } from '../FinanceContext';
import { Investment, InvestmentTrend } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

interface ProcessedTrend extends InvestmentTrend {
  totalInvested: number;
  netGain: number;
  totalRoi: number;
  monthlyGain: number; // Maturato
  monthlyPercent: number;
}

// --- MODAL PER INVESTIMENTO (ANAGRAFICA) ---
interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (inv: Partial<Investment>) => Promise<void>;
  initialData?: Partial<Investment>;
}

const InvestmentModal: React.FC<InvestmentModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<Investment>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        name: '',
        currency: 'CHF',
        is_for_retirement: false,
        note: ''
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      alert("Errore durante il salvataggio.");
    } finally {
      setLoading(false);
    }
  };

  const currencyOptions = [
      { value: 'CHF', label: 'CHF' },
      { value: 'EUR', label: 'EUR' },
      { value: 'USD', label: 'USD' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {initialData?.id ? 'Modifica Investimento' : 'Nuovo Investimento'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestione Asset</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome Investimento</label>
            <input 
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
              placeholder="es. ETF World, Fondo Pensione..."
              value={formData.name || ''}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Valuta</label>
              <CustomSelect value={formData.currency} onChange={(val) => setFormData(f => ({ ...f, currency: val }))} options={currencyOptions} />
            </div>
            
            <div className="flex items-center">
               <div 
                 onClick={() => setFormData(f => ({ ...f, is_for_retirement: !f.is_for_retirement }))}
                 className={`w-full p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${formData.is_for_retirement ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
               >
                 <span className={`text-xs font-bold uppercase tracking-wider ${formData.is_for_retirement ? 'text-indigo-700' : 'text-slate-500'}`}>Fondo Pensione</span>
                 <div className={`w-10 h-5 rounded-full relative transition-all ${formData.is_for_retirement ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_for_retirement ? 'left-6' : 'left-1'}`}></div>
                 </div>
               </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Note</label>
            <textarea 
              rows={3}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 resize-none"
              placeholder="Dettagli aggiuntivi (es. ISIN, Strategia)..."
              value={formData.note || ''}
              onChange={e => setFormData(f => ({ ...f, note: e.target.value }))}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-[0.98] uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Salvataggio...' : initialData?.id ? 'Aggiorna Investimento' : 'Crea Investimento'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MODAL PER STORICO (Rilevazione) ---
interface TrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trend: Partial<InvestmentTrend>) => Promise<void>;
  initialData?: Partial<InvestmentTrend>;
  investmentId: string;
}

const TrendModal: React.FC<TrendModalProps> = ({ isOpen, onClose, onSave, initialData, investmentId }) => {
  const [formData, setFormData] = useState<Partial<InvestmentTrend>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        investment_id: investmentId,
        value_on: new Date().toISOString().split('T')[0],
        value_original: undefined,
        cash_flow: undefined
      });
    }
  }, [isOpen, initialData, investmentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...formData, investment_id: investmentId, value_original: formData.value_original || 0, cash_flow: formData.cash_flow || 0 });
      onClose();
    } catch (err) {
      alert("Errore salvataggio rilevazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {initialData?.id ? 'Modifica Rilevazione' : 'Nuova Rilevazione'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Aggiornamento Valori</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data Rilevazione</label>
            <input 
              type="date"
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
              value={formData.value_on ? formData.value_on.split('T')[0] : ''}
              onChange={e => setFormData(f => ({ ...f, value_on: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Valore Totale Attuale</label>
            <input 
              type="number"
              step="0.01"
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.00"
              value={formData.value_original ?? ''}
              onChange={e => setFormData(f => ({ ...f, value_original: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
            />
            <p className="text-[10px] text-slate-400 px-1">Inserisci il valore totale di mercato dell'investimento a questa data.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Cash Flow (Versamenti)</label>
            <input 
              type="number"
              step="0.01"
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.00"
              value={formData.cash_flow ?? ''}
              onChange={e => setFormData(f => ({ ...f, cash_flow: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
            />
             <p className="text-[10px] text-slate-400 px-1">Inserisci quanto hai versato (+) o prelevato (-) in questo specifico mese/periodo.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-[0.98] uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Salvataggio...' : 'Salva Rilevazione'}
          </button>
        </form>
      </div>
    </div>
  );
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

// --- HELPER FUNCTION: Get stats for an investment ---
const getInvestmentStats = (trends: InvestmentTrend[], invId: string) => {
    const relatedTrends = trends.filter(t => t.investment_id === invId);
    if (relatedTrends.length === 0) return null;

    const sortedTrends = relatedTrends.sort((a,b) => new Date(a.value_on).getTime() - new Date(b.value_on).getTime());
    const latest = sortedTrends[sortedTrends.length - 1];
    const totalInvested = sortedTrends.reduce((sum, t) => sum + (t.cash_flow || 0), 0);
    const netGain = (latest.value_original || 0) - totalInvested;
    const roi = totalInvested !== 0 ? (netGain / totalInvested) * 100 : 0;

    return {
      latestValue: latest.value_original,
      lastDate: latest.value_on,
      totalInvested,
      netGain,
      roi
    };
};

export const Investments: React.FC = () => {
  const { 
    investments, 
    investmentTrends, 
    addInvestment, updateInvestment, deleteInvestment,
    addTrend, updateTrend, deleteTrend
  } = useFinance();
  
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<Investment> }>({ open: false });
  const [trendModal, setTrendModal] = useState<{ open: boolean; initialData?: Partial<InvestmentTrend> }>({ open: false });
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item?: Investment; isTrend?: boolean; trendId?: string }>({ open: false });

  // Tassi di cambio per il calcolo totale
  const [rates, setRates] = useState<Record<string, number>>({ CHF: 1, EUR: 1, USD: 1 });

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
      } catch (error) { console.error("Rate fetch error", error); }
    };
    fetchRates();
  }, []);

  const { retirement, personal } = useMemo(() => {
    return {
      retirement: investments.filter(i => i.is_for_retirement),
      personal: investments.filter(i => !i.is_for_retirement)
    };
  }, [investments]);

  const calculateGroupStats = useCallback((groupInvestments: Investment[]) => {
    let totalValue = 0;
    let totalInvested = 0;

    groupInvestments.forEach(inv => {
      const stats = getInvestmentStats(investmentTrends, inv.id);
      if (stats) {
        const rate = rates[inv.currency] || 1;
        totalValue += (stats.latestValue || 0) * rate;
        totalInvested += stats.totalInvested * rate;
      }
    });

    const netGain = totalValue - totalInvested;
    const roi = totalInvested !== 0 ? (netGain / totalInvested) * 100 : 0;

    return { totalValue, totalInvested, netGain, roi };
  }, [investmentTrends, rates]); // Added rates dependency

  const retirementStats = useMemo(() => calculateGroupStats(retirement), [retirement, calculateGroupStats]);
  const personalStats = useMemo(() => calculateGroupStats(personal), [personal, calculateGroupStats]);

  const processedTrends = useMemo(() => {
    if (!selectedInvestmentId) return [];
    
    const trendsAscending = investmentTrends
      .filter(t => t.investment_id === selectedInvestmentId)
      .sort((a, b) => new Date(a.value_on).getTime() - new Date(b.value_on).getTime());

    let runningTotalInvested = 0;
    
    const calculated = trendsAscending.map((trend, index) => {
      const currentCashFlow = trend.cash_flow ?? 0;
      const currentMarketValue = trend.value_original ?? 0;

      runningTotalInvested += currentCashFlow;
      const netGain = currentMarketValue - runningTotalInvested;
      const totalRoi = runningTotalInvested !== 0 ? (netGain / runningTotalInvested) * 100 : 0;

      const prevMarketValue = index > 0 ? (trendsAscending[index - 1].value_original ?? 0) : 0;
      
      let monthlyGain = 0;
      if (index === 0) {
        monthlyGain = currentMarketValue - currentCashFlow;
      } else {
        monthlyGain = currentMarketValue - (prevMarketValue + currentCashFlow);
      }

      const baseForMonthly = prevMarketValue > 0 ? prevMarketValue : currentCashFlow;
      const monthlyPercent = baseForMonthly !== 0 ? (monthlyGain / baseForMonthly) * 100 : 0;

      return {
        ...trend,
        totalInvested: runningTotalInvested,
        netGain,
        totalRoi,
        monthlyGain,
        monthlyPercent
      } as ProcessedTrend;
    });

    return calculated.reverse();
  }, [selectedInvestmentId, investmentTrends]);

  const chartData = useMemo(() => [...processedTrends].reverse(), [processedTrends]);

  const selectedInvestment = useMemo(() => 
    investments.find(i => i.id === selectedInvestmentId), 
  [selectedInvestmentId, investments]);

  const handleSaveInvestment = async (payload: Partial<Investment>) => {
    if (payload.id) {
      await updateInvestment(payload.id, payload);
    } else {
      await addInvestment(payload);
    }
  };

  const handleSaveTrend = async (payload: Partial<InvestmentTrend>) => {
    if (payload.id) {
      await updateTrend(payload.id, payload);
    } else {
      await addTrend(payload);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.isTrend && deleteDialog.trendId) {
      await deleteTrend(deleteDialog.trendId);
    } else if (deleteDialog.item) {
      await deleteInvestment(deleteDialog.item.id);
      if (selectedInvestmentId === deleteDialog.item.id) {
        setSelectedInvestmentId(null);
      }
    }
    setDeleteDialog({ open: false });
  };

  // --- VISTA DETTAGLIO ---
  if (selectedInvestment && selectedInvestmentId) {
    const latest = processedTrends[0] || { 
      value_original: 0, 
      totalInvested: 0, 
      netGain: 0, 
      totalRoi: 0 
    };
    
    return (
      <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
        {/* Header Dettaglio */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSelectedInvestmentId(null)}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 truncate tracking-tight">{selectedInvestment.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedInvestment.currency}</span>
                {selectedInvestment.is_for_retirement && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded">Previdenza</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm self-start md:self-auto">
             <button 
                onClick={() => setTrendModal({ open: true })}
                className="px-5 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wide hover:bg-blue-700 transition-all flex items-center space-x-2 shadow-lg shadow-blue-200"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
               <span>Rilevazione</span>
             </button>
             <button 
                onClick={() => setModalState({ open: true, initialData: selectedInvestment })}
                className="p-3 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
          </div>
        </div>

        {/* Info / Note Section (New) */}
        {selectedInvestment.note && (
            <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedInvestment.note}</p>
            </div>
        )}

        {/* 4 KPI Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valore Attuale</span>
            <div className="text-xl md:text-2xl font-black text-slate-900 mt-1 truncate">
              {(latest.value_original ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Versato</span>
            <div className="text-xl md:text-2xl font-black text-slate-700 mt-1 truncate">
              {(latest.totalInvested ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guadagno Netto</span>
            <div className={`text-xl md:text-2xl font-black mt-1 truncate ${latest.netGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {latest.netGain > 0 ? '+' : ''}{(latest.netGain ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ROI Totale</span>
            <div className={`text-xl md:text-2xl font-black mt-1 truncate ${latest.totalRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {latest.totalRoi > 0 ? '+' : ''}{(latest.totalRoi ?? 0).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* GRAFICO AREA CHART */}
        {chartData.length > 1 && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 h-[320px] w-full flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Analisi Performance</h3>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Versato</span></div>
                        <div className="flex items-center space-x-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Valore</span></div>
                    </div>
                </div>
                <div className="flex-1 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                                dataKey="value_on" 
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
                                dataKey="value_original" 
                                name="Valore"
                                stroke="#10b981" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                            />
                            <Area 
                                type="stepAfter" 
                                dataKey="totalInvested" 
                                name="Versato"
                                stroke="#94a3b8" 
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorInvested)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        {/* TABELLA STORICO */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-[#fcfdfe] border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Storico Dati</h3>
          </div>
          
          {/* VISTA DESKTOP */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valore Totale</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Versato (Mese)</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">TOT. Investito</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Maturato (Mese)</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">ROI Totale</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {processedTrends.map((trend) => (
                  <tr key={trend.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {new Date(trend.value_on).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                      {(trend.value_original ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-4 text-right text-xs font-mono font-bold ${trend.cash_flow > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {trend.cash_flow > 0 ? '+' : ''}{(trend.cash_flow ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-mono text-slate-500">
                      {(trend.totalInvested ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-4 text-right text-xs font-bold ${trend.monthlyGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {trend.monthlyGain > 0 ? '+' : ''}{(trend.monthlyGain ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-black ${trend.totalRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {trend.totalRoi > 0 ? '+' : ''}{(trend.totalRoi ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button 
                        onClick={() => setTrendModal({ open: true, initialData: trend })}
                        className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Modifica"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => setDeleteDialog({ open: true, item: selectedInvestment, isTrend: true, trendId: trend.id })}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Elimina"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VISTA MOBILE */}
          <div className="md:hidden">
             {processedTrends.map((trend) => (
                <div key={trend.id} className="p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                       <span className="text-sm font-bold text-slate-700 capitalize">
                           {new Date(trend.value_on).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                       </span>
                       <span className="text-base font-black text-slate-900">
                           {(trend.value_original ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                       </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 text-xs">
                       <div className="flex flex-col">
                           <span className="text-[10px] text-slate-400 font-bold uppercase">Cashflow Mese</span>
                           <span className={`font-mono font-medium ${trend.cash_flow > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                               {trend.cash_flow > 0 ? '+' : ''}{(trend.cash_flow ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                           </span>
                       </div>
                       <div className="flex flex-col text-right">
                           <span className="text-[10px] text-slate-400 font-bold uppercase">ROI Totale</span>
                           <span className={`font-black ${trend.totalRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                               {trend.totalRoi > 0 ? '+' : ''}{(trend.totalRoi ?? 0).toFixed(2)}%
                           </span>
                       </div>
                   </div>

                   <div className="flex items-center justify-end space-x-4 mt-3 pt-3 border-t border-slate-50/50">
                       <button 
                          onClick={() => setTrendModal({ open: true, initialData: trend })}
                          className="text-xs font-bold text-blue-600 uppercase tracking-wide px-2 py-1 bg-blue-50 rounded"
                        >
                          Modifica
                        </button>
                       <button 
                          onClick={() => setDeleteDialog({ open: true, item: selectedInvestment, isTrend: true, trendId: trend.id })}
                          className="text-xs font-bold text-rose-400 uppercase tracking-wide"
                        >
                          Elimina
                        </button>
                   </div>
                </div>
             ))}
          </div>

        </div>
        
        <InvestmentModal 
          isOpen={modalState.open} 
          onClose={() => setModalState({ open: false })}
          onSave={handleSaveInvestment}
          initialData={modalState.initialData}
        />

        <TrendModal 
          isOpen={trendModal.open}
          onClose={() => setTrendModal({ open: false })}
          onSave={handleSaveTrend}
          initialData={trendModal.initialData}
          investmentId={selectedInvestment.id}
        />
        
        <ConfirmModal 
          isOpen={deleteDialog.open} 
          onClose={() => setDeleteDialog({ open: false })} 
          onConfirm={handleConfirmDelete}
          title="Elimina Elemento"
          message={
              <>
                  Stai per eliminare <span className="font-bold text-slate-800">"{deleteDialog.item?.name}"</span>.<br/>
                  {deleteDialog.isTrend ? 'Eliminare questa rilevazione cambierà i calcoli dei periodi successivi.' : 'Questa azione è irreversibile.'}
              </>
          }
          confirmText="Elimina Definitivamente"
          isDangerous={true}
        />
      </div>
    );
  }

  // --- VISTA LISTA PRINCIPALE (MODIFICATA: LISTA INVECE DI CARD) ---
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
           <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Investimenti</h2>
           <button 
              onClick={() => setIsInfoOpen(true)}
              className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
           >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </button>
      </div>

      <div className="h-2"></div>

      {/* Sezione Fondi Pensione */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
           <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Previdenza & Pensione</h3>
              </div>
              <button 
                onClick={() => setModalState({ open: true, initialData: { is_for_retirement: true, currency: 'CHF' } })}
                className="self-start sm:self-auto px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-wide hover:bg-indigo-100 transition-all flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span>Nuovo</span>
              </button>
           </div>
           
           {retirement.length > 0 && (
             <div className="flex items-center space-x-6 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Attuale</span>
                  <span className="text-lg font-black text-slate-900">{retirementStats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-bold">CHF</span></span>
                </div>
                <div className="hidden md:flex flex-col items-end border-l border-slate-100 pl-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guadagno Netto</span>
                  <span className={`text-lg font-black ${retirementStats.netGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {retirementStats.netGain > 0 ? '+' : ''}{retirementStats.netGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
             </div>
           )}
        </div>
        
        {/* TABELLA/LISTA INVESTIMENTI RETIREMENT */}
        <div className="p-0">
            {retirement.length > 0 ? (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valore Attuale</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Investito</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Profitto</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ROI</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {retirement.map(inv => {
                                    const stats = getInvestmentStats(investmentTrends, inv.id) || { latestValue: 0, totalInvested: 0, netGain: 0, roi: 0 };
                                    return (
                                        <tr key={inv.id} onClick={() => setSelectedInvestmentId(inv.id)} className="group hover:bg-slate-50 cursor-pointer transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-black text-slate-900">{inv.name}</div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">{inv.currency}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right font-bold text-slate-900">
                                                {stats.latestValue?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400 font-normal">{inv.currency}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right text-xs font-mono text-slate-500">
                                                {stats.totalInvested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className={`px-8 py-5 text-right font-bold text-sm ${stats.netGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {stats.netGain > 0 ? '+' : ''}{stats.netGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stats.roi >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right space-x-1">
                                                <button onClick={(e) => { e.stopPropagation(); setModalState({ open: true, initialData: inv }); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, item: inv, isTrend: false }); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {retirement.map(inv => {
                            const stats = getInvestmentStats(investmentTrends, inv.id) || { latestValue: 0, totalInvested: 0, netGain: 0, roi: 0 };
                            return (
                                <div key={inv.id} onClick={() => setSelectedInvestmentId(inv.id)} className="p-5 active:bg-slate-50 transition-colors flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-1">{inv.name}</h4>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase">
                                            Investito: {stats.totalInvested.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {inv.currency}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-900 text-lg">
                                            {stats.latestValue?.toLocaleString('it-IT', { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-400 font-medium">{inv.currency}</span>
                                        </div>
                                        <div className={`text-[10px] font-bold mt-0.5 ${stats.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(1)}% ROI
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="py-12 text-center text-slate-400 text-sm">Nessun fondo pensione configurato.</div>
            )}
        </div>
      </section>

      {/* Sezione Investimenti Personali */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
           <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Portafogli Personali</h3>
              </div>
              <button 
                onClick={() => setModalState({ open: true, initialData: { is_for_retirement: false, currency: 'CHF' } })}
                className="self-start sm:self-auto px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wide hover:bg-emerald-100 transition-all flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span>Nuovo</span>
              </button>
           </div>
           
           {personal.length > 0 && (
             <div className="flex items-center space-x-6 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Attuale</span>
                  <span className="text-lg font-black text-slate-900">{personalStats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-bold">CHF</span></span>
                </div>
                <div className="hidden md:flex flex-col items-end border-l border-slate-100 pl-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guadagno Netto</span>
                  <span className={`text-lg font-black ${personalStats.netGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {personalStats.netGain > 0 ? '+' : ''}{personalStats.netGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
             </div>
           )}
        </div>

        {/* TABELLA/LISTA INVESTIMENTI PERSONALI */}
        <div className="p-0">
            {personal.length > 0 ? (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valore Attuale</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Investito</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Profitto</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ROI</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {personal.map(inv => {
                                    const stats = getInvestmentStats(investmentTrends, inv.id) || { latestValue: 0, totalInvested: 0, netGain: 0, roi: 0 };
                                    return (
                                        <tr key={inv.id} onClick={() => setSelectedInvestmentId(inv.id)} className="group hover:bg-slate-50 cursor-pointer transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-black text-slate-900">{inv.name}</div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">{inv.currency}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right font-bold text-slate-900">
                                                {stats.latestValue?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400 font-normal">{inv.currency}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right text-xs font-mono text-slate-500">
                                                {stats.totalInvested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className={`px-8 py-5 text-right font-bold text-sm ${stats.netGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {stats.netGain > 0 ? '+' : ''}{stats.netGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stats.roi >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right space-x-1">
                                                <button onClick={(e) => { e.stopPropagation(); setModalState({ open: true, initialData: inv }); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, item: inv, isTrend: false }); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {personal.map(inv => {
                            const stats = getInvestmentStats(investmentTrends, inv.id) || { latestValue: 0, totalInvested: 0, netGain: 0, roi: 0 };
                            return (
                                <div key={inv.id} onClick={() => setSelectedInvestmentId(inv.id)} className="p-5 active:bg-slate-50 transition-colors flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-1">{inv.name}</h4>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase">
                                            Investito: {stats.totalInvested.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {inv.currency}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-900 text-lg">
                                            {stats.latestValue?.toLocaleString('it-IT', { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-400 font-medium">{inv.currency}</span>
                                        </div>
                                        <div className={`text-[10px] font-bold mt-0.5 ${stats.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(1)}% ROI
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="py-12 text-center text-slate-400 text-sm">Nessun investimento personale configurato.</div>
            )}
        </div>
      </section>

      {/* Modals placed at the end */}
      <InvestmentModal 
        isOpen={modalState.open} 
        onClose={() => setModalState({ open: false })}
        onSave={handleSaveInvestment}
        initialData={modalState.initialData}
      />
      
      <ConfirmModal 
        isOpen={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false })} 
        onConfirm={handleConfirmDelete}
        title="Elimina Elemento"
        message={
            <>
                Stai per eliminare <span className="font-bold text-slate-800">"{deleteDialog.item?.name}"</span>.<br/>
                Questa azione è irreversibile.
            </>
        }
        confirmText="Elimina Definitivamente"
        isDangerous={true}
      />

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Guida Investimenti"
        subtitle="Help"
      >
        <div className="space-y-8">
           <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
               <p className="text-sm text-emerald-800 leading-relaxed font-medium">
                  Questa sezione ti permette di monitorare l'andamento dei tuoi asset finanziari (ETF, Azioni, Fondi, Cripto) tracciando manualmente il loro valore nel tempo.
               </p>
           </div>
           
           <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Come Funziona</h4>
              <div className="space-y-4">
                 <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                    <div className="text-sm text-slate-600">
                       <span className="font-bold text-slate-900 block mb-0.5">Crea l'Investimento</span>
                       Definisci il nome (es. "VWCE ETF") e la valuta base. Puoi segnarlo come "Fondo Pensione" per separarlo dai tuoi investimenti liquidi.
                    </div>
                 </div>
                 <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                    <div className="text-sm text-slate-600">
                       <span className="font-bold text-slate-900 block mb-0.5">Aggiungi Rilevazioni (Update)</span>
                       Periodicamente (es. ogni mese), clicca sulla riga dell'investimento e aggiungi una nuova "Rilevazione". Inserisci il <span className="font-bold">Valore Totale Attuale</span> del portafoglio e il <span className="font-bold">Cash Flow</span> (quanto hai versato di tasca tua in quel periodo).
                    </div>
                 </div>
              </div>
           </div>

           <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Formule Finanziarie</h4>
              <div className="grid gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase">Guadagno Netto</span>
                    <div className="text-sm font-medium text-slate-800 mt-1">
                       = (Valore Attuale) - (Totale Versato)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Indica quanto hai guadagnato in valore assoluto.</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase">ROI Totale (Return on Investment)</span>
                    <div className="text-sm font-medium text-slate-800 mt-1">
                       = (Guadagno Netto / Totale Versato) * 100
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">La percentuale di rendimento complessiva dall'inizio dell'investimento.</p>
                 </div>
              </div>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};
