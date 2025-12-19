import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { EssentialTransaction, Category, Transaction, Account } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';
import { TransactionModal } from './Transactions';

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

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        name: '',
        occurred_on: new Date().toISOString().split('T')[0],
        kind: 'essential',
        amount_original: undefined,
        currency_original: 'CHF',
        category_id: null,
        is_ready: false, // Default not ready
        description: ''
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

  // Opzioni filtrate come richiesto
  const typeOptions = [
    { value: 'essential', label: 'Essential' },
    { value: 'transfer', label: 'Giroconto' }
  ];

  const currencyOptions = [
      { value: 'CHF', label: 'CHF' },
      { value: 'EUR', label: 'EUR' },
      { value: 'USD', label: 'USD' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-visible animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center rounded-t-[2.5rem]">
          <div>
            <h2 className="text-xl font-black text-slate-900">{initialData?.id ? 'Modifica Regola' : 'Nuova Voce'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Pianificazione</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6 bg-white rounded-b-[2.5rem]">
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome Spesa / Giroconto</label><input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="es. Affitto, Risparmio..." value={formData.name || ''} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
          
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

          {/* Categorie nascoste per transfer */}
          {formData.kind !== 'transfer' && (
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Categoria</label><CustomSelect value={selectedParentId} onChange={(val) => { setSelectedParentId(val); setFormData(f => ({ ...f, category_id: val || null })); }} options={[{value: '', label: 'Seleziona...'}, ...mainCategoryOptions]} /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Sottocategoria</label><CustomSelect value={formData.category_id} onChange={(val) => setFormData(f => ({ ...f, category_id: val }))} options={subCategoryOptions} disabled={!selectedParentId} /></div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Note (Descrizione Movimento)</label>
            <textarea 
                rows={2} 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 resize-none" 
                placeholder="es. Scade il 15, Addebito automatico..." 
                value={formData.description || ''} 
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} 
            />
          </div>
          
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 cursor-pointer" onClick={() => setFormData(f => ({ ...f, is_ready: !f.is_ready }))}>
             <div className={`w-10 h-5 rounded-full relative transition-all ${formData.is_ready ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_ready ? 'left-6' : 'left-1'}`}></div>
             </div>
             <span className="text-xs font-bold text-slate-700">Fondi Già Accantonati (Pronta)</span>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''}`}>{loading ? '...' : 'Salva Voce'}</button>
        </form>
      </div>
    </div>
  );
};

// --- MODAL PAGAMENTO TRANSFER (DOPPIO MOVIMENTO) ---
interface TransferPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (fromAccount: string, fromAmount: number, toAccount: string, toAmount: number, date: string) => Promise<void>;
    recurrence: EssentialTransaction | null;
    accounts: Account[];
    customTitle?: string;
}

const TransferPaymentModal: React.FC<TransferPaymentModalProps> = ({ isOpen, onClose, onSave, recurrence, accounts, customTitle }) => {
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
        }
    }, [isOpen, recurrence]);

    if (!isOpen || !recurrence) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromAccount || !toAccount) { alert("Seleziona entrambi i conti"); return; }
        setLoading(true);
        try {
            await onSave(fromAccount, fromAmount, toAccount, toAmount, date);
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
                        <h2 className="text-xl font-black text-slate-900">{customTitle || "Esegui Giroconto"}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{recurrence.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-6 bg-white rounded-b-[2.5rem]">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data Movimento</label>
                        <input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={date.split('T')[0]} onChange={e => setDate(e.target.value)} />
                    </div>

                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3">
                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            In Uscita Da
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <CustomSelect value={fromAccount} onChange={setFromAccount} options={accountOptions} placeholder="Conto Partenza" />
                            <div className="relative">
                                <input type="number" step="0.01" required className="w-full px-4 py-3.5 bg-white border border-rose-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-rose-500" value={fromAmount} onChange={e => setFromAmount(parseFloat(e.target.value))} />
                                <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">{fromAccObj?.currency_code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            In Entrata Su
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <CustomSelect value={toAccount} onChange={setToAccount} options={accountOptions} placeholder="Conto Arrivo" />
                            <div className="relative">
                                <input type="number" step="0.01" required className="w-full px-4 py-3.5 bg-white border border-emerald-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500" value={toAmount} onChange={e => setToAmount(parseFloat(e.target.value))} />
                                <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">{toAccObj?.currency_code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className={`w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''}`}>{loading ? '...' : 'Registra Giroconto'}</button>
                </form>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPALE ---
export const Recurrences: React.FC = () => {
  const { essentialTransactions, transactions, accounts, categories, addEssential, updateEssential, deleteEssential, addTransaction, updateTransaction } = useFinance();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<EssentialTransaction> }>({ open: false });
  const [payModal, setPayModal] = useState<{ open: boolean; initialData?: Partial<Transaction>; isEdit?: boolean }>({ open: false });
  const [transferModal, setTransferModal] = useState<{ open: boolean; recurrence: EssentialTransaction | null; isPreparation?: boolean }>({ open: false, recurrence: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; rec?: EssentialTransaction }>({ open: false });
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  // --- OPTIMIZATION START: PRE-CALCULATED LOOKUP MAPS ---
  
  // 1. Payment Map: O(1) lookup for transaction status
  const paymentsMap = useMemo(() => {
      const map = new Map<string, Transaction>();
      transactions.forEach(t => {
          if (t.essential_transaction_id) {
              const typeKey = t.kind === 'transfer' ? 'transfer' : 'expense';
              map.set(`${t.essential_transaction_id}-${typeKey}`, t);
          }
      });
      return map;
  }, [transactions]);

  // 2. Lookup Maps for Expenses and Transfers cells
  // Key: `${name}-${monthIndex}`
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

  const essentialExpenses = useMemo(() => essentialTransactions.filter(t => t.kind !== 'transfer'), [essentialTransactions]);
  const essentialTransfers = useMemo(() => essentialTransactions.filter(t => t.kind === 'transfer'), [essentialTransactions]);

  const expensesLookup = useMemo(() => createRecurrenceLookup(essentialExpenses), [essentialExpenses, selectedYear]);
  const transfersLookup = useMemo(() => createRecurrenceLookup(essentialTransfers), [essentialTransfers, selectedYear]);

  // Unique names lists
  const uniqueExpenseNames = useMemo(() => {
      const names = new Set<string>();
      essentialExpenses.forEach(t => {
          const [tYear] = t.occurred_on.split('-').map(Number);
          if (tYear === selectedYear) names.add(t.name);
      });
      return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [essentialExpenses, selectedYear]);

  const uniqueTransferNames = useMemo(() => {
      const names = new Set<string>();
      essentialTransfers.forEach(t => {
          const [tYear] = t.occurred_on.split('-').map(Number);
          if (tYear === selectedYear) names.add(t.name);
      });
      return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [essentialTransfers, selectedYear]);

  // Helper using Maps (O(1))
  const getEssentialFromMap = (map: Map<string, EssentialTransaction>, name: string, monthIdx: number) => {
      return map.get(`${name}-${monthIdx}`);
  };

  const getPaymentFromMap = (essentialId: string, kind: string) => {
      const typeKey = kind === 'transfer' ? 'transfer' : 'expense';
      return paymentsMap.get(`${essentialId}-${typeKey}`);
  };
  // --- OPTIMIZATION END ---

  const handlePreparation = (rec: EssentialTransaction) => {
      setTransferModal({ open: true, recurrence: rec, isPreparation: true });
  };

  const handleNewPayment = (rec: EssentialTransaction) => {
      if (rec.kind === 'transfer') {
          setTransferModal({ open: true, recurrence: rec, isPreparation: false });
      } else {
          const defaultAccount = accounts.find(a => a.status === 'active' && !a.exclude_from_overview) || accounts[0];
          setPayModal({
              open: true,
              isEdit: false,
              initialData: {
                  occurred_on: rec.occurred_on,
                  amount_original: rec.amount_original, // Removed Math.abs so negative shows as negative
                  description: rec.description || '',
                  category_id: rec.category_id,
                  kind: rec.kind,
                  account_id: defaultAccount ? defaultAccount.id : '',
                  essential_transaction_id: rec.id,
                  tag: ''
              }
          });
      }
  };

  const handleEditPayment = (transaction: Transaction) => {
      setPayModal({
          open: true,
          isEdit: true,
          initialData: { ...transaction, amount_original: Math.abs(transaction.amount_original) }
      });
  };

  const handleSaveTransaction = async (tx: Partial<Transaction>) => {
      let finalAmount = tx.amount_original || 0;
      const expenseKinds = ['essential', 'personal', 'expense'];
      
      // Flip sign for amounts if it's an expense
      if (expenseKinds.includes(tx.kind || '') && finalAmount > 0) finalAmount = -finalAmount;
      
      let finalBase = 0;

      // MODIFICATO: Se è transfer, amount_base è sempre 0.
      if (tx.kind === 'transfer') {
          finalBase = 0;
      } else {
          finalBase = tx.amount_base || 0;
          if (expenseKinds.includes(tx.kind || '') && finalBase > 0) finalBase = -finalBase;
      }

      const payload = { ...tx, amount_original: finalAmount, amount_base: finalBase };
      if (tx.id) await updateTransaction(tx.id, payload);
      else await addTransaction(payload);
      setPayModal({ open: false, initialData: undefined });
  };

  const handleSaveTransfer = async (fromAccount: string, fromAmount: number, toAccount: string, toAmount: number, date: string) => {
      if (!transferModal.recurrence) return;
      
      const description = transferModal.isPreparation 
        ? `Accantonamento: ${transferModal.recurrence.name}`
        : `Giroconto: ${transferModal.recurrence.name}`;

      await addTransaction({
          account_id: fromAccount,
          amount_original: -Math.abs(fromAmount),
          amount_base: 0, // Ensure no conversion
          kind: 'transfer',
          occurred_on: date,
          essential_transaction_id: transferModal.recurrence.id,
          description: description + " (Out)"
      });
      await addTransaction({
          account_id: toAccount,
          amount_original: Math.abs(toAmount),
          amount_base: 0, // Ensure no conversion
          kind: 'transfer',
          occurred_on: date,
          essential_transaction_id: transferModal.recurrence.id,
          description: description + " (In)"
      });

      if (transferModal.isPreparation) {
          await updateEssential(transferModal.recurrence.id, { is_ready: true });
      }
  };

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = [current - 1, current, current + 1];
    return years.map(y => ({ value: y, label: y.toString() }));
  }, []);

  const renderTable = (title: string, names: string[], lookupMap: Map<string, EssentialTransaction>, colorTheme: 'rose' | 'blue') => {
      
      const monthlyTotals = monthNames.map((_, idx) => {
          return names.reduce((sum, name) => {
              const cellRec = getEssentialFromMap(lookupMap, name, idx);
              if (cellRec) {
                  return sum + Math.abs(cellRec.amount_original);
              }
              return sum;
          }, 0);
      });

      return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col mb-8 w-full">
        <div className="flex-none px-8 py-3 border-b border-slate-100 flex items-center gap-3 bg-white z-30">
            <div className={`w-1.5 h-6 rounded-full ${colorTheme === 'rose' ? 'bg-rose-500' : 'bg-blue-600'}`}></div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
        </div>
        
        {/* UNIFIED SCROLL CONTAINER */}
        <div className="flex-1 overflow-x-auto md:overflow-x-visible custom-scrollbar relative bg-white w-full">
            <div className="min-w-max md:min-w-full md:w-full">
                
                {/* Header Grid: Flex on Mobile, Grid on Desktop */}
                <div className="sticky top-0 z-20 flex md:grid md:grid-cols-[140px_repeat(12,minmax(0,1fr))] bg-slate-50/90 backdrop-blur-sm border-b border-slate-100 shadow-sm w-full">
                    <div className="sticky left-0 z-30 w-[130px] md:w-auto p-4 font-black text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/95 backdrop-blur-sm border-r border-slate-200 md:border-r-0 flex items-center">
                        Voce
                    </div>
                    {monthNames.map(m => (
                        <div key={m} className="w-[80px] md:w-auto flex-shrink-0 flex items-center justify-center p-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            {m.substring(0,3)}
                        </div>
                    ))}
                </div>

                {/* Rows Grid */}
                <div className="divide-y divide-slate-50">
                    {names.map((recName) => (
                        <div key={recName} className="flex md:grid md:grid-cols-[140px_repeat(12,minmax(0,1fr))] group hover:bg-slate-50 transition-colors w-full">
                            <div className="sticky left-0 z-10 w-[130px] md:w-auto p-4 bg-white border-r border-slate-100 md:border-r-0 group-hover:bg-slate-50 transition-colors flex items-center">
                                <span className="font-bold text-xs text-slate-800 truncate" title={recName}>{recName}</span>
                            </div>
                            
                            {/* Cells Row */}
                            {monthNames.map((_, idx) => {
                                const cellRec = getEssentialFromMap(lookupMap, recName, idx);
                                
                                return (
                                    <div key={idx} className="w-[80px] md:w-auto flex-shrink-0 h-[44px] flex items-center justify-center relative group/cell">
                                        {cellRec ? (() => {
                                            const transaction = getPaymentFromMap(cellRec.id, cellRec.kind);
                                            const rawAmount = transaction ? (transaction.amount_original || 0) : cellRec.amount_original;
                                            const formattedAmount = Math.abs(rawAmount).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                            const currency = cellRec.currency_original || 'CHF';
                                            const isOverdue = !transaction && new Date(cellRec.occurred_on) < new Date();
                                            const isReady = cellRec.is_ready;

                                            let buttonContent;
                                            if (transaction) {
                                                buttonContent = (
                                                    <button onClick={() => handleEditPayment(transaction)} className="w-[70px] md:w-full md:mx-1 h-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-transform">
                                                        <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                                                        <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
                                                    </button>
                                                );
                                            } else if (cellRec.kind === 'transfer') {
                                                buttonContent = (
                                                    <button 
                                                        onClick={() => handleNewPayment(cellRec)}
                                                        className={`w-[70px] md:w-full md:mx-1 h-8 rounded-lg border-2 flex flex-col items-center justify-center active:scale-95 transition-transform relative ${isOverdue ? 'border-rose-200 text-rose-500 bg-white' : 'border-amber-200 text-amber-600 bg-amber-50/30'}`}
                                                    >
                                                        <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                                                        <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
                                                    </button>
                                                );
                                            } else if (cellRec.kind === 'essential' && !isReady) {
                                                buttonContent = (
                                                    <button onClick={() => handlePreparation(cellRec)} className="w-[70px] md:w-full md:mx-1 h-8 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 flex flex-col items-center justify-center active:scale-95 transition-transform relative">
                                                        <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                                                        <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
                                                    </button>
                                                );
                                            } else {
                                                buttonContent = (
                                                    <button onClick={() => handleNewPayment(cellRec)} className={`w-[70px] md:w-full md:mx-1 h-8 rounded-lg border-2 flex flex-col items-center justify-center active:scale-95 transition-transform relative ${isOverdue ? 'border-rose-200 text-rose-500 bg-white' : 'border-blue-200 text-blue-500 bg-blue-50/30'}`}>
                                                        <span className="text-[9px] font-bold leading-none tracking-tighter">{formattedAmount}</span>
                                                        <span className="text-[7px] font-medium opacity-70 leading-none mt-0.5">{currency}</span>
                                                    </button>
                                                );
                                            }

                                            return (
                                                <>
                                                    {buttonContent}
                                                    {!transaction && (
                                                        <div className="hidden group-hover/cell:flex absolute -top-6 left-1/2 -translate-x-1/2 bg-white shadow-lg border border-slate-100 rounded-lg p-1 gap-1 z-50">
                                                            <button onClick={(e) => { e.stopPropagation(); setModalState({ open: true, initialData: cellRec }); }} className="p-1 hover:bg-slate-100 rounded text-blue-600"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, rec: cellRec }); }} className="p-1 hover:bg-slate-100 rounded text-rose-600"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })() : (
                                            <div className="w-1 h-1 rounded-full bg-slate-100"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer Grid */}
                <div className="sticky bottom-0 z-20 flex md:grid md:grid-cols-[140px_repeat(12,minmax(0,1fr))] bg-slate-50 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] w-full">
                    <div className="sticky left-0 z-30 w-[130px] md:w-auto p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50 border-r border-slate-200 md:border-r-0 flex items-center">
                        Totale
                    </div>
                    {monthlyTotals.map((total, idx) => (
                        <div key={idx} className="w-[80px] md:w-auto flex-shrink-0 flex items-center justify-center p-2 text-[8px] font-black text-slate-700">
                            {total > 0 ? total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </div>
                    ))}
                </div>

            </div>
        </div>
      </div>
  )};

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-28">
      {/* Header e Selettore Anno */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
         {/* Title Section */}
         <div className="flex items-center gap-3">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Pianificazione</h2>
            <button 
               onClick={() => setIsInfoOpen(true)}
               className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
         </div>

         {/* Controls Section */}
         <div className="flex items-stretch md:items-center gap-3 w-full md:w-auto">
            {/* Year Selector Dropdown */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-w-[120px] flex items-center">
                <CustomSelect 
                    value={selectedYear} 
                    onChange={(val) => setSelectedYear(Number(val))} 
                    options={yearOptions}
                    minimal={false}
                    className="w-full"
                />
            </div>
            
            {/* Add Button */}
            <button 
                onClick={() => setModalState({ open: true })} 
                className="flex-1 md:flex-none px-6 py-3.5 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                <span>NUOVA VOCE</span>
            </button>
         </div>
      </div>

      {/* TABLE 1: Essential Expenses */}
      {renderTable('Spese Essenziali', uniqueExpenseNames, expensesLookup, 'rose')}

      {/* TABLE 2: Transfers (Renamed to Giroconti) */}
      {renderTable('Giroconti', uniqueTransferNames, transfersLookup, 'blue')}

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
        disableTypeSelection={true}
      />

      <TransferPaymentModal 
        isOpen={transferModal.open}
        onClose={() => setTransferModal({ open: false, recurrence: null })}
        onSave={handleSaveTransfer}
        recurrence={transferModal.recurrence}
        accounts={accounts}
        customTitle={transferModal.isPreparation ? "Accantona Fondi" : "Esegui Giroconto"}
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
        title="Gestione Pianificazione"
        subtitle="Help"
      >
        <div className="space-y-6">
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Questa vista ti permette di vedere a colpo d'occhio lo stato dei pagamenti ricorrenti.
               </p>
           </div>
           
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Legenda Spese Essenziali</h4>
              <ul className="space-y-3">
                 <li className="flex items-center gap-3">
                    <div className="w-auto px-2 h-6 rounded bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center text-[10px] font-bold">120</div>
                    <span className="text-sm text-slate-600 font-bold">Pagato (Spesa Registrata)</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="w-auto px-2 h-6 rounded border-2 border-blue-200 text-blue-500 bg-blue-50/30 flex items-center justify-center text-[10px] font-bold relative">
                        120
                    </div>
                    <span className="text-sm text-slate-600 font-bold">Pronto (Fondi Accantonati)</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="w-auto px-2 h-6 rounded bg-amber-50 border border-amber-300 text-amber-700 flex items-center justify-center text-[10px] font-bold">120</div>
                    <span className="text-sm text-slate-600 font-bold">Da Accantonare</span>
                 </li>
              </ul>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};