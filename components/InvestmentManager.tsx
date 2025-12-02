
import React, { useState, useMemo } from 'react';
import { DbInvestment, DbInvestmentTrend } from '../types';
import { addInvestment, addInvestmentTrend, deleteInvestmentTrend, updateInvestment } from '../services/supabaseService';
import { TrendingUp, Plus, ShieldCheck, PieChart, Coins, X, Trash2, ArrowRight, Pencil } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { formatCurrency, MONTHS } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface InvestmentManagerProps {
  investments: DbInvestment[];
  trends: DbInvestmentTrend[];
}

interface ProcessedTrend extends DbInvestmentTrend {
  totalInvested: number;
  monthlyMaturity: number; // How much it grew/shrank this month excluding cashflow
  monthlyReturnPercent: number;
  totalReturnPercent: number;
}

export const InvestmentManager: React.FC<InvestmentManagerProps> = ({ investments, trends }) => {
  const [activeTab, setActiveTab] = useState<'RETIREMENT' | 'PERSONAL'>('RETIREMENT');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  
  // Create/Edit Investment Modal
  const [isInvFormOpen, setIsInvFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<DbInvestment | null>(null);

  const [newInvName, setNewInvName] = useState('');
  const [newInvCurrency, setNewInvCurrency] = useState('CHF');
  const [newInvNote, setNewInvNote] = useState('');
  const [newInvType, setNewInvType] = useState<'RETIREMENT' | 'PERSONAL'>('RETIREMENT');
  
  // Add Trend Modal
  const [isAddTrendOpen, setIsAddTrendOpen] = useState(false);
  const [trendInvId, setTrendInvId] = useState(''); // ID for the trend being added
  const [trendMonth, setTrendMonth] = useState(new Date().getMonth());
  const [trendYear, setTrendYear] = useState(new Date().getFullYear());
  const [trendValue, setTrendValue] = useState('');
  const [trendCashFlow, setTrendCashFlow] = useState('');

  // Delete State
  const [trendToDeleteId, setTrendToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Financial Logic Engine ---
  
  // Helper to process trends and calculate KPIs for a single investment
  const calculateFinancials = (invId: string, investmentTrends: DbInvestmentTrend[]): ProcessedTrend[] => {
    // 1. Sort trends by date ascending (oldest first) to calculate cumulative values
    const sorted = [...investmentTrends]
      .filter(t => t.investment_id === invId)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    let cumulativeInvested = 0;
    let previousValue = 0;

    return sorted.map(t => {
      // Totale Investito = Sum(CashFlow) up to now
      cumulativeInvested += t.cash_flow;

      // Maturato Mese = (Valore Attuale) - (Valore Precedente + Cash Flow Corrente)
      // Esempio: Avevo 100, ho messo 10 (Tot teorico 110), ora ho 115. Maturato = +5.
      const basis = previousValue + t.cash_flow;
      const monthlyMaturity = t.value - basis;

      // % Mese = Maturato / (Valore Precedente + Cash Flow Corrente)
      const monthlyReturnPercent = basis !== 0 ? (monthlyMaturity / basis) * 100 : 0;

      // % Totale (ROI) = (Valore Attuale - Totale Investito) / Totale Investito
      const totalReturnPercent = cumulativeInvested !== 0 
        ? ((t.value - cumulativeInvested) / cumulativeInvested) * 100 
        : 0;

      // Update prev value for next iteration
      previousValue = t.value;

      return {
        ...t,
        totalInvested: cumulativeInvested,
        monthlyMaturity,
        monthlyReturnPercent,
        totalReturnPercent
      };
    });
  };

  // Filter investments based on active tab
  const displayedInvestments = useMemo(() => {
    return investments.filter(inv => 
      activeTab === 'RETIREMENT' ? inv.is_for_retirement : !inv.is_for_retirement
    );
  }, [investments, activeTab]);

  // Derived state for the selected investment detail view
  const selectedInvestment = useMemo(() => {
    return investments.find(i => i.id === selectedInvestmentId);
  }, [investments, selectedInvestmentId]);

  const selectedInvestmentTrends = useMemo(() => {
    if (!selectedInvestmentId) return [];
    // Calculate stats and then reverse for display (Newest first)
    return calculateFinancials(selectedInvestmentId, trends).reverse();
  }, [selectedInvestmentId, trends]);


  // Actions

  const openCreateModal = () => {
    setEditingInvestment(null);
    setNewInvName('');
    setNewInvCurrency('CHF');
    setNewInvNote('');
    setNewInvType(activeTab); // Default to current tab
    setIsInvFormOpen(true);
  };

  const openEditModal = (inv: DbInvestment) => {
    setEditingInvestment(inv);
    setNewInvName(inv.name);
    setNewInvCurrency(inv.currency);
    setNewInvNote(inv.note || '');
    setNewInvType(inv.is_for_retirement ? 'RETIREMENT' : 'PERSONAL');
    setIsInvFormOpen(true);
  };

  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingInvestment) {
        // UPDATE
        await updateInvestment(editingInvestment.id, {
          name: newInvName,
          currency: newInvCurrency,
          is_for_retirement: newInvType === 'RETIREMENT',
          note: newInvNote
        });
      } else {
        // CREATE
        await addInvestment(newInvName, newInvCurrency, newInvType === 'RETIREMENT', newInvNote);
      }
      setIsInvFormOpen(false);
      setNewInvName('');
      setNewInvCurrency('CHF');
      setNewInvNote('');
      setEditingInvestment(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTrend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trendInvId || !trendValue || !trendCashFlow) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addInvestmentTrend(
        trendInvId, 
        trendMonth, 
        trendYear, 
        parseFloat(trendValue), 
        parseFloat(trendCashFlow)
      );
      setIsAddTrendOpen(false);
      setTrendValue('');
      setTrendCashFlow('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteTrend = async () => {
    if (!trendToDeleteId) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteInvestmentTrend(trendToDeleteId);
      setTrendToDeleteId(null);
    } catch (err: any) {
      setError("Errore eliminazione: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddTrendModal = (invId: string) => {
    setTrendInvId(invId);
    setIsAddTrendOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header & Tabs */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-lg">
           <TrendingUp className="text-indigo-600" /> Investimenti
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setActiveTab('RETIREMENT')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'RETIREMENT' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <ShieldCheck size={16} /> Pensione / Pilastri
           </button>
           <button 
             onClick={() => setActiveTab('PERSONAL')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'PERSONAL' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <PieChart size={16} /> Personali
           </button>
        </div>

        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} /> Nuovo Investimento
        </button>
      </div>

      {/* Investment List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedInvestments.length === 0 ? (
           <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
              <TrendingUp size={48} className="mb-2 opacity-20" />
              <p>Nessun investimento trovato in questa sezione.</p>
           </div>
        ) : (
          displayedInvestments.map(inv => {
            // Get pre-calculated latest trend
            const history = calculateFinancials(inv.id, trends);
            const latest = history[history.length - 1]; // Last item is latest

            return (
              <div 
                key={inv.id} 
                onClick={() => setSelectedInvestmentId(inv.id)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                   <div>
                      <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{inv.name}</h3>
                      {inv.note && <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">{inv.note}</p>}
                      <span className="inline-block bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-mono font-bold mt-2">
                        {inv.currency}
                      </span>
                   </div>
                   <div className="bg-indigo-50 p-2 rounded-full text-indigo-600">
                      {activeTab === 'RETIREMENT' ? <ShieldCheck size={20} /> : <PieChart size={20} />}
                   </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col justify-center items-center text-center">
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Valore Attuale</p>
                   {latest ? (
                     <>
                        <p className="text-3xl font-mono font-bold text-slate-800">
                           {formatCurrency(latest.value)}
                        </p>
                        <div className={`text-xs font-bold mt-2 px-2 py-1 rounded-full ${latest.totalReturnPercent >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                           ROI Totale: {latest.totalReturnPercent > 0 ? '+' : ''}{latest.totalReturnPercent.toFixed(2)}%
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                           Aggiornato: {MONTHS[latest.month]} {latest.year}
                        </p>
                     </>
                   ) : (
                     <p className="text-slate-300 italic text-sm">Nessun dato registrato</p>
                   )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
                   <button 
                     onClick={(e) => { e.stopPropagation(); openAddTrendModal(inv.id); }}
                     className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                   >
                     <Plus size={12} /> Aggiungi Dati Mensili
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- Detail Modal: History Table --- */}
      {selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
               {/* Detail Header */}
               <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
                   <div>
                       <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                          Investimento <ArrowRight size={12} /> {selectedInvestment.currency}
                       </div>
                       <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold text-slate-800">{selectedInvestment.name}</h2>
                          <button 
                            onClick={() => openEditModal(selectedInvestment)}
                            className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                            title="Modifica dettagli e note"
                          >
                             <Pencil size={16} />
                          </button>
                       </div>
                       {selectedInvestment.note && <p className="text-sm text-slate-500 mt-1 italic">{selectedInvestment.note}</p>}
                   </div>
                   <button onClick={() => setSelectedInvestmentId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                      <X size={24} className="text-slate-500" />
                   </button>
               </div>

               {/* Stats Summary Bar */}
               {selectedInvestmentTrends.length > 0 && (
                   <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border-b border-slate-100">
                       <div>
                           <div className="text-[10px] uppercase text-slate-400 font-bold">Valore Attuale</div>
                           <div className="font-mono text-lg font-bold text-slate-800">{formatCurrency(selectedInvestmentTrends[0].value)}</div>
                       </div>
                       <div>
                           <div className="text-[10px] uppercase text-slate-400 font-bold">Totale Versato</div>
                           <div className="font-mono text-lg font-bold text-slate-600">{formatCurrency(selectedInvestmentTrends[0].totalInvested)}</div>
                       </div>
                       <div>
                           <div className="text-[10px] uppercase text-slate-400 font-bold">Guadagno Netto</div>
                           <div className={`font-mono text-lg font-bold ${selectedInvestmentTrends[0].value - selectedInvestmentTrends[0].totalInvested >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                               {formatCurrency(selectedInvestmentTrends[0].value - selectedInvestmentTrends[0].totalInvested)}
                           </div>
                       </div>
                       <div>
                           <div className="text-[10px] uppercase text-slate-400 font-bold">ROI Totale</div>
                           <div className={`font-mono text-lg font-bold ${selectedInvestmentTrends[0].totalReturnPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                               {selectedInvestmentTrends[0].totalReturnPercent > 0 ? '+' : ''}{selectedInvestmentTrends[0].totalReturnPercent.toFixed(2)}%
                           </div>
                       </div>
                   </div>
               )}

               {/* Trends Table */}
               <div className="flex-1 overflow-auto custom-scrollbar p-0">
                   <table className="w-full text-left text-sm border-collapse">
                       <thead className="sticky top-0 bg-white z-10 shadow-sm text-xs font-bold text-slate-500 uppercase tracking-wider">
                           <tr>
                               <th className="px-6 py-3 bg-slate-50">Data</th>
                               <th className="px-6 py-3 bg-slate-50 text-right">Valore Totale</th>
                               <th className="px-6 py-3 bg-slate-50 text-right text-blue-600">Versato (Mese)</th>
                               <th className="px-6 py-3 bg-slate-50 text-right text-slate-400">Tot. Investito</th>
                               <th className="px-6 py-3 bg-slate-50 text-right">Maturato (Mese)</th>
                               <th className="px-6 py-3 bg-slate-50 text-right">% Mese</th>
                               <th className="px-6 py-3 bg-slate-50 text-right">% Totale</th>
                               <th className="px-6 py-3 bg-slate-50 text-center">Azioni</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {selectedInvestmentTrends.length === 0 ? (
                               <tr>
                                   <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                       Nessun dato storico disponibile. Aggiungi il primo mese.
                                   </td>
                               </tr>
                           ) : (
                               selectedInvestmentTrends.map((t) => (
                                   <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                       <td className="px-6 py-3 font-medium text-slate-700">
                                           {MONTHS[t.month]} {t.year}
                                       </td>
                                       <td className="px-6 py-3 text-right font-mono font-bold text-slate-800">
                                           {formatCurrency(t.value)}
                                       </td>
                                       <td className="px-6 py-3 text-right font-mono text-blue-600">
                                           {t.cash_flow !== 0 ? (t.cash_flow > 0 ? `+${formatCurrency(t.cash_flow)}` : formatCurrency(t.cash_flow)) : '-'}
                                       </td>
                                       <td className="px-6 py-3 text-right font-mono text-slate-400 text-xs">
                                           {formatCurrency(t.totalInvested)}
                                       </td>
                                       <td className={`px-6 py-3 text-right font-mono font-bold ${t.monthlyMaturity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                           {t.monthlyMaturity > 0 ? '+' : ''}{formatCurrency(t.monthlyMaturity)}
                                       </td>
                                       <td className={`px-6 py-3 text-right font-mono text-xs ${t.monthlyReturnPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                           {t.monthlyReturnPercent.toFixed(2)}%
                                       </td>
                                       <td className={`px-6 py-3 text-right font-mono font-bold ${t.totalReturnPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                           {t.totalReturnPercent.toFixed(2)}%
                                       </td>
                                       <td className="px-6 py-3 text-center">
                                           <button 
                                              onClick={() => setTrendToDeleteId(t.id)}
                                              className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                              title="Elimina record"
                                           >
                                               <Trash2 size={14} />
                                           </button>
                                       </td>
                                   </tr>
                               ))
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
        </div>
      )}

      {/* --- Modal: Add/Edit Investment --- */}
      {isInvFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800">
                    {editingInvestment ? 'Modifica Investimento' : 'Crea Nuovo Investimento'}
                 </h3>
                 <button onClick={() => setIsInvFormOpen(false)}><Plus size={20} className="rotate-45 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveInvestment} className="p-6 flex flex-col gap-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                    <input 
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newInvName} onChange={e => setNewInvName(e.target.value)} required
                      placeholder="Es. 3° Pilastro Generali"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Valuta</label>
                    <input 
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newInvCurrency} onChange={e => setNewInvCurrency(e.target.value.toUpperCase())} required
                      placeholder="CHF"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                    <div className="flex gap-2 mt-1">
                       <button 
                         type="button" 
                         onClick={() => setNewInvType('RETIREMENT')}
                         className={`flex-1 py-2 text-sm font-medium rounded-lg border ${newInvType === 'RETIREMENT' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                       >
                         Pensione
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setNewInvType('PERSONAL')}
                         className={`flex-1 py-2 text-sm font-medium rounded-lg border ${newInvType === 'PERSONAL' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                       >
                         Personale
                       </button>
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Note (Opzionale)</label>
                    <textarea 
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={newInvNote} onChange={e => setNewInvNote(e.target.value)}
                      placeholder="Dettagli aggiuntivi..."
                      rows={3}
                    />
                 </div>
                 <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold mt-2 hover:bg-slate-800 transition-colors">
                    {isSubmitting ? 'Salvataggio...' : (editingInvestment ? 'Aggiorna' : 'Crea Investimento')}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- Modal: Add Trend Data --- */}
      {isAddTrendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800">Aggiorna Dati Mensili</h3>
                 <button onClick={() => setIsAddTrendOpen(false)}><Plus size={20} className="rotate-45 text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddTrend} className="p-6 flex flex-col gap-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Mese</label>
                       <CustomSelect 
                          value={trendMonth} 
                          onChange={setTrendMonth} 
                          options={MONTHS.map((m, i) => ({ value: i, label: m }))} 
                        />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Anno</label>
                       <CustomSelect 
                          value={trendYear} 
                          onChange={setTrendYear} 
                          options={Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(y => ({ value: y, label: y.toString() }))} 
                        />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Valore Totale (A fine mese)</label>
                    <div className="relative mt-1">
                      <input 
                        type="number" step="0.01" required
                        className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={trendValue} onChange={e => setTrendValue(e.target.value)}
                        placeholder="0.00"
                      />
                      <Coins size={14} className="absolute right-3 top-3 text-slate-400" />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Cash Flow (Versamenti/Prelievi)</label>
                    <p className="text-[10px] text-slate-400 mb-1">Quanto hai versato (+) o prelevato (-) in questo mese</p>
                    <input 
                      type="number" step="0.01" required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={trendCashFlow} onChange={e => setTrendCashFlow(e.target.value)}
                      placeholder="0.00"
                    />
                 </div>

                 <button disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold mt-2 hover:bg-indigo-700">
                    {isSubmitting ? 'Salvataggio...' : 'Salva Dati'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- Confirm Modal --- */}
      <ConfirmModal 
        isOpen={!!trendToDeleteId}
        title="Elimina Record Storico"
        message="Sei sicuro di voler eliminare questo dato mensile? Il calcolo dei rendimenti verrà aggiornato."
        onConfirm={confirmDeleteTrend}
        onCancel={() => setTrendToDeleteId(null)}
        isProcessing={isDeleting}
      />

    </div>
  );
};
