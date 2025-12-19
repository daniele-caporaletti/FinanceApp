
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { EssentialTransaction, Category, Account, Transaction } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';
import { TransactionModal } from './Transactions';

// Helper per gestire le date come stringhe YYYY-MM-DD senza offset timezone
const getSafeDateString = (year: number, monthIndex: number, day: number) => {
    const date = new Date(year, monthIndex, 1);
    const maxDay = new Date(year, monthIndex + 1, 0).getDate();
    const safeDay = Math.min(day, maxDay);
    
    const m = String(monthIndex + 1).padStart(2, '0');
    const d = String(safeDay).padStart(2, '0');
    return `${year}-${m}-${d}`;
};

interface EssentialExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rec: Partial<EssentialTransaction>) => Promise<void>;
  initialData?: Partial<EssentialTransaction>;
  categories: Category[];
}

const EssentialExpenseModal: React.FC<EssentialExpenseModalProps> = ({ isOpen, onClose, onSave, initialData, categories }) => {
  const [formData, setFormData] = useState<Partial<EssentialTransaction>>({});
  const [loading, setLoading] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        name: '',
        occurred_on: new Date().toISOString().split('T')[0],
        kind: 'essential',
        amount_original: undefined,
        currency_original: 'CHF',
        category_id: null,
        is_active: true,
        description: '' // Note
      });
      if (initialData?.category_id) {
        const currentCat = categories.find(c => c.id === initialData.category_id);
        if (currentCat) {
            setSelectedParentId(currentCat.parent_id || currentCat.id);
        }
      } else {
        setSelectedParentId('');
      }
    }
  }, [isOpen, initialData, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...formData, amount_original: formData.amount_original || 0 });
      onClose();
    } catch (err) { alert("Errore durante il salvataggio."); } finally { setLoading(false); }
  };

  const mainCategories = categories.filter(c => !c.parent_id).sort((a,b) => a.name.localeCompare(b.name));
  const mainCategoryOptions = mainCategories.map(c => ({ value: c.id, label: c.name }));

  const subCategories = selectedParentId ? categories.filter(c => c.parent_id === selectedParentId).sort((a,b) => a.name.localeCompare(b.name)) : [];
  const subCategoryOptions = [
      { value: selectedParentId, label: 'Generica' },
      ...subCategories.map(s => ({ value: s.id, label: s.name }))
  ];

  const typeOptions = [
    { value: 'essential', label: 'Essential' },
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
    { value: 'transfer', label: 'Giroconto' }
  ];

  const currencyOptions = [
      { value: 'CHF', label: 'CHF' },
      { value: 'EUR', label: 'EUR' },
      { value: 'USD', label: 'USD' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">{initialData?.id ? 'Modifica Regola' : 'Nuova Voce'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Budget Lifestyle</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome Spesa</label><input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="es. Affitto, Netflix..." value={formData.name || ''} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Giorno Previsto</label><input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.occurred_on?.split('T')[0] || ''} onChange={e => setFormData(f => ({ ...f, occurred_on: e.target.value }))} /><p className="text-[9px] text-slate-400 px-1">La data determina in quale mese/anno apparirà il pallino.</p></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tipo</label><CustomSelect value={formData.kind} onChange={(val) => setFormData(f => ({ ...f, kind: val }))} options={typeOptions} /></div>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
             <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Importo Previsto</label>
                <input 
                    type="number" 
                    step="0.01" 
                    required 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    placeholder="0.00"
                    value={formData.amount_original ?? ''} 
                    onChange={e => setFormData(f => ({ ...f, amount_original: e.target.value === '' ? undefined : parseFloat(e.target.value) }))} 
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Valuta</label>
                <CustomSelect value={formData.currency_original || 'CHF'} onChange={(val) => setFormData(f => ({ ...f, currency_original: val }))} options={currencyOptions} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Categoria</label><CustomSelect value={selectedParentId} onChange={(val) => { setSelectedParentId(val); setFormData(f => ({ ...f, category_id: val || null })); }} options={[{value: '', label: 'Seleziona...'}, ...mainCategoryOptions]} /></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Sottocategoria</label><CustomSelect value={formData.category_id} onChange={(val) => setFormData(f => ({ ...f, category_id: val }))} options={subCategoryOptions} disabled={!selectedParentId} /></div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Note (Descrizione Movimento)</label>
            <textarea 
                rows={2} 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 resize-none" 
                placeholder="es. Scade il 15, Addebito automatico..." 
                value={formData.description || ''} 
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} 
            />
            <p className="text-[9px] text-slate-400 px-1">Questo testo sarà precompilato nel campo 'Descrizione' quando paghi.</p>
          </div>
          
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 cursor-pointer" onClick={() => setFormData(f => ({ ...f, is_active: !f.is_active }))}>
             <div className={`w-10 h-5 rounded-full relative transition-all ${formData.is_active ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_active ? 'left-6' : 'left-1'}`}></div>
             </div>
             <span className="text-xs font-bold text-slate-700">Voce Attiva</span>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''}`}>{loading ? '...' : 'Salva Voce'}</button>
        </form>
      </div>
    </div>
  );
};

export const Recurrences: React.FC = () => {
  const { essentialTransactions, transactions, accounts, categories, addEssential, updateEssential, deleteEssential, addTransaction, updateTransaction } = useFinance();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<EssentialTransaction> }>({ open: false });
  const [payModal, setPayModal] = useState<{ open: boolean; initialData?: Partial<Transaction>; isEdit?: boolean }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; rec?: EssentialTransaction }>({ open: false });
  const [isInfoOpen, setIsInfoOpen] = useState(false);

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

  // 1. Group EssentialTransactions by Name
  const uniqueNames = useMemo(() => {
      const names = new Set<string>();
      essentialTransactions.forEach(t => {
          const [tYear] = t.occurred_on.split('-').map(Number);
          if (tYear === selectedYear) {
              names.add(t.name);
          }
      });
      return Array.from(names).sort();
  }, [essentialTransactions, selectedYear]);

  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  // Helper: Find specific EssentialTransaction for a cell (Name + Month + Year)
  const getEssentialForCell = (name: string, monthIdx: number, year: number) => {
      return essentialTransactions.find(t => {
          const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
          return t.name === name && tYear === year && (tMonth - 1) === monthIdx;
      });
  };

  // Helper: Find Payment Transaction for a specific EssentialTransaction ID
  const getPaymentForEssential = (essentialId: string) => {
      return transactions.find(t => t.essential_transaction_id === essentialId);
  };

  const yearlyStats = useMemo(() => {
    let totalProjected = 0;
    let totalPaid = 0;
    
    essentialTransactions.forEach(rec => {
        const [tYear] = rec.occurred_on.split('-').map(Number);
        if (tYear !== selectedYear) return;

        // Sum projected (Converted to CHF)
        if (rec.is_active) {
            const rate = rates[rec.currency_original] || 1;
            totalProjected += (rec.amount_original * rate);
        }

        // Sum paid (Use amount_base which is already CHF)
        const tx = getPaymentForEssential(rec.id);
        if (tx) {
            totalPaid += (tx.amount_base || tx.amount_original);
        }
    });

    return { projected: totalProjected, paid: totalPaid };
  }, [essentialTransactions, transactions, selectedYear, rates]);

  const handleNewPayment = (rec: EssentialTransaction) => {
      const defaultAccount = accounts.find(a => a.status === 'active' && !a.exclude_from_overview) || accounts[0];

      setPayModal({
          open: true,
          isEdit: false,
          initialData: {
              occurred_on: rec.occurred_on, // Usa la data esatta della voce essenziale
              amount_original: Math.abs(rec.amount_original),
              description: rec.description || '', // Usa la descrizione (Note) della voce
              category_id: rec.category_id,
              kind: rec.kind,
              account_id: defaultAccount ? defaultAccount.id : '',
              essential_transaction_id: rec.id,
              tag: '' // Reset tag
          }
      });
  };

  const handleEditPayment = (transaction: Transaction) => {
      setPayModal({
          open: true,
          isEdit: true,
          initialData: {
              ...transaction,
              amount_original: Math.abs(transaction.amount_original),
          }
      });
  };

  const handleSaveTransaction = async (tx: Partial<Transaction>) => {
      let finalAmount = tx.amount_original || 0;
      
      const expenseKinds = ['essential', 'personal', 'expense'];
      if (expenseKinds.includes(tx.kind || '') && finalAmount > 0) {
          finalAmount = -finalAmount;
      }

      let finalBase = tx.amount_base || 0;
      if (expenseKinds.includes(tx.kind || '') && finalBase > 0) {
          finalBase = -finalBase;
      }

      const payload = {
          ...tx,
          amount_original: finalAmount,
          amount_base: finalBase
      };

      if (tx.id) {
          await updateTransaction(tx.id, payload);
      } else {
          await addTransaction(payload);
      }
      setPayModal({ open: false, initialData: undefined });
  };

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const headerInfoPayment = (
      <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="leading-tight">Conferma i dati per registrare il pagamento nei <strong>Movimenti</strong>.</span>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header e Selettore Anno */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
         <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Spese Essenziali</h2>
               <button 
                  onClick={() => setIsInfoOpen(true)}
                  className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
               >
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </button>
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex items-center">
                 {availableYears.map(y => (
                     <button 
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedYear === y ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        {y}
                     </button>
                 ))}
            </div>
         </div>
         <button onClick={() => setModalState({ open: true })} className="px-6 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            <span>NUOVA VOCE</span>
         </button>
      </div>

      {/* Stats Bar */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between">
         <div className="flex flex-col mb-4 md:mb-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Pagato ({selectedYear})</span>
            <div className={`text-3xl font-black mt-1 ${yearlyStats.paid >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>CHF {yearlyStats.paid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
         </div>
         <div className="text-right max-w-md">
             <p className="text-xs text-slate-400 leading-relaxed">
                 Ogni riga raggruppa le spese con lo stesso nome. <br/>
                 Ogni pallino è una voce a sé stante con il proprio importo e valuta.
             </p>
         </div>
      </div>

      {/* VISTA DESKTOP: TABELLA MATRICE */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Checklist {selectedYear}</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-max text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 border-r border-slate-100 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] whitespace-nowrap">Nome Spesa</th>
                        {monthNames.map(m => (
                            <th key={m} className="px-2 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[80px]">{m}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {uniqueNames.map(recName => (
                        <tr key={recName} className="group hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-100 whitespace-nowrap">
                                <div className="font-black text-sm text-slate-800">{recName}</div>
                            </td>
                            {monthNames.map((_, idx) => {
                                // Find specific entry for this cell
                                const cellRec = getEssentialForCell(recName, idx, selectedYear);
                                
                                // Se non c'è voce prevista, cella vuota (o pulsante +)
                                if (!cellRec) {
                                    return (
                                        <td key={idx} className="px-2 py-4 text-center">
                                            {/* Optional: Add button to create entry for this slot */}
                                            <div className="w-full h-8 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100"></div>
                                            </div>
                                        </td>
                                    );
                                }

                                const transaction = getPaymentForEssential(cellRec.id);
                                const day = parseInt(cellRec.occurred_on.split('-')[2]);

                                return (
                                    <td key={idx} className="px-2 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {transaction ? (
                                                <button 
                                                    onClick={() => handleEditPayment(transaction)}
                                                    className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center cursor-pointer shadow-sm border border-emerald-200 hover:scale-110 transition-transform relative group/btn"
                                                    title="Pagamento Registrato - Clicca per modificare"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => cellRec.is_active && handleNewPayment(cellRec)}
                                                    disabled={!cellRec.is_active}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 border-blue-200 bg-white text-blue-500 hover:bg-blue-50 hover:border-blue-300 relative group/btn"
                                                    title="Registra Pagamento"
                                                >
                                                    <span className="text-[10px] font-black">{day}</span>
                                                    
                                                    {/* Quick Actions overlay on hover (Edit/Delete Rule) */}
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-white shadow-lg border border-slate-100 p-1 rounded-lg z-20 pointer-events-none group-hover/btn:pointer-events-auto">
                                                        <div onClick={(e) => { e.stopPropagation(); setModalState({ open: true, initialData: cellRec }); }} className="p-1 hover:text-blue-600 cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
                                                        <div onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, rec: cellRec }); }} className="p-1 hover:text-rose-600 cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                                                    </div>
                                                </button>
                                            )}
                                            {/* Amount Label below dot */}
                                            <div className="text-[8px] font-bold text-slate-400 whitespace-nowrap">
                                                {cellRec.currency_original} {cellRec.amount_original.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {uniqueNames.length === 0 && (
                        <tr>
                            <td colSpan={13} className="py-12 text-center text-slate-400 text-sm">Nessuna voce essenziale trovata per questo anno.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* VISTA MOBILE: LISTA RAGGRUPPATA */}
      <div className="md:hidden space-y-4">
         {uniqueNames.map(recName => (
             <div key={recName} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                 <div className="font-black text-lg text-slate-900 mb-4 border-b border-slate-50 pb-2">{recName}</div>
                 
                 <div className="grid grid-cols-4 gap-3">
                     {monthNames.map((m, idx) => {
                         const cellRec = getEssentialForCell(recName, idx, selectedYear);
                         if (!cellRec) return null;

                         const transaction = getPaymentForEssential(cellRec.id);
                         const day = parseInt(cellRec.occurred_on.split('-')[2]);

                         return (
                             <div key={idx} className="flex flex-col items-center bg-slate-50 p-2 rounded-xl">
                                 <span className="text-[9px] font-bold uppercase text-slate-400 mb-1">{m}</span>
                                 {transaction ? (
                                     <button 
                                        onClick={() => handleEditPayment(transaction)}
                                        className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-sm"
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                     </button>
                                 ) : (
                                     <button 
                                        onClick={() => cellRec.is_active && handleNewPayment(cellRec)}
                                        className="w-8 h-8 bg-white border border-blue-200 text-blue-500 rounded-full flex items-center justify-center shadow-sm"
                                     >
                                         <span className="text-[10px] font-black">{day}</span>
                                     </button>
                                 )}
                                 <div className="text-[9px] font-bold text-slate-500 mt-1">
                                     {cellRec.amount_original.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                                 </div>
                                 
                                 {!transaction && (
                                     <button 
                                        onClick={() => setModalState({ open: true, initialData: cellRec })}
                                        className="mt-1 text-[8px] text-blue-400 underline"
                                     >
                                         Modifica
                                     </button>
                                 )}
                             </div>
                         );
                     })}
                 </div>
             </div>
         ))}
      </div>

      <EssentialExpenseModal isOpen={modalState.open} onClose={() => setModalState({ open: false })} onSave={async (r) => { if(r.id) await updateEssential(r.id, r); else await addEssential(r); }} initialData={modalState.initialData} categories={categories} />
      
      {/* Modale Pagamento (TransactionModal) configurato specificamente */}
      <TransactionModal 
        isOpen={payModal.open} 
        onClose={() => setPayModal({ open: false })} 
        onSave={handleSaveTransaction} 
        initialData={payModal.initialData} 
        accounts={accounts} 
        categories={categories}
        customTitle={payModal.isEdit ? "Modifica Pagamento" : "Registra Pagamento"}
        submitLabel={payModal.isEdit ? "AGGIORNA PAGAMENTO" : "EFFETTUA PAGAMENTO"}
        headerInfo={headerInfoPayment}
      />

      <ConfirmModal 
        isOpen={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false })} 
        onConfirm={async () => { if(deleteDialog.rec) await deleteEssential(deleteDialog.rec.id); setDeleteDialog({ open: false }); }}
        title="Elimina Voce"
        message={`Eliminare "${deleteDialog.rec?.name}" del ${deleteDialog.rec?.occurred_on}?`}
        confirmText="Elimina"
        isDangerous={true}
      />

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Gestione Spese Essenziali"
        subtitle="Help"
      >
        <div className="space-y-6">
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Questa sezione aggrega le spese per nome. Ogni pallino rappresenta una voce specifica nel database con il proprio importo e la propria valuta.
               </p>
           </div>
           
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Legenda</h4>
              <ul className="space-y-3">
                 <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-200 flex items-center justify-center text-[10px] font-black text-blue-500 bg-white">15</div>
                    <p className="text-sm text-slate-600 mt-1.5"><span className="font-bold text-slate-900">In Attesa:</span> Spesa prevista. Il numero indica il giorno del mese. Sotto trovi l'importo e la valuta specifici.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>
                    <p className="text-sm text-slate-600 mt-1.5"><span className="font-bold text-slate-900">Pagato:</span> Il movimento è stato registrato ed è visibile nella sezione Movimenti.</p>
                 </li>
              </ul>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};
