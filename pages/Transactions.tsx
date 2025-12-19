import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { Transaction, Category, Account } from '../types';
import { fetchExchangeRate } from '../utils/helpers';
import { ConfirmModal } from '../components/ConfirmModal';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';

interface FilterState {
  search: string;
  types: string[];
  accounts: string[];
  category: string;
  subcategory: string;
  tag: string;
  year: string;
  months: number[];
  amountSign: 'all' | 'positive' | 'negative';
}

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => Promise<void>;
  initialData?: Partial<Transaction>;
  accounts: Account[];
  categories: Category[];
  customTitle?: string;
  submitLabel?: string;
  headerInfo?: React.ReactNode;
  disableTypeSelection?: boolean;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  accounts, 
  categories,
  customTitle,
  submitLabel = "Salva",
  headerInfo,
  disableTypeSelection = false
}) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({});
  const [loading, setLoading] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  // MODIFICATO: Filtra SOLTANTO per status attivo, ignorando exclude_from_overview
  const visibleAccounts = useMemo(() => {
    return accounts.filter(a => a.status === 'active');
  }, [accounts]);

  // Options prep
  const typeOptions = [
    { value: 'essential', label: 'Essential' },
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
    { value: 'transfer', label: 'Giroconto' }
  ];

  const accountOptions = visibleAccounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.currency_code})` }));
  const mainCategories = categories.filter(c => !c.parent_id).sort((a,b) => a.name.localeCompare(b.name));
  const mainCategoryOptions = mainCategories.map(c => ({ value: c.id, label: c.name }));
  
  const subCategories = selectedParentId ? categories.filter(c => c.parent_id === selectedParentId).sort((a,b) => a.name.localeCompare(b.name)) : [];
  const subCategoryOptions = [
      { value: selectedParentId, label: 'Generica' },
      ...subCategories.map(s => ({ value: s.id, label: s.name }))
  ];

  useEffect(() => {
    if (isOpen) {
      const initialKind = initialData?.kind || 'essential';
      setFormData(initialData || {
        occurred_on: new Date().toISOString().split('T')[0],
        kind: initialKind,
        amount_original: undefined,
        amount_base: 0,
        account_id: initialData?.account_id || '', // Non pre-selezionare il primo conto
        category_id: null,
        tag: '',
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
  }, [isOpen, initialData, accounts, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id) {
        alert("Seleziona un conto per procedere.");
        return;
    }
    setLoading(true);
    try {
      const selectedAccount = accounts.find(a => a.id === formData.account_id);
      const currency = selectedAccount?.currency_code || 'CHF';
      const date = formData.occurred_on || new Date().toISOString().split('T')[0];
      const originalAmount = formData.amount_original || 0;
      let baseAmount = 0;
      
      // Valori finali per categoria e tag
      let finalCategoryId = formData.category_id;
      let finalTag = formData.tag;

      // MODIFICATO: Se è transfer, amount_base è sempre 0 e puliamo categoria/tag.
      if (formData.kind === 'transfer') {
          baseAmount = 0;
          finalCategoryId = null;
          finalTag = null;
      } else {
          if (currency === 'CHF') {
              baseAmount = originalAmount;
          } else {
              const rate = await fetchExchangeRate(date, currency, 'CHF');
              baseAmount = originalAmount * rate;
          }
          // Arrotondamento
          baseAmount = Math.round(baseAmount * 100) / 100;
      }

      await onSave({ 
          ...formData, 
          amount_original: originalAmount, 
          amount_base: baseAmount,
          category_id: finalCategoryId,
          tag: finalTag
      });
      onClose();
    } catch (err) { alert("Errore durante il salvataggio."); } finally { setLoading(false); }
  };

  const selectedAccount = accounts.find(a => a.id === formData.account_id);
  const currencyLabel = selectedAccount?.currency_code || 'CHF';
  const isTransfer = formData.kind === 'transfer';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-visible animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center rounded-t-[2.5rem]">
          <div>
            <h2 className="text-xl font-black text-slate-900">{customTitle || (initialData?.id ? 'Modifica Movimento' : 'Nuovo Movimento')}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestione Transazione</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {headerInfo && (
            <div className="px-10 py-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800 font-medium">
                {headerInfo}
            </div>
        )}

        <form onSubmit={handleSubmit} className="p-10 space-y-6 bg-white rounded-b-[2.5rem]">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data</label><input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.occurred_on?.split('T')[0] || ''} onChange={e => setFormData(f => ({ ...f, occurred_on: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tipo</label><CustomSelect value={formData.kind} onChange={(val) => setFormData(f => ({ ...f, kind: val }))} options={typeOptions} disabled={disableTypeSelection} /></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Conto</label>
                <CustomSelect value={formData.account_id} onChange={(val) => setFormData(f => ({ ...f, account_id: val }))} options={accountOptions} placeholder="Seleziona..." />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Importo ({currencyLabel})</label>
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
          </div>
          
          {!isTransfer && (
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Categoria</label><CustomSelect value={selectedParentId} onChange={(val) => { setSelectedParentId(val); setFormData(f => ({ ...f, category_id: val || null })); }} options={[{value: '', label: 'Seleziona...'}, ...mainCategoryOptions]} /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Sottocategoria</label><CustomSelect value={formData.category_id} onChange={(val) => setFormData(f => ({ ...f, category_id: val }))} options={subCategoryOptions} disabled={!selectedParentId} /></div>
            </div>
          )}

          {!isTransfer && (
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tag</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="es. vacanze..." value={formData.tag || ''} onChange={e => setFormData(f => ({ ...f, tag: e.target.value }))} /></div>
          )}

          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Descrizione</label><textarea rows={2} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 resize-none" placeholder="..." value={formData.description || ''} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} /></div>
          <button type="submit" disabled={loading} className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-sm ${loading ? 'opacity-50' : ''}`}>{loading ? '...' : submitLabel}</button>
        </form>
      </div>
    </div>
  );
};

