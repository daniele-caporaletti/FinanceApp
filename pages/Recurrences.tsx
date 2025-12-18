
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { RecurringTransaction, Category, Account, Transaction } from '../types';
import { fetchExchangeRate } from '../utils/helpers';
import { ConfirmModal } from '../components/ConfirmModal';
import { FullScreenModal } from '../components/FullScreenModal';

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rec: Partial<RecurringTransaction>) => Promise<void>;
  initialData?: Partial<RecurringTransaction>;
  accounts: Account[];
  categories: Category[];
}

const RecurrenceModal: React.FC<RecurrenceModalProps> = ({ isOpen, onClose, onSave, initialData, accounts, categories }) => {
  const [formData, setFormData] = useState<Partial<RecurringTransaction>>({});
  const [loading, setLoading] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        name: '',
        occurred_on: new Date().toISOString().split('T')[0],
        kind: 'essential',
        amount_original: 0,
        account_id: accounts[0]?.id || '',
        category_id: null,
        tag: '',
        description: '',
        is_active: true,
        frequency: 'monthly'
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
  }, [isOpen, initialData, accounts, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) { alert("Errore durante il salvataggio."); } finally { setLoading(false); }
  };

  const mainCategories = categories.filter(c => !c.parent_id).sort((a,b) => a.name.localeCompare(b.name));
  const subCategories = selectedParentId ? categories.filter(c => c.parent_id === selectedParentId).sort((a,b) => a.name.localeCompare(b.name)) : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">{initialData?.id ? 'Modifica Ricorrenza' : 'Nuova Ricorrenza'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestione Spese Fisse</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome Ricorrenza</label><input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="es. Affitto, Netflix..." value={formData.name || ''} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data Riferimento</label><input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.occurred_on?.split('T')[0] || ''} onChange={e => setFormData(f => ({ ...f, occurred_on: e.target.value }))} /><p className="text-[9px] text-slate-400 px-1">Il giorno sarà usato come riferimento mensile.</p></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Frequenza</label><select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none" value={formData.frequency || 'monthly'} onChange={e => setFormData(f => ({ ...f, frequency: e.target.value as 'monthly' | 'yearly' }))}><option value="monthly">Mensile (12/anno)</option><option value="yearly">Annuale (1/anno)</option></select></div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tipo</label><select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none" value={formData.kind || 'essential'} onChange={e => setFormData(f => ({ ...f, kind: e.target.value as any }))}><option value="essential">Essential</option><option value="personal">Personal</option><option value="work">Work</option><option value="transfer">Giroconto</option></select></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Importo Stimato</label><input type="number" step="0.01" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.amount_original || 0} onChange={e => setFormData(f => ({ ...f, amount_original: parseFloat(e.target.value) }))} /></div>
          </div>

          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Conto</label><select required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none" value={formData.account_id || ''} onChange={e => setFormData(f => ({ ...f, account_id: e.target.value }))}>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency_code})</option>)}</select></div>
          
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Categoria</label><select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none" value={selectedParentId} onChange={e => { setSelectedParentId(e.target.value); setFormData(f => ({ ...f, category_id: e.target.value || null })); }}><option value="">Seleziona...</option>{mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Sottocategoria</label><select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none disabled:opacity-50" value={formData.category_id || ''} disabled={!selectedParentId} onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}><option value={selectedParentId}>Generica</option>{subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 cursor-pointer" onClick={() => setFormData(f => ({ ...f, is_active: !f.is_active }))}>
             <div className={`w-10 h-5 rounded-full relative transition-all ${formData.is_active ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_active ? 'left-6' : 'left-1'}`}></div>
             </div>
             <span className="text-xs font-bold text-slate-700">Ricorrenza Attiva</span>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all ${loading ? 'opacity-50' : ''}`}>{loading ? '...' : 'Salva Template'}</button>
        </form>
      </div>
    </div>
  );
};

interface ConfirmGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: string, amount: number) => Promise<void>;
    recurrenceName: string;
    defaultDate: string;
    defaultAmount: number;
    currency: string;
}

const ConfirmGenerationModal: React.FC<ConfirmGenerationModalProps> = ({ isOpen, onClose, onConfirm, recurrenceName, defaultDate, defaultAmount, currency }) => {
    const [date, setDate] = useState(defaultDate);
    const [amount, setAmount] = useState(defaultAmount);
    const [loading, setLoading] = useState(false);

    useEffect(() => { 
        setDate(defaultDate); 
        setAmount(defaultAmount);
    }, [defaultDate, defaultAmount, isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setLoading(true);
        await onConfirm(date, amount);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Genera Movimento</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">{recurrenceName}</p>
                
                <div className="space-y-4 mb-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data Effettiva</label>
                        <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Importo Reale ({currency})</label>
                        <input type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
                        <p className="text-[9px] text-slate-400 leading-tight px-1">Modifica l'importo se quest'anno la cifra è diversa dal solito. La ricorrenza originale non verrà modificata.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <button onClick={handleConfirm} disabled={loading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-50 active:scale-[0.98] transition-all">{loading ? '...' : 'Conferma e Inserisci'}</button>
                    <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Annulla</button>
                </div>
            </div>
        </div>
    );
};

export const Recurrences: React.FC = () => {
  const { recurringTransactions, transactions, accounts, categories, addRecurring, updateRecurring, deleteRecurring, addTransaction } = useFinance();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<RecurringTransaction> }>({ open: false });
  const [genModal, setGenModal] = useState<{ open: boolean; recurrence?: RecurringTransaction; defaultDate: string }>({ open: false, defaultDate: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; rec?: RecurringTransaction }>({ open: false });
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Ordina ricorrenze per nome
  const sortedRecurrences = useMemo(() => {
    return [...recurringTransactions].sort((a, b) => a.name.localeCompare(b.name));
  }, [recurringTransactions]);

  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  // Funzione che controlla lo stato (Fatto/Non Fatto) per una specifica ricorrenza in un specifico mese/anno
  const checkStatus = (rec: RecurringTransaction, monthIndex: number, year: number) => {
    const found = transactions.find(t => {
        const d = new Date(t.occurred_on);
        return d.getMonth() === monthIndex && 
               d.getFullYear() === year && 
               // Controllo un po' più lasso sull'importo: se c'è un movimento con lo stesso nome in quel mese, lo considero pagato, anche se l'importo differisce
               (t.description === rec.name || t.description === rec.description);
    });
    return !!found;
  };

  const yearlyStats = useMemo(() => {
    let totalProjected = 0;
    let totalPaid = 0;
    
    const activeRecs = sortedRecurrences.filter(r => r.is_active);

    activeRecs.forEach(rec => {
        const isYearly = rec.frequency === 'yearly';
        const multiplier = isYearly ? 1 : 12;

        totalProjected += Math.abs(rec.amount_original) * multiplier;

        const recMonth = new Date(rec.occurred_on).getMonth();
        for(let i=0; i<12; i++) {
            if(isYearly && i !== recMonth) continue;
            
            // Per il "Pagato", cerchiamo il movimento reale nel DB
            const foundTx = transactions.find(t => {
                const d = new Date(t.occurred_on);
                return d.getMonth() === i && 
                       d.getFullYear() === selectedYear && 
                       (t.description === rec.name || t.description === rec.description);
            });

            if (foundTx) {
                totalPaid += Math.abs(foundTx.amount_original); // Usiamo l'importo reale pagato
            }
        }
    });

    return {
        projected: totalProjected,
        paid: totalPaid,
        remaining: totalProjected - totalPaid // Qui è una stima: differenza tra previsto e pagato
    };
  }, [sortedRecurrences, transactions, selectedYear]);

  const handleGenerate = async (date: string, amount: number) => {
    if (!genModal.recurrence) return;
    const rec = genModal.recurrence;
    
    // Calcolo amount_base (CHF) se necessario
    const account = accounts.find(a => a.id === rec.account_id);
    const currency = account?.currency_code || 'CHF';
    
    let amount_base = amount;
    if (currency !== 'CHF') {
        const rate = await fetchExchangeRate(date, currency, 'CHF');
        amount_base = amount * rate;
    }

    await addTransaction({
        occurred_on: date,
        kind: rec.kind,
        account_id: rec.account_id,
        amount_original: amount, // Uso l'importo inserito dall'utente (che può essere diverso dal template)
        amount_base: amount_base,
        category_id: rec.category_id,
        tag: rec.tag,
        description: rec.name,
        user_id: rec.user_id
    });
  };

  // Determina gli anni disponibili
  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const getCurrencyForRecurrence = (rec: RecurringTransaction) => {
      const acc = accounts.find(a => a.id === rec.account_id);
      return acc?.currency_code || 'CHF';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header e Selettore Anno */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
         <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Ricorrenze</h2>
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
            <span>NUOVA RICORRENZA</span>
         </button>
      </div>

      {/* Cards Riepilogo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Annuo Previsto</span>
            <div className="text-2xl font-black text-slate-900 mt-2">CHF {yearlyStats.projected.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Già Pagato ({selectedYear})</span>
            <div className="text-2xl font-black text-emerald-600 mt-2">CHF {yearlyStats.paid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Residuo (Stima)</span>
            <div className="text-2xl font-black text-rose-600 mt-2">CHF {yearlyStats.remaining.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
         </div>
      </div>

      {/* VISTA DESKTOP: TABELLA MATRICE */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Panoramica Mensile {selectedYear}</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 border-r border-slate-100 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">Nome</th>
                        {monthNames.map(m => (
                            <th key={m} className="px-2 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-[6%]">{m}</th>
                        ))}
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {sortedRecurrences.map(rec => {
                        const recDay = new Date(rec.occurred_on).getDate();
                        const recMonth = new Date(rec.occurred_on).getMonth();
                        const isYearly = rec.frequency === 'yearly';

                        return (
                            <tr key={rec.id} className={`group transition-colors ${!rec.is_active ? 'bg-slate-50/30 opacity-60' : 'hover:bg-slate-50/50'}`}>
                                <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-100">
                                    <div className="flex items-center space-x-2">
                                       <div className="font-bold text-sm text-slate-800 truncate max-w-[150px]" title={rec.name}>{rec.name}</div>
                                       {isYearly && <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[9px] font-bold uppercase border border-purple-100">1/Y</span>}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">
                                        CHF {Math.abs(rec.amount_original).toLocaleString('it-IT')} • Giorno {recDay}
                                    </div>
                                </td>
                                {monthNames.map((_, idx) => {
                                    if (isYearly && idx !== recMonth) {
                                        return <td key={idx} className="bg-slate-50/40 border-l border-r border-transparent"></td>;
                                    }

                                    const isDone = checkStatus(rec, idx, selectedYear);
                                    const now = new Date();
                                    const isPast = (selectedYear < now.getFullYear()) || (selectedYear === now.getFullYear() && idx < now.getMonth());
                                    const isCurrent = selectedYear === now.getFullYear() && idx === now.getMonth();
                                    const cellDate = new Date(selectedYear, idx, recDay + 1).toISOString().split('T')[0];

                                    return (
                                        <td key={idx} className="px-2 py-4 text-center">
                                            {isDone ? (
                                                <div className="w-6 h-6 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center cursor-default">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => rec.is_active && setGenModal({ open: true, recurrence: rec, defaultDate: cellDate })}
                                                    disabled={!rec.is_active}
                                                    title={isPast ? "Scaduto - Clicca per generare" : "Clicca per generare"}
                                                    className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center transition-all ${
                                                        !rec.is_active ? 'bg-slate-100 border border-slate-200' :
                                                        isPast ? 'bg-rose-50 border border-rose-200 text-rose-300 hover:bg-rose-500 hover:border-rose-500 hover:text-white' : 
                                                        isCurrent ? 'bg-amber-50 border border-amber-200 text-amber-400 hover:bg-amber-400 hover:border-amber-400 hover:text-white animate-pulse' : 
                                                        'bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                                                    }`}
                                                >
                                                    {!rec.is_active ? '' : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></div>}
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 text-right space-x-1">
                                    <button onClick={() => setModalState({ open: true, initialData: rec })} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    <button onClick={() => setDeleteDialog({ open: true, rec })} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* VISTA MOBILE: CARDS */}
      <div className="md:hidden space-y-4">
         {sortedRecurrences.map(rec => {
            const recDay = new Date(rec.occurred_on).getDate();
            const isYearly = rec.frequency === 'yearly';
            const recMonth = new Date(rec.occurred_on).getMonth();

            return (
              <div key={rec.id} className={`bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 ${!rec.is_active ? 'opacity-70' : ''}`}>
                 <div className="flex justify-between items-start mb-3">
                    <div>
                        <div className="flex items-center space-x-2">
                             <span className="font-bold text-slate-900">{rec.name}</span>
                             {isYearly && <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[9px] font-bold uppercase border border-purple-100">1/Y</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Giorno {recDay} del mese</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="font-black text-slate-900 text-lg">
                           {Math.abs(rec.amount_original).toLocaleString('it-IT')} <span className="text-xs text-slate-400">CHF</span>
                       </span>
                    </div>
                 </div>

                 {/* Mini Timeline 12 mesi */}
                 <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl mb-4 overflow-x-auto no-scrollbar">
                    {monthNames.map((m, idx) => {
                         // Se annuale e non è il mese giusto, mostra placeholder
                         if (isYearly && idx !== recMonth) {
                             return <div key={idx} className="w-2 h-2 rounded-full bg-slate-200 opacity-20 mx-1"></div>;
                         }

                         const isDone = checkStatus(rec, idx, selectedYear);
                         const now = new Date();
                         const isPast = (selectedYear < now.getFullYear()) || (selectedYear === now.getFullYear() && idx < now.getMonth());
                         const isCurrent = selectedYear === now.getFullYear() && idx === now.getMonth();
                         const cellDate = new Date(selectedYear, idx, recDay + 1).toISOString().split('T')[0];
                         
                         return (
                            <button
                               key={idx}
                               onClick={() => !isDone && rec.is_active && setGenModal({ open: true, recurrence: rec, defaultDate: cellDate })}
                               disabled={isDone || !rec.is_active}
                               className={`flex flex-col items-center min-w-[24px] gap-1 group`}
                            >
                                <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${
                                    isDone ? 'bg-emerald-500' :
                                    isCurrent ? 'bg-amber-400 ring-4 ring-amber-100 animate-pulse' :
                                    isPast ? 'bg-rose-300' : 'bg-slate-200'
                                }`}></div>
                                <span className={`text-[8px] font-bold uppercase ${isCurrent ? 'text-slate-900' : 'text-slate-300'}`}>{m.charAt(0)}</span>
                            </button>
                         );
                    })}
                 </div>

                 <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <button 
                        onClick={() => setModalState({ open: true, initialData: rec })}
                        className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wide"
                    >
                        Modifica
                    </button>
                    <button 
                        onClick={() => setDeleteDialog({ open: true, rec })}
                        className="text-xs font-bold text-rose-300 hover:text-rose-600 transition-colors uppercase tracking-wide"
                    >
                        Elimina
                    </button>
                 </div>
              </div>
            );
         })}
         
         {sortedRecurrences.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-[1.5rem]">
               <p className="text-slate-400 text-sm font-bold">Nessuna ricorrenza</p>
            </div>
         )}
      </div>

      <RecurrenceModal isOpen={modalState.open} onClose={() => setModalState({ open: false })} onSave={async (r) => { if(r.id) await updateRecurring(r.id, r); else await addRecurring(r); }} initialData={modalState.initialData} accounts={accounts} categories={categories} />
      
      <ConfirmGenerationModal 
        isOpen={genModal.open} 
        onClose={() => setGenModal({ open: false, defaultDate: '' })} 
        onConfirm={handleGenerate} 
        recurrenceName={genModal.recurrence?.name || ''} 
        defaultDate={genModal.defaultDate}
        defaultAmount={genModal.recurrence?.amount_original || 0}
        currency={genModal.recurrence ? getCurrencyForRecurrence(genModal.recurrence) : 'CHF'}
      />

      <ConfirmModal 
        isOpen={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false })} 
        onConfirm={async () => { if(deleteDialog.rec) await deleteRecurring(deleteDialog.rec.id); setDeleteDialog({ open: false }); }}
        title="Elimina Template"
        message={`Eliminare "${deleteDialog.rec?.name}"? I movimenti già generati non verranno cancellati.`}
        confirmText="Elimina"
        isDangerous={true}
      />

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Gestione Ricorrenze"
        subtitle="Help"
      >
        <div className="space-y-6">
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Le ricorrenze servono a pianificare spese fisse mensili (es. affitto, abbonamenti) e controllarne il pagamento.
               </p>
           </div>
           
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Come Funziona</h4>
              <ul className="space-y-3">
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Creazione Template:</span> Crea una ricorrenza definendo importo, giorno del mese e categoria.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Generazione:</span> Ogni mese, clicca sul pallino corrispondente nella griglia per generare il movimento reale. Il pallino diventerà verde.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Stato:</span> Se il pallino è verde, significa che esiste un movimento nei "Movimenti" con lo stesso nome nel mese corrente.</p>
                 </li>
              </ul>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};
