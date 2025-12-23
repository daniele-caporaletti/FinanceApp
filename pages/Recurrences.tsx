
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { EssentialTransaction, Category, Transaction, Account } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';
import { TransactionModal } from './Transactions';
import { fetchExchangeRate } from '../utils/helpers';

// --- MODAL CONFIGURAZIONE (CREAZIONE/MODIFICA REGOLA) ---
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
  const [isExternalSource, setIsExternalSource] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Inizializza con valori di default sicuri, poi sovrascrivi con initialData
      setFormData({
        name: '',
        occurred_on: new Date().toISOString().split('T')[0],
        kind: 'expense_essential', 
        amount_original: undefined,
        currency_original: 'CHF',
        category_id: null,
        description: '',
        ...initialData // Merge importante per preservare i default se initialData è parziale
      });
      
      // Detect external source tag from description
      const desc = initialData?.description || '';
      setIsExternalSource(desc.includes('(Esterno)'));

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
      // Handle External Source Tag logic
      let finalDesc = formData.description || '';
      if (isExternalSource) {
          if (!finalDesc.includes('(Esterno)')) {
              finalDesc = `(Esterno) ${finalDesc}`;
          }
      } else {
          finalDesc = finalDesc.replace('(Esterno)', '').trim();
      }

      await onSave({ 
          ...formData, 
          amount_original: formData.amount_original || 0,
          description: finalDesc
      });
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

  // Opzioni allineate con i nuovi types
  const typeOptions = [
    { value: 'expense_essential', label: 'Spesa Essenziale (Uscita)' },
    { value: 'income_essential', label: 'Entrata Fissa (Entrata)' },
    { value: 'transfer_pocket', label: 'Pocket (Risparmio)' },
    { value: 'transfer_budget', label: 'Provvista Spese (Budget)' },
    { value: 'transfer_invest', label: 'Investimento' },
    { value: 'transfer_pension', label: 'Pensione' }
  ];

  const currencyOptions = [
      { value: 'CHF', label: 'CHF' },
      { value: 'EUR', label: 'EUR' },
      { value: 'USD', label: 'USD' }
  ];

  // Logic to show/hide fields
  const k = formData.kind;
  const isExpense = k === 'expense_essential';
  // External source only for Pension
  const isPension = k === 'transfer_pension' || k === 'pension';

  // Title Logic
  let modalTitle = initialData?.id ? 'Modifica Voce' : 'Nuova Pianificazione';
  if (!initialData?.id) {
      if (k === 'expense_essential') modalTitle = 'Nuova Spesa Essenziale';
      else if (k === 'transfer_pocket') modalTitle = 'Nuovo Pocket';
      else if (k === 'transfer_invest') modalTitle = 'Nuovo Investimento';
      else if (k === 'transfer_pension') modalTitle = 'Nuova Pensione';
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-visible animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center rounded-t-[2.5rem]">
          <div>
            <h2 className="text-xl font-black text-slate-900">{modalTitle}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestione Ricorrenza</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6 bg-white rounded-b-[2.5rem]">
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Nome (Descrizione Breve)
              </label>
              <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="es. Affitto, ETF World..." value={formData.name || ''} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Giorno Previsto</label><input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.occurred_on?.split('T')[0] || ''} onChange={e => setFormData(f => ({ ...f, occurred_on: e.target.value }))} /><p className="text-[9px] text-slate-400 px-1">La data determina il mese.</p></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tipo</label><CustomSelect value={formData.kind} onChange={(val) => setFormData(f => ({ ...f, kind: val }))} options={typeOptions} /></div>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
             <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Importo</label>
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

          {/* External Source Checkbox - ONLY FOR PENSION */}
          {isPension && (
             <div 
                onClick={() => setIsExternalSource(!isExternalSource)}
                className={`flex items-center space-x-3 p-4 rounded-2xl border cursor-pointer transition-all ${isExternalSource ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}
             >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isExternalSource ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-300'}`}>
                    {isExternalSource && <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
                <div className="flex flex-col">
                    <span className={`text-xs font-bold ${isExternalSource ? 'text-amber-800' : 'text-slate-600'}`}>Contributo da fonte esterna</span>
                    <span className="text-[10px] text-slate-400">Es. Busta paga, Datore di lavoro (Non transita dal C/C)</span>
                </div>
             </div>
          )}

          {isExpense && (
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Categoria</label><CustomSelect value={selectedParentId} onChange={(val) => { setSelectedParentId(val); setFormData(f => ({ ...f, category_id: val || null })); }} options={[{value: '', label: 'Seleziona...'}, ...mainCategoryOptions]} /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Sottocategoria</label><CustomSelect value={formData.category_id} onChange={(val) => setFormData(f => ({ ...f, category_id: val }))} options={subCategoryOptions} disabled={!selectedParentId} /></div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Note</label>
            <textarea 
                rows={2} 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 resize-none" 
                placeholder="es. Scade il 15, Addebito automatico..." 
                value={formData.description || ''} 
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} 
            />
          </div>
          
          <button type="submit" disabled={loading} className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''}`}>{loading ? '...' : 'Salva'}</button>
        </form>
      </div>
    </div>
  );
};

// --- MODAL STORICO MOVIMENTI ---
interface RecurrenceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    recurrence: EssentialTransaction | null;
    transactions: Transaction[];
    accounts: Account[];
    onEditTransaction: (tx: Transaction) => void;
    onDeleteTransaction: (tx: Transaction) => void;
}

const RecurrenceHistoryModal: React.FC<RecurrenceHistoryModalProps> = ({ 
    isOpen, 
    onClose, 
    recurrence, 
    transactions, 
    accounts,
    onEditTransaction,
    onDeleteTransaction
}) => {
    if (!isOpen || !recurrence) return null;

    const history = transactions
        .filter(t => t.essential_transaction_id === recurrence.id)
        .sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime());

    const totalPaid = history.reduce((sum, t) => sum + (t.amount_original || 0), 0);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Storico</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{recurrence.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Importo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.length > 0 ? history.map(tx => {
                                const acc = accounts.find(a => a.id === tx.account_id);
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                                            {new Date(tx.occurred_on).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                                            {acc?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                                            {tx.description || '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-right text-sm font-black whitespace-nowrap ${(tx.amount_original || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400 font-normal">{acc?.currency_code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                                            <button 
                                                onClick={() => onEditTransaction(tx)}
                                                className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Modifica"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => onDeleteTransaction(tx)}
                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Elimina"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        Nessun movimento registrato.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {history.length > 0 && (
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Totale Storico</span>
                        <span className={`text-lg font-black ${totalPaid >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {totalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-bold">CHF (Mix)</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MODAL PAGAMENTO TRANSFER / INCOME ---
interface TransferPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (fromAccount: string, fromAmount: number, toAccount: string, toAmount: number, date: string, isIncome: boolean) => Promise<void>;
    recurrence: EssentialTransaction | null;
    accounts: Account[];
    customTitle?: string;
}

const TransferPaymentModal: React.FC<TransferPaymentModalProps> = ({ isOpen, onClose, onSave, recurrence, accounts, customTitle }) => {
    const [mode, setMode] = useState<'transfer' | 'income'>('transfer');
    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [fromAmount, setFromAmount] = useState<number>(0);
    const [toAmount, setToAmount] = useState<number>(0);
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && recurrence) {
            setFromAmount(recurrence.amount_original);
            setToAmount(Math.abs(recurrence.amount_original));
            setDate(recurrence.occurred_on); 
            setFromAccount('');
            setToAccount('');
            
            // Auto-detect mode from description tag
            if (recurrence.description?.includes('(Esterno)')) {
                setMode('income');
            } else {
                setMode('transfer');
            }
        }
    }, [isOpen, recurrence]);

    if (!isOpen || !recurrence) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'transfer' && (!fromAccount || !toAccount)) { alert("Seleziona entrambi i conti"); return; }
        if (mode === 'income' && !toAccount) { alert("Seleziona il conto di destinazione"); return; }
        
        setLoading(true);
        try {
            await onSave(fromAccount, fromAmount, toAccount, toAmount, date, mode === 'income');
            onClose();
        } catch (e) { alert("Errore"); } finally { setLoading(false); }
    };

    const activeAccounts = accounts.filter(a => a.status === 'active');
    const accountOptions = activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency_code})` }));

    const fromAccObj = activeAccounts.find(a => a.id === fromAccount);
    const toAccObj = activeAccounts.find(a => a.id === toAccount);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-visible animate-in zoom-in-95 duration-300">
                <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center rounded-t-[2.5rem]">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">{customTitle || "Registra Transazione"}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{recurrence.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-6 bg-white rounded-b-[2.5rem]">
                    
                    {/* Mode Switcher */}
                    <div className="p-1.5 bg-slate-100 rounded-xl flex items-center mb-4">
                        <button 
                            type="button"
                            onClick={() => setMode('transfer')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${mode === 'transfer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Giroconto (Miei Conti)
                        </button>
                        <button 
                            type="button"
                            onClick={() => setMode('income')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${mode === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Versamento Diretto (Esterno)
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data</label>
                        <input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={date.split('T')[0]} onChange={e => setDate(e.target.value)} />
                    </div>

                    {mode === 'transfer' && (
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                Preleva da (Sorgente)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <CustomSelect value={fromAccount} onChange={setFromAccount} options={accountOptions} placeholder="Conto..." searchable />
                                <div className="relative">
                                    <input type="number" step="0.01" required className="w-full px-4 py-3.5 bg-white border border-rose-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-rose-500" value={fromAmount} onChange={e => setFromAmount(parseFloat(e.target.value))} />
                                    <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">{fromAccObj?.currency_code || '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${mode === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${mode === 'income' ? 'text-emerald-500' : 'text-blue-500'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            {mode === 'income' ? 'Versa su (Destinazione)' : 'Versa su (Destinazione)'}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <CustomSelect value={toAccount} onChange={setToAccount} options={accountOptions} placeholder="Destinazione..." searchable />
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    className={`w-full px-4 py-3.5 bg-white border rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ${mode === 'income' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-50' : 'border-blue-200 focus:border-blue-500 focus:ring-blue-50'}`} 
                                    value={toAmount} 
                                    onChange={e => setToAmount(parseFloat(e.target.value))} 
                                />
                                <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">{toAccObj?.currency_code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className={`w-full py-5 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''} ${mode === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                        {loading ? '...' : mode === 'income' ? 'Registra Entrata' : 'Conferma Trasferimento'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export const Recurrences: React.FC = () => {
  const { essentialTransactions, transactions, accounts, categories, addEssential, updateEssential, deleteEssential, addTransaction, updateTransaction, deleteTransaction, syncData } = useFinance();
  const currentRealDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentRealDate.getFullYear());
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<EssentialTransaction> }>({ open: false });
  const [payModal, setPayModal] = useState<{ open: boolean; initialData?: Partial<Transaction>; isEdit?: boolean }>({ open: false });
  const [transferModal, setTransferModal] = useState<{ open: boolean; recurrence: EssentialTransaction | null; isPreparation?: boolean }>({ open: false, recurrence: null });
  const [historyModal, setHistoryModal] = useState<{ open: boolean; recurrence: EssentialTransaction | null }>({ open: false, recurrence: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; rec?: EssentialTransaction; tx?: Transaction }>({ open: false });
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const shortMonthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  const availableYears = useMemo(() => {
    const years = essentialTransactions.map(t => parseInt(t.occurred_on.split('-')[0]));
    const unique = Array.from(new Set(years));
    const currentY = new Date().getFullYear();
    if (!unique.includes(currentY)) unique.push(currentY);
    return unique.sort((a, b) => b - a);
  }, [essentialTransactions]);

  const yearOptions = useMemo(() => availableYears.map(y => ({ value: y, label: y.toString() })), [availableYears]);

  const paymentsMap = useMemo(() => {
      const map = new Map<string, Transaction>();
      transactions.forEach(t => {
          if (t.essential_transaction_id) {
              const isTransferLike = 
                  t.kind === 'transfer' || 
                  t.kind === 'income' || 
                  t.kind.startsWith('transfer_') || 
                  t.kind.startsWith('income_');

              const typeKey = isTransferLike ? 'transfer' : 'expense';
              map.set(`${t.essential_transaction_id}-${typeKey}`, t);
          }
      });
      return map;
  }, [transactions]);

  const createRecurrenceLookup = (list: EssentialTransaction[]) => {
      const map = new Map<string, EssentialTransaction>();
      list.forEach(t => {
          const [tYear, tMonth] = t.occurred_on.split('-').map(Number);
          if (tYear === selectedYear) {
              map.set(`${t.name}-${tMonth - 1}`, t);
          }
      });
      return map;
  };

  const essentialExpenses = useMemo(() => essentialTransactions.filter(t => t.kind === 'expense_essential' || t.kind === 'essential'), [essentialTransactions]);
  const essentialTransfers = useMemo(() => essentialTransactions.filter(t => t.kind === 'transfer_pocket' || t.kind === 'transfer' || t.kind === 'transfer_budget'), [essentialTransactions]);
  const essentialInvestments = useMemo(() => essentialTransactions.filter(t => t.kind === 'transfer_invest' || t.kind === 'invest'), [essentialTransactions]);
  const essentialPensions = useMemo(() => essentialTransactions.filter(t => t.kind === 'transfer_pension' || t.kind === 'pension'), [essentialTransactions]);

  const expensesLookup = useMemo(() => createRecurrenceLookup(essentialExpenses), [essentialExpenses, selectedYear]);
  const transfersLookup = useMemo(() => createRecurrenceLookup(essentialTransfers), [essentialTransfers, selectedYear]);
  const investmentsLookup = useMemo(() => createRecurrenceLookup(essentialInvestments), [essentialInvestments, selectedYear]);
  const pensionsLookup = useMemo(() => createRecurrenceLookup(essentialPensions), [essentialPensions, selectedYear]);

  const getUniqueNames = (list: EssentialTransaction[]) => {
      const names = new Set<string>();
      list.forEach(t => {
          const [tYear] = t.occurred_on.split('-').map(Number);
          if (tYear === selectedYear) names.add(t.name);
      });
      return Array.from(names).sort((a, b) => a.localeCompare(b));
  };

  const uniqueExpenseNames = useMemo(() => getUniqueNames(essentialExpenses), [essentialExpenses, selectedYear]);
  const uniqueTransferNames = useMemo(() => getUniqueNames(essentialTransfers), [essentialTransfers, selectedYear]);
  const uniqueInvestNames = useMemo(() => getUniqueNames(essentialInvestments), [essentialInvestments, selectedYear]);
  const uniquePensionNames = useMemo(() => getUniqueNames(essentialPensions), [essentialPensions, selectedYear]);

  const getEssentialFromMap = (map: Map<string, EssentialTransaction>, name: string, monthIdx: number) => {
      return map.get(`${name}-${monthIdx}`);
  };

  const getPaymentFromMap = (essentialId: string, kind: string) => {
      const typeKey = (kind.startsWith('transfer_') || kind === 'transfer' || kind === 'invest' || kind === 'pension') ? 'transfer' : 'expense';
      return paymentsMap.get(`${essentialId}-${typeKey}`);
  };

  const handlePreparation = (rec: EssentialTransaction) => { setTransferModal({ open: true, recurrence: rec, isPreparation: true }); };
  const handleDuplicate = (rec: EssentialTransaction) => {
      const current = new Date(rec.occurred_on);
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      setModalState({ open: true, initialData: { ...rec, id: undefined, occurred_on: nextMonth.toISOString().split('T')[0] } });
  };
  const handleDragStart = (e: React.DragEvent, rec: EssentialTransaction) => { e.dataTransfer.setData("application/json", JSON.stringify(rec)); e.dataTransfer.effectAllowed = "copy"; };
  const handleCellDrop = (e: React.DragEvent, monthIdx: number) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;
      try {
          const sourceRec = JSON.parse(data) as EssentialTransaction;
          const originalDate = new Date(sourceRec.occurred_on);
          const targetDate = new Date(selectedYear, monthIdx, originalDate.getDate());
          if (targetDate.getMonth() !== monthIdx) targetDate.setDate(0);
          setModalState({ open: true, initialData: { ...sourceRec, id: undefined, occurred_on: new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0] } });
      } catch (err) { console.error("Errore drag", err); }
  };
  
  const handleNewPayment = (rec: EssentialTransaction) => {
      if (rec.kind.startsWith('transfer') || ['invest', 'pension', 'transfer'].includes(rec.kind)) { 
          setTransferModal({ open: true, recurrence: rec, isPreparation: false }); 
      } 
      else {
          const preparationTx = transactions.find(t => t.essential_transaction_id === rec.id && t.kind.startsWith('transfer') && t.amount_original > 0);
          const defaultAccount = accounts.find(a => a.status === 'active' && !a.exclude_from_overview) || accounts[0];
          setPayModal({ open: true, isEdit: false, initialData: { occurred_on: rec.occurred_on, amount_original: rec.amount_original, description: rec.description || '', category_id: rec.category_id, kind: rec.kind, account_id: preparationTx?.account_id || defaultAccount?.id || '', essential_transaction_id: rec.id, tag: '' } });
      }
  };
  
  const handleEditPayment = (transaction: Transaction) => { setPayModal({ open: true, isEdit: true, initialData: { ...transaction, amount_original: Math.abs(transaction.amount_original) } }); };
  
  const handleSaveTransaction = async (tx: Partial<Transaction>) => {
      let finalAmount = tx.amount_original || 0;
      if (['essential', 'expense_essential', 'expense_personal', 'expense_work'].includes(tx.kind || '') && finalAmount > 0) finalAmount = -finalAmount;
      
      let baseAmount = Math.abs(tx.amount_base || 0);
      baseAmount = baseAmount * (finalAmount < 0 ? -1 : 1);

      const payload = { ...tx, amount_original: finalAmount, amount_base: baseAmount };
      if (tx.id) await updateTransaction(tx.id, payload); else await addTransaction(payload);
      setPayModal({ open: false, initialData: undefined });
  };
  
  const handleSaveTransfer = async (fromAccount: string, fromAmount: number, toAccount: string, toAmount: number, date: string, isIncome: boolean) => {
      if (!transferModal.recurrence) return;
      const rec = transferModal.recurrence;
      let descPrefix = rec.kind.includes('invest') ? "Investimento" : rec.kind.includes('pension') ? "Pensione" : "Accantonamento";
      
      let transferKind = 'transfer_generic';
      let incomeKind = 'income_essential';
      if (rec.kind === 'expense_essential' || rec.kind === 'essential' || rec.kind === 'transfer_budget') transferKind = 'transfer_budget';
      else if (rec.kind === 'transfer_pocket' || rec.kind === 'transfer') transferKind = 'transfer_pocket';
      else if (rec.kind === 'transfer_invest' || rec.kind === 'invest') transferKind = 'transfer_invest';
      else if (rec.kind === 'transfer_pension' || rec.kind === 'pension') { transferKind = 'transfer_pension'; incomeKind = 'income_pension'; }
      
      const fromAcc = accounts.find(a => a.id === fromAccount);
      const toAcc = accounts.find(a => a.id === toAccount);
      const fromCurr = fromAcc?.currency_code || 'CHF';
      const toCurr = toAcc?.currency_code || 'CHF';

      if (isIncome) {
          let baseTo = Math.abs(toAmount);
          if (toCurr !== 'CHF') {
              const rateTo = await fetchExchangeRate(date, toCurr, 'CHF');
              baseTo = Math.abs(toAmount) * rateTo;
          }
          baseTo = Math.round(baseTo * 100) / 100;

          await addTransaction({
              account_id: toAccount,
              amount_original: Math.abs(toAmount),
              amount_base: baseTo,
              kind: incomeKind,
              occurred_on: date,
              essential_transaction_id: rec.id,
              description: `${descPrefix}: ${rec.name} (Versamento Diretto)`
          });
      } else {
          // OUT LEG
          let baseFrom = Math.abs(fromAmount);
          if (fromCurr !== 'CHF') {
              const rateFrom = await fetchExchangeRate(date, fromCurr, 'CHF');
              baseFrom = Math.abs(fromAmount) * rateFrom;
          }
          baseFrom = Math.round(baseFrom * 100) / 100;

          // IN LEG
          let baseTo = Math.abs(toAmount);
          if (toCurr !== 'CHF') {
              const rateTo = await fetchExchangeRate(date, toCurr, 'CHF');
              baseTo = Math.abs(toAmount) * rateTo;
          }
          baseTo = Math.round(baseTo * 100) / 100;

          await addTransaction({ account_id: fromAccount, amount_original: -Math.abs(fromAmount), amount_base: -baseFrom, kind: transferKind, occurred_on: date, essential_transaction_id: rec.id, description: `${descPrefix}: ${rec.name} (Out)` });
          await addTransaction({ account_id: toAccount, amount_original: Math.abs(toAmount), amount_base: baseTo, kind: transferKind, occurred_on: date, essential_transaction_id: rec.id, description: `${descPrefix}: ${rec.name} (In)` });
      }
  };

  const renderDeleteMessage = () => {
      if (deleteDialog.rec) {
          const rec = deleteDialog.rec;
          return (
              <div className="text-left mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome Regola</span>
                      <span className="text-sm font-bold text-slate-800">{rec.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Importo Previsto</span>
                      <span className="text-sm font-black text-slate-800">
                          {Math.abs(rec.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} {rec.currency_original || 'CHF'}
                      </span>
                  </div>
              </div>
          );
      } else if (deleteDialog.tx) {
          const tx = deleteDialog.tx;
          const acc = accounts.find(a => a.id === tx.account_id);
          return (
              <div className="text-left mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data</span>
                      <span className="text-sm font-bold text-slate-800">{new Date(tx.occurred_on).toLocaleDateString('it-IT')}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Conto</span>
                      <span className="text-sm font-bold text-slate-800">{acc?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Importo</span>
                      <span className={`text-sm font-black ${(tx.amount_original || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                  </div>
              </div>
          );
      }
      return null;
  }

  const renderSectionRows = (
      names: string[], 
      lookup: Map<string, EssentialTransaction>, 
      colorTheme: string, 
      sectionTitle: string, 
      icon?: React.ReactNode
  ) => {
      const textClass = `text-${colorTheme}-600`;
      const bgHeaderClass = `bg-${colorTheme}-50`;
      const borderClass = `border-${colorTheme}-100`;
      
      return (
          <>
            <div className={`flex md:grid md:grid-cols-[160px_repeat(12,minmax(0,1fr))] w-full sticky left-0 z-10 border-b ${borderClass} mt-1 bg-white/95 backdrop-blur-sm`}>
                <div className={`sticky left-0 z-10 w-[130px] md:w-auto p-3 pl-4 border-r ${borderClass} md:border-r-0 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 ${textClass} ${bgHeaderClass}`}>
                    {icon}
                    {sectionTitle}
                </div>
                <div className={`flex-1 md:col-span-12 ${bgHeaderClass} opacity-30`}></div>
            </div>
            
            <div className="divide-y divide-slate-50">
                {names.length > 0 ? names.map((recName) => (
                    <div key={recName} className="flex md:grid md:grid-cols-[160px_repeat(12,minmax(0,1fr))] group hover:bg-slate-50 transition-colors w-full">
                        <div className={`sticky left-0 z-10 w-[130px] md:w-auto p-4 bg-white border-r border-slate-100 md:border-r-0 group-hover:bg-slate-50 transition-colors flex items-center border-l-4 border-l-transparent group-hover:border-${colorTheme}-500`}>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-xs text-slate-800 truncate" title={recName}>{recName}</span>
                                {getEssentialFromMap(lookup, recName, 0)?.description?.includes('(Esterno)') && (
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Esterno</span>
                                )}
                            </div>
                        </div>
                        {shortMonthNames.map((_, idx) => {
                            const cellRec = getEssentialFromMap(lookup, recName, idx);
                            const isCurrentMonth = idx === currentRealDate.getMonth() && selectedYear === currentRealDate.getFullYear();
                            return (
                                <div 
                                    key={idx} 
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleCellDrop(e, idx)}
                                    className={`w-[80px] md:w-auto flex-shrink-0 h-[48px] flex items-center justify-center relative group/cell border-r border-slate-50/50 md:border-r-0 last:border-r-0 ${isCurrentMonth ? 'bg-blue-50/10' : ''}`}
                                >
                                    {cellRec ? (
                                        <div draggable onDragStart={(e) => handleDragStart(e, cellRec)} className="cursor-grab active:cursor-grabbing w-full px-1">
                                            {renderCellContent(cellRec)}
                                        </div>
                                    ) : <div className="w-1 h-1 rounded-full bg-slate-100"></div>}
                                </div>
                            );
                        })}
                    </div>
                )) : (
                    <div className="p-4 text-[10px] text-slate-400 italic text-center md:text-left">
                        Nessuna voce pianificata.
                    </div>
                )}
            </div>
          </>
      );
  };

  const renderCellContent = (cellRec: EssentialTransaction) => {
      const transaction = getPaymentFromMap(cellRec.id, cellRec.kind);
      const preparationTx = getPaymentFromMap(cellRec.id, 'transfer'); 
      const hasLinkedData = !!transaction || !!preparationTx;
      const rawAmount = transaction ? (transaction.amount_original || 0) : cellRec.amount_original;
      const formattedAmount = Math.abs(rawAmount).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const currency = cellRec.currency_original || 'CHF';
      const isOverdue = !transaction && !preparationTx && new Date(cellRec.occurred_on) < new Date();
      const isExpense = cellRec.kind === 'expense_essential' || cellRec.kind === 'essential';

      let buttonContent;
      const buttonBaseClass = "w-[70px] md:w-full h-8 rounded-lg border-2 flex flex-col items-center justify-center active:scale-95 transition-transform relative";

      if (transaction) {
          buttonContent = (
              <button onClick={() => setHistoryModal({ open: true, recurrence: cellRec })} className={`w-[70px] md:w-full h-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-transform`}>
                  <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                  <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
              </button>
          );
      } else if (isExpense && preparationTx) {
          buttonContent = (
              <button onClick={() => handleNewPayment(cellRec)} className={`w-[70px] md:w-full h-8 rounded-lg bg-blue-50 border border-blue-300 text-blue-700 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-transform`}>
                  <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                  <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
              </button>
          );
      } else if (isOverdue) {
          buttonContent = (
              <button onClick={() => handleNewPayment(cellRec)} className={`${buttonBaseClass} border-rose-200 text-rose-500 bg-white`}>
                  <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                  <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
              </button>
          );
      } else {
          let colors = isExpense ? "border-amber-200 text-amber-600 bg-amber-50/30" : "border-slate-200 text-slate-500 bg-slate-50/50";
          buttonContent = (
              <button onClick={() => handleNewPayment(cellRec)} className={`${buttonBaseClass} ${colors}`}>
                  <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                  <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
              </button>
          );
      }

      return (
          <>
              {buttonContent}
              <div className="hidden group-hover/cell:flex absolute -top-6 left-1/2 -translate-x-1/2 bg-white shadow-lg border border-slate-100 rounded-lg p-1 gap-1 z-50 animate-in zoom-in duration-200">
                  {!hasLinkedData && <button onClick={(e) => { e.stopPropagation(); setModalState({ open: true, initialData: cellRec }); }} className="p-1 hover:bg-slate-100 rounded text-blue-600" title="Modifica"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>}
                  {!hasLinkedData && <button onClick={(e) => { e.stopPropagation(); handleDuplicate(cellRec); }} className="p-1 hover:bg-slate-100 rounded text-indigo-500" title="Duplica"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></button>}
                  <button onClick={(e) => { e.stopPropagation(); setHistoryModal({ open: true, recurrence: cellRec }); }} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Storico"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                  {!hasLinkedData && <button onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, rec: cellRec }); }} className="p-1 hover:bg-slate-100 rounded text-rose-600" title="Elimina"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>}
              </div>
          </>
      );
  };

  const renderUnifiedTable = () => {
      return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col mb-8 w-full">
        <div className="flex-1 overflow-x-auto md:overflow-visible custom-scrollbar relative bg-white w-full">
            <div className="min-w-max md:min-w-0 md:w-full">
                <div className="sticky top-0 z-20 flex md:grid md:grid-cols-[160px_repeat(12,minmax(0,1fr))] bg-slate-50/90 backdrop-blur-sm border-b border-slate-100 shadow-sm w-full">
                    <div className="sticky left-0 z-30 w-[130px] md:w-auto p-4 font-black text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/95 backdrop-blur-sm border-r border-slate-200 md:border-r-0 flex items-center">
                        Periodo
                    </div>
                    {shortMonthNames.map((m, idx) => {
                        const isCurrentMonth = idx === currentRealDate.getMonth() && selectedYear === currentRealDate.getFullYear();
                        return (
                            <div key={m} className={`w-[80px] md:w-auto flex-shrink-0 flex items-center justify-center p-2 text-[9px] font-black uppercase tracking-wider ${isCurrentMonth ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400'}`}>
                                {m}
                            </div>
                        );
                    })}
                </div>
                {renderSectionRows(uniqueExpenseNames, expensesLookup, "rose", "Spese Essenziali")}
                {renderSectionRows(uniqueTransferNames, transfersLookup, "indigo", "Pockets", <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>)}
                {renderSectionRows(uniqueInvestNames, investmentsLookup, "emerald", "Investimenti", <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>)}
                {renderSectionRows(uniquePensionNames, pensionsLookup, "amber", "Pensione", <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>)}
            </div>
        </div>
      </div>
  )};

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-28">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
         <div className="flex items-center gap-3">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Pianificazione</h2>
            <button onClick={() => setIsInfoOpen(true)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-w-[100px] flex items-center">
                <CustomSelect value={selectedYear} onChange={(val) => setSelectedYear(Number(val))} options={yearOptions} minimal={false} className="w-full" />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <button onClick={() => setModalState({ open: true, initialData: { kind: 'expense_essential' } })} className="p-4 bg-white border-2 border-rose-50 rounded-2xl hover:border-rose-200 hover:bg-rose-50 transition-all group flex flex-col items-center justify-center gap-2 shadow-sm">
              <div className="p-2 rounded-full bg-rose-100 text-rose-600 group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-rose-700">Spesa Essenziale</span>
          </button>
          <button onClick={() => setModalState({ open: true, initialData: { kind: 'transfer_pocket' } })} className="p-4 bg-white border-2 border-indigo-50 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50 transition-all group flex flex-col items-center justify-center gap-2 shadow-sm">
              <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">Pocket (Risparmio)</span>
          </button>
          <button onClick={() => setModalState({ open: true, initialData: { kind: 'transfer_invest' } })} className="p-4 bg-white border-2 border-emerald-50 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50 transition-all group flex flex-col items-center justify-center gap-2 shadow-sm">
              <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">Investimento</span>
          </button>
          <button onClick={() => setModalState({ open: true, initialData: { kind: 'transfer_pension' } })} className="p-4 bg-white border-2 border-amber-50 rounded-2xl hover:border-amber-200 hover:bg-amber-50 transition-all group flex flex-col items-center justify-center gap-2 shadow-sm">
              <div className="p-2 rounded-full bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-amber-700">Pensione</span>
          </button>
      </div>

      {renderUnifiedTable()}

      <EssentialExpenseModal isOpen={modalState.open} onClose={() => setModalState({ open: false })} onSave={async (r) => { if(r.id) await updateEssential(r.id, r); else await addEssential(r); }} initialData={modalState.initialData} categories={categories} />
      
      <TransactionModal 
        isOpen={payModal.open} 
        onClose={() => setPayModal({ open: false })} 
        onSave={handleSaveTransaction} 
        initialData={payModal.initialData} 
        accounts={accounts} 
        categories={categories}
        customTitle={payModal.isEdit ? "Modifica Pagamento" : "Registra Pagamento"}
        submitLabel={payModal.isEdit ? "AGGIORNA PAGAMENTO" : "EFFETTUA PAGAMENTO"}
        headerInfo={<div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="leading-tight">Conferma i dati per registrare il pagamento nei <strong>Movimenti</strong>.</span></div>}
        disableTypeSelection={false}
      />

      <TransferPaymentModal 
        isOpen={transferModal.open}
        onClose={() => setTransferModal({ open: false, recurrence: null })}
        onSave={handleSaveTransfer}
        recurrence={transferModal.recurrence}
        accounts={accounts}
        customTitle={transferModal.isPreparation ? "Accantona Fondi" : "Registra Transazione"}
      />

      <RecurrenceHistoryModal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, recurrence: null })}
        recurrence={historyModal.recurrence}
        transactions={transactions}
        accounts={accounts}
        onEditTransaction={(tx) => handleEditPayment(tx)}
        onDeleteTransaction={(tx) => setDeleteDialog({ open: true, tx })}
      />

      <ConfirmModal 
        isOpen={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false })} 
        onConfirm={async () => { 
            if(deleteDialog.rec) await deleteEssential(deleteDialog.rec.id); 
            if(deleteDialog.tx) await deleteTransaction(deleteDialog.tx.id);
            setDeleteDialog({ open: false }); 
        }}
        title={deleteDialog.rec ? "Elimina Voce Pianificata" : "Elimina Movimento"}
        message={
            <div>
                <p className="mb-4">Vuoi davvero eliminare questo elemento?</p>
                {renderDeleteMessage()}
            </div>
        }
        confirmText="Elimina"
        isDangerous={true}
      />

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Pianificazione"
        subtitle="Help"
      >
        <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    La <strong>Pianificazione</strong> è la mappa annuale delle tue finanze. Qui definisci cosa deve succedere ogni mese, dalle spese fisse agli investimenti, e monitori l'esecuzione in tempo reale.
                </p>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Stati e Colori</h4>
                <ul className="space-y-3">
                    <li className="flex items-center gap-4">
                        <div className="w-20 h-8 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-400 flex flex-col items-center justify-center uppercase leading-none">
                            <span>120.00</span>
                            <span className="text-[8px] opacity-60 mt-0.5">CHF</span>
                        </div>
                        <p className="text-xs text-slate-600"><strong>Pianificato:</strong> L'evento è previsto per il mese ma non ancora accaduto.</p>
                    </li>
                    <li className="flex items-center gap-4">
                        <div className="w-20 h-8 rounded-lg bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 flex flex-col items-center justify-center uppercase leading-none">
                            <span>120.00</span>
                            <span className="text-[8px] opacity-60 mt-0.5">CHF</span>
                        </div>
                        <p className="text-xs text-slate-600"><strong>Pronta (Solo Spese):</strong> I fondi sono stati accantonati nel "Budget" (Provvista) tramite un trasferimento.</p>
                    </li>
                    <li className="flex items-center gap-4">
                        <div className="w-20 h-8 rounded-lg bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-700 flex flex-col items-center justify-center uppercase leading-none">
                            <span>120.00</span>
                            <span className="text-[8px] opacity-60 mt-0.5">CHF</span>
                        </div>
                        <p className="text-xs text-slate-600"><strong>Eseguito:</strong> Il pagamento o trasferimento è stato completato e registrato.</p>
                    </li>
                    <li className="flex items-center gap-4">
                        <div className="w-20 h-8 rounded-lg bg-white border border-rose-200 text-[10px] font-bold text-rose-500 flex flex-col items-center justify-center uppercase leading-none">
                            <span>120.00</span>
                            <span className="text-[8px] opacity-60 mt-0.5">CHF</span>
                        </div>
                        <p className="text-xs text-slate-600"><strong>Scaduto:</strong> La data prevista è passata e l'azione non risulta completata.</p>
                    </li>
                </ul>
            </div>
        </div>
      </FullScreenModal>
    </div>
  );
};