// --- MOBILE SWIPEABLE ITEM ---
interface SwipeableItemProps { 
  children: React.ReactNode; 
  onEdit: () => void; 
  onDelete: () => void; 
}

const SwipeableTransactionItem: React.FC<SwipeableItemProps> = ({ children, onEdit, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    
    // Only process horizontal swipe if significant
    if (Math.abs(diff) > 5) {
        isSwiping.current = true;
        // Limit drag (max 150px)
        if (diff > -150 && diff < 150) {
            setOffsetX(diff);
        }
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(offsetX) > 80) { // Threshold 80px
      if (offsetX > 0) {
        // Swipe Right -> Edit
        onEdit();
      } else {
        // Swipe Left -> Delete
        onDelete();
      }
    }
    // Reset animation
    setOffsetX(0);
    touchStartX.current = null;
  };

  const handleClick = () => {
      // If it was a swipe interaction, ignore click
      if (isSwiping.current) return;

      // Bounce Animation Sequence to hint actions
      // 1. Right (Blue/Edit)
      setOffsetX(40);
      setTimeout(() => {
          setOffsetX(0);
          setTimeout(() => {
              // 2. Left (Red/Delete)
              setOffsetX(-40);
              setTimeout(() => {
                  setOffsetX(0);
              }, 250);
          }, 250);
      }, 250);
  };

  // Sfondo: Blu (Destra/Edit) se offset > 0, Rosso (Sinistra/Delete) se offset < 0
  const bgStyle = offsetX > 0 ? 'bg-blue-600' : 'bg-rose-600';
  
  // Icona che appare durante lo swipe
  const actionContent = offsetX > 0 ? (
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest animate-in fade-in zoom-in duration-200">
         <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
         <span>Modifica</span>
      </div>
  ) : (
      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest animate-in fade-in zoom-in duration-200">
         <span>Elimina</span>
         <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </div>
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl mb-3 shadow-sm border border-slate-100 ${Math.abs(offsetX) > 20 ? bgStyle : 'bg-white'}`}>
       {Math.abs(offsetX) > 20 && actionContent}
       <div 
         ref={itemRef}
         className="bg-white rounded-2xl relative z-10 transition-transform duration-300 ease-out active:duration-0 cursor-pointer"
         style={{ transform: `translateX(${offsetX}px)` }}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
         onClick={handleClick}
       >
         {children}
       </div>
    </div>
  )
}

export const Transactions: React.FC = () => {
  const { transactions, categories, accounts, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const { navigationParams } = useNavigation();
  const currentYear = new Date().getFullYear().toString();
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<Transaction> }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tx?: Transaction }>({ open: false });
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Stato per la visibilità dei filtri
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '', types: [], accounts: [], category: '', subcategory: '', tag: '', 
    year: currentYear, 
    months: [],
    amountSign: 'all'
  });

  useEffect(() => {
    if (navigationParams) {
      if (navigationParams.openNew) {
         setModalState({ open: true, initialData: undefined });
      } else {
         setFilters(prev => ({
           ...prev,
           ...navigationParams,
         }));
      }
    }
  }, [navigationParams]);

  const handleRefreshRate = async (tx: Transaction, currency: string) => {
    if (currency === 'CHF') return;
    
    // Feedback visivo immediato (opzionale) o silent update
    // Poiché non abbiamo uno stato di loading per riga, facciamo l'update ottimistico o attendiamo
    try {
        const rate = await fetchExchangeRate(tx.occurred_on, currency, 'CHF');
        const newBase = Math.round((tx.amount_original * rate) * 100) / 100;
        await updateTransaction(tx.id, { amount_base: newBase });
    } catch (e) {
        alert("Impossibile aggiornare il tasso di cambio.");
    }
  };

  const availableYears = useMemo(() => {
    const years = transactions.map(t => parseInt(t.occurred_on.split('-')[0]));
    const unique = Array.from(new Set(years));
    if (!unique.includes(parseInt(currentYear))) unique.push(parseInt(currentYear));
    return unique.sort((a: number, b: number) => b - a).map(String);
  }, [transactions, currentYear]);

  // Options for Year Dropdown
  const yearOptions = useMemo(() => availableYears.map(y => ({ value: y, label: y })), [availableYears]);

  // OPTIMIZATION: Create Lookup Maps O(C) + O(A) to avoid finding in array for every row
  const categoryMap = useMemo(() => {
      const map = new Map<string, {category: string, subcategory: string, categoryId: string | null}>();
      categories.forEach(c => {
          if (c.parent_id) {
              const p = categories.find(x => x.id === c.parent_id);
              map.set(c.id, { category: p ? p.name : c.name, subcategory: c.name, categoryId: p ? p.id : c.id });
          } else {
              map.set(c.id, { category: c.name, subcategory: '-', categoryId: c.id });
          }
      });
      return map;
  }, [categories]);

  const accountMap = useMemo(() => {
      const map = new Map<string, {name: string, currency: string}>();
      accounts.forEach(a => {
          map.set(a.id, { name: a.name, currency: a.currency_code });
      });
      return map;
  }, [accounts]);

  const getCategoryInfoFromMap = (id: string | null) => {
      if (!id) return { category: '-', subcategory: '-', categoryId: null };
      return categoryMap.get(id) || { category: '-', subcategory: '-', categoryId: null };
  };

  const getAccountInfoFromMap = (id: string) => {
      return accountMap.get(id) || { name: '?', currency: '' };
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const { category, subcategory } = getCategoryInfoFromMap(tx.category_id);
      const acc = getAccountInfoFromMap(tx.account_id);
      const [tYear, tMonth] = tx.occurred_on.split('-').map(Number);
      
      const matchSearch = !filters.search || 
        tx.description?.toLowerCase().includes(filters.search.toLowerCase()) || 
        tx.amount_base?.toString().includes(filters.search) ||
        tx.tag?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchType = filters.types.length === 0 || filters.types.includes(tx.kind);
      const matchAccount = filters.accounts.length === 0 || filters.accounts.includes(acc.name);
      const matchCategory = !filters.category || category === filters.category;
      const matchSub = !filters.subcategory || subcategory === filters.subcategory;
      const matchTag = !filters.tag || tx.tag === filters.tag;
      const matchYear = !filters.year || tYear.toString() === filters.year;
      const matchMonth = filters.months.length === 0 || filters.months.includes(tMonth);
      
      const matchSign = filters.amountSign === 'all' 
        || (filters.amountSign === 'positive' && (tx.amount_base || 0) > 0)
        || (filters.amountSign === 'negative' && (tx.amount_base || 0) < 0);

      return matchSearch && matchType && matchAccount && matchCategory && matchSub && matchTag && matchYear && matchMonth && matchSign;
    }).sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime());
  }, [transactions, filters, categoryMap, accountMap]);

  const typeOptions = ['essential', 'personal', 'work', 'transfer'];
  const accountOptions = Array.from(new Set(accounts.filter(a => a.status === 'active').map(a => a.name)));
  
  const tagOptions = Array.from(new Set(transactions.map(t => t.tag).filter(Boolean) as string[]));
  const mainCategories = categories.filter(c => !c.parent_id);
  const subCategoryOptions = filters.category ? categories.filter(c => c.parent_id === mainCategories.find(m => m.name === filters.category)?.id).map(c => c.name) : [];
  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  const toggleMultiSelect = (field: keyof FilterState, value: any) => {
    setFilters(prev => {
        const list = prev[field] as any[];
        return { ...prev, [field]: list.includes(value) ? list.filter(v => v !== value) : [...list, value] };
    });
  };

  const resetFilters = () => setFilters({ search: '', types: [], accounts: [], category: '', subcategory: '', tag: '', year: currentYear, months: [], amountSign: 'all' });

  const getKindBadge = (kind: string) => {
    const styles: any = { personal: "text-indigo-600 bg-indigo-50 border-indigo-100", essential: "text-rose-600 bg-rose-50 border-rose-100", work: "text-amber-600 bg-amber-50 border-amber-100", transfer: "text-blue-600 bg-blue-50 border-blue-100" };
    return <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${styles[kind] || "bg-slate-50 text-slate-500 border-slate-200"}`}>{kind}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
           <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Movimenti</h2>
           <button 
              onClick={() => setIsInfoOpen(true)}
              className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
           >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-stretch">
        <div className="relative flex-1">
          <input type="text" placeholder="Cerca..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 shadow-sm" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-4 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        
        <div className="flex gap-2 items-center">
             {/* Year Selector Dropdown - Mobile Optimized */}
             <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-w-[120px] h-full flex items-center">
                <CustomSelect 
                    value={filters.year} 
                    onChange={(val) => setFilters(f => ({ ...f, year: String(val) }))} 
                    options={yearOptions}
                    minimal={false}
                    className="w-full h-full"
                />
             </div>
            
            <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`px-5 py-4 border rounded-2xl font-bold flex items-center space-x-2 transition-all whitespace-nowrap h-full ${showFilters ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                <span className="hidden md:inline">Filtri</span>
            </button>
            
            <button onClick={() => setModalState({ open: true })} className="px-5 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2 whitespace-nowrap h-full"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg><span className="hidden md:inline">NUOVO</span></button>
            <button onClick={resetFilters} className="px-5 py-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm h-full"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </div>

      {/* Pannello Filtri Collassabile - COMPACT */}
      {showFilters && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 mb-6 relative z-20 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="px-6 py-5 bg-[#fcfdfe] border-b border-slate-100 rounded-t-[2rem] flex flex-wrap gap-2">
                {monthNames.map((m, i) => <button key={m} onClick={() => toggleMultiSelect('months', i + 1)} className={`flex-1 min-w-[50px] py-2 text-[10px] font-bold rounded-xl border transition-all uppercase ${filters.months.includes(i + 1) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>{m}</button>)}
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Compact Classification */}
                <div className="space-y-3 relative z-50">
                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Classificazione</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <CustomSelect value={filters.category} onChange={(val) => setFilters(f => ({ ...f, category: val, subcategory: '' }))} options={[{value: '', label: 'Tutte'}, ...mainCategories.map(c => ({value: c.name, label: c.name}))]} />
                        <CustomSelect value={filters.subcategory} onChange={(val) => setFilters(f => ({ ...f, subcategory: val }))} options={[{value: '', label: 'Sottocategoria'}, ...subCategoryOptions.map(s => ({value: s, label: s}))]} disabled={!filters.category} />
                    </div>
                    <CustomSelect value={filters.tag} onChange={(val) => setFilters(f => ({ ...f, tag: val }))} options={[{value: '', label: 'Tag'}, ...tagOptions.map(t => ({value: t, label: t}))]} />
                </div>
                
                {/* Compact Types */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Tipo</h4>
                    <div className="flex flex-wrap gap-2">
                        {typeOptions.map(t => <button key={t} onClick={() => toggleMultiSelect('types', t)} className={`px-4 py-2 text-[10px] font-bold rounded-full border uppercase transition-colors ${filters.types.includes(t) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>{t}</button>)}
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Segno Importo</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setFilters(f => ({ ...f, amountSign: 'all' }))} className={`py-2 text-[10px] font-bold rounded-xl border transition-all uppercase tracking-wide ${filters.amountSign === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Tutti</button>
                        <button onClick={() => setFilters(f => ({ ...f, amountSign: 'positive' }))} className={`py-2 text-[10px] font-bold rounded-xl border transition-all uppercase tracking-wide ${filters.amountSign === 'positive' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Entrate</button>
                        <button onClick={() => setFilters(f => ({ ...f, amountSign: 'negative' }))} className={`py-2 text-[10px] font-bold rounded-xl border transition-all uppercase tracking-wide ${filters.amountSign === 'negative' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Uscite</button>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Conti</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                        {accountOptions.map(a => <button key={a} onClick={() => toggleMultiSelect('accounts', a)} className={`px-3 py-2 text-[10px] font-bold rounded-xl border text-left truncate ${filters.accounts.includes(a) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{a}</button>)}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ... TABELLA E CARDS ... */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-visible relative z-10">
         <div className="overflow-x-auto custom-scrollbar overflow-visible">
            <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                    <tr className="bg-[#fcfdfe] border-b border-slate-100">
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest w-[100px]">Data</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest w-[140px]">Conto</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest w-[180px]">Categoria</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right w-[140px]">Importo</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tag</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Descrizione</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right w-[120px]">Azioni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map(tx => {
                        const { category, subcategory } = getCategoryInfoFromMap(tx.category_id);
                        const acc = getAccountInfoFromMap(tx.account_id);
                        const isTransfer = tx.kind === 'transfer';
                        const amountColorClass = isTransfer ? 'text-blue-600' : (tx.amount_base || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';
                        const isSameCurrency = acc.currency === 'CHF';

                        return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3 text-xs font-bold text-slate-600 whitespace-nowrap">{new Date(tx.occurred_on).toLocaleDateString('it-IT')}</td>
                                <td className="px-4 py-3 text-xs font-semibold text-slate-600 truncate">{acc.name}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 truncate">{category}</span>
                                        {subcategory !== '-' && <span className="text-[10px] text-slate-400 truncate">{subcategory}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-sm font-black whitespace-nowrap ${amountColorClass}`}>
                                            {(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} 
                                            <span className="text-[10px] opacity-60 ml-1">{acc.currency}</span>
                                        </span>
                                        {!isSameCurrency && !isTransfer && (
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                               ≈ {(tx.amount_base || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} CHF
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 flex-wrap">
                                       {getKindBadge(tx.kind)}
                                       {tx.tag && <span className="px-1.5 py-0.5 border border-slate-200 rounded text-[9px] font-bold uppercase text-slate-500 bg-white">{tx.tag}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{tx.description || '-'}</td>
                                <td className="px-4 py-3 text-right space-x-1">
                                    {!isSameCurrency && !isTransfer && (
                                        <button 
                                            onClick={() => handleRefreshRate(tx, acc.currency)} 
                                            className="p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                            title="Aggiorna Cambio (Ricalcola CHF)"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                    )}
                                    <button onClick={() => setModalState({ open: true, initialData: tx })} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    <button onClick={() => setDeleteDialog({ open: true, tx })} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
         </div>
         <div className="px-10 py-6 bg-[#fcfdfe] border-t border-slate-100 flex justify-between items-center">
             <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Record</span><span className="text-lg font-bold text-slate-900">{filteredTransactions.length}</span></div>
         </div>
      </div>

      {/* MOBILE LIST: SWIPEABLE CARDS */}
      <div className="md:hidden space-y-3 relative z-10">
         {filteredTransactions.map(tx => {
            const { category, subcategory } = getCategoryInfoFromMap(tx.category_id);
            const acc = getAccountInfoFromMap(tx.account_id);
            const isTransfer = tx.kind === 'transfer';
            const amountColorClass = isTransfer ? 'text-blue-600' : (tx.amount_base || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';
            const isSameCurrency = acc.currency === 'CHF';
            
            return (
              <SwipeableTransactionItem 
                key={tx.id} 
                onEdit={() => setModalState({ open: true, initialData: tx })}
                onDelete={() => setDeleteDialog({ open: true, tx })}
              >
                  <div className="p-4 active:scale-[0.98] transition-transform">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{new Date(tx.occurred_on).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-sm font-bold text-slate-800">{category}</span>
                            {subcategory !== '-' && <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{subcategory}</span>}
                        </div>
                        </div>
                        <div className="flex flex-col items-end">
                        <span className={`text-base font-black ${amountColorClass}`}>
                            {(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            <span className="text-[9px] ml-0.5 opacity-60">{acc.currency}</span>
                        </span>
                        {!isSameCurrency && !isTransfer && (
                            <div className="flex items-center gap-1.5 mt-0.5 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">
                                    ≈ {(tx.amount_base || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} CHF
                                </span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRefreshRate(tx, acc.currency); }}
                                    className="p-0.5 text-slate-300 hover:text-blue-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                            </div>
                        )}
                        </div>
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1 w-full">
                        {tx.description && <span className="text-xs text-slate-500 truncate">{tx.description}</span>}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-[6px] bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-500 uppercase">{acc.name}</span>
                            {getKindBadge(tx.kind)}
                            {tx.tag && <span className="px-1.5 py-0.5 border border-slate-200 rounded text-[9px] font-bold uppercase text-slate-500 bg-white">#{tx.tag}</span>}
                        </div>
                        </div>
                    </div>
                  </div>
              </SwipeableTransactionItem>
            );
         })}
         {filteredTransactions.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-100 border-dashed">Nessun movimento trovato.</div>
         )}
      </div>

      <TransactionModal isOpen={modalState.open} onClose={() => setModalState({ open: false })} onSave={async (t) => { if(t.id) await updateTransaction(t.id, t); else await addTransaction(t); }} initialData={modalState.initialData} accounts={accounts} categories={categories} />
      
      <ConfirmModal isOpen={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })} onConfirm={async () => { if(deleteDialog.tx) await deleteTransaction(deleteDialog.tx.id); setDeleteDialog({ open: false }); }} title="Elimina Movimento" message={`Confermi l'eliminazione di "${deleteDialog.tx?.description}"?`} confirmText="Elimina" isDangerous={true} />
      
      <FullScreenModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Gestione Movimenti" subtitle="Help">
        <div className="space-y-6">
           <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100"><p className="text-sm text-blue-800 leading-relaxed font-medium">Questa sezione è il registro completo delle tue finanze. Qui puoi aggiungere, modificare e categorizzare ogni singola transazione.</p></div>
           
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Azioni Mobile</h4>
              <ul className="space-y-3">
                 <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></div>
                    <span className="text-sm text-slate-600">Scorri verso <strong>destra</strong> per Modificare.</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" /></svg></div>
                    <span className="text-sm text-slate-600">Scorri verso <strong>sinistra</strong> per Eliminare.</span>
                 </li>
              </ul>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};