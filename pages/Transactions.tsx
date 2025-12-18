
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { Transaction, Category, Account } from '../types';
import { fetchExchangeRate } from '../utils/helpers';
import { ConfirmModal } from '../components/ConfirmModal';

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

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => Promise<void>;
  initialData?: Partial<Transaction>;
  accounts: Account[];
  categories: Category[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, initialData, accounts, categories }) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({});
  const [loading, setLoading] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const initialKind = initialData?.kind || 'essential';
      setFormData(initialData || {
        occurred_on: new Date().toISOString().split('T')[0],
        kind: initialKind,
        amount_original: 0,
        amount_base: 0,
        account_id: accounts[0]?.id || '',
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
    setLoading(true);
    try {
      const selectedAccount = accounts.find(a => a.id === formData.account_id);
      const currency = selectedAccount?.currency_code || 'CHF';
      const date = formData.occurred_on || new Date().toISOString().split('T')[0];
      const originalAmount = formData.amount_original || 0;
      let baseAmount = originalAmount;

      if (currency !== 'CHF') {
        const rate = await fetchExchangeRate(date, currency, 'CHF');
        baseAmount = originalAmount * rate;
      }

      await onSave({ ...formData, amount_original: originalAmount, amount_base: baseAmount });
      onClose();
    } catch (err) { alert("Errore durante il salvataggio."); } finally { setLoading(false); }
  };

  const mainCategories = categories.filter(c => !c.parent_id).sort((a,b) => a.name.localeCompare(b.name));
  const subCategories = selectedParentId ? categories.filter(c => c.parent_id === selectedParentId).sort((a,b) => a.name.localeCompare(b.name)) : [];
  const selectedAccount = accounts.find(a => a.id === formData.account_id);
  const currencyLabel = selectedAccount?.currency_code || 'CHF';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-10 py-7 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">{initialData?.id ? 'Modifica Movimento' : 'Nuovo Movimento'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestione Transazione</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data</label><input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.occurred_on?.split('T')[0] || ''} onChange={e => setFormData(f => ({ ...f, occurred_on: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tipo</label><select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none" value={formData.kind || 'essential'} onChange={e => setFormData(f => ({ ...f, kind: e.target.value }))}><option value="essential">Essential</option><option value="personal">Personal</option><option value="work">Work</option><option value="transfer">Giroconto</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Conto</label><select required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none" value={formData.account_id || ''} onChange={e => setFormData(f => ({ ...f, account_id: e.target.value }))}>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency_code})</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Importo ({currencyLabel})</label><input type="number" step="0.01" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.amount_original || 0} onChange={e => setFormData(f => ({ ...f, amount_original: parseFloat(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Categoria</label><select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none" value={selectedParentId} onChange={e => { setSelectedParentId(e.target.value); setFormData(f => ({ ...f, category_id: e.target.value || null })); }}><option value="">Seleziona...</option>{mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Sottocategoria</label><select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none disabled:opacity-50" value={formData.category_id || ''} disabled={!selectedParentId} onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}><option value={selectedParentId}>Generica</option>{subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tag</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="es. vacanze..." value={formData.tag || ''} onChange={e => setFormData(f => ({ ...f, tag: e.target.value }))} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Descrizione</label><textarea rows={2} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 resize-none" placeholder="..." value={formData.description || ''} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} /></div>
          <button type="submit" disabled={loading} className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all ${loading ? 'opacity-50' : ''}`}>{loading ? '...' : 'Salva'}</button>
        </form>
      </div>
    </div>
  );
};

export const Transactions: React.FC = () => {
  const { transactions, categories, accounts, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const { navigationParams, navigateTo } = useNavigation();
  
  const currentYear = new Date().getFullYear().toString();
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<Transaction> }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tx?: Transaction }>({ open: false });

  const [filters, setFilters] = useState<FilterState>({
    search: '', types: [], accounts: [], category: '', subcategory: '', tag: '', 
    year: currentYear, 
    months: [],
    amountSign: 'all'
  });

  // Leggi i parametri di navigazione (dalla Dashboard) all'avvio
  useEffect(() => {
    if (navigationParams) {
      setFilters(prev => ({
        ...prev,
        ...navigationParams,
      }));
      navigateTo('movimenti' as any, null);
    }
  }, [navigationParams, navigateTo]);

  const availableYears = useMemo(() => {
    const years = transactions.map(t => new Date(t.occurred_on).getFullYear());
    const unique = Array.from(new Set(years));
    if (!unique.includes(parseInt(currentYear))) unique.push(parseInt(currentYear));
    return unique.sort((a, b) => b - a).map(String);
  }, [transactions, currentYear]);

  const getCategoryInfo = (id: string | null) => {
    if (!id) return { category: '-', subcategory: '-', categoryId: null };
    const cat = categories.find(c => c.id === id);
    if (!cat) return { category: '-', subcategory: '-', categoryId: null };
    const parent = cat.parent_id ? categories.find(p => p.id === cat.parent_id) : null;
    return { category: parent ? parent.name : cat.name, subcategory: parent ? cat.name : '-', categoryId: parent?.id || cat.id };
  };

  const getAccountInfo = (id: string) => {
    const a = accounts.find(ac => ac.id === id);
    return a ? { name: a.name, currency: a.currency_code } : { name: '?', currency: '' };
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const { category, subcategory } = getCategoryInfo(tx.category_id);
      const acc = getAccountInfo(tx.account_id);
      const d = new Date(tx.occurred_on);
      
      const matchSearch = !filters.search || 
        tx.description?.toLowerCase().includes(filters.search.toLowerCase()) || 
        tx.amount_base?.toString().includes(filters.search) ||
        tx.tag?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchType = filters.types.length === 0 || filters.types.includes(tx.kind);
      const matchAccount = filters.accounts.length === 0 || filters.accounts.includes(acc.name);
      const matchCategory = !filters.category || category === filters.category;
      const matchSub = !filters.subcategory || subcategory === filters.subcategory;
      const matchTag = !filters.tag || tx.tag === filters.tag;
      const matchYear = !filters.year || d.getFullYear().toString() === filters.year;
      const matchMonth = filters.months.length === 0 || filters.months.includes(d.getMonth() + 1);
      
      const matchSign = filters.amountSign === 'all' 
        || (filters.amountSign === 'positive' && (tx.amount_base || 0) > 0)
        || (filters.amountSign === 'negative' && (tx.amount_base || 0) < 0);

      return matchSearch && matchType && matchAccount && matchCategory && matchSub && matchTag && matchYear && matchMonth && matchSign;
    }).sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime());
  }, [transactions, filters, categories, accounts]);

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
    const styles: any = { personal: "bg-indigo-50 text-indigo-600", essential: "bg-rose-50 text-rose-600", work: "bg-amber-50 text-amber-600", transfer: "bg-blue-50 text-blue-600" };
    return <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase border border-transparent ${styles[kind] || "bg-slate-50 text-slate-600"}`}>{kind}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="relative flex-1">
          <input type="text" placeholder="Cerca..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 shadow-sm" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-4 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <div className="flex items-center p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto no-scrollbar">
            {availableYears.map(y => <button key={y} onClick={() => setFilters(f => ({ ...f, year: y }))} className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filters.year === y ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>{y}</button>)}
        </div>
        <button onClick={() => setModalState({ open: true })} className="px-6 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2 whitespace-nowrap"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg><span>NUOVO</span></button>
        <button onClick={resetFilters} className="px-5 py-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-[#fcfdfe] border-b border-slate-100 flex flex-wrap gap-2">
            {monthNames.map((m, i) => <button key={m} onClick={() => toggleMultiSelect('months', i + 1)} className={`flex-1 min-w-[60px] py-3 text-xs font-bold rounded-xl border transition-all ${filters.months.includes(i + 1) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>{m}</button>)}
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Classificazione</h4>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none appearance-none" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, subcategory: '' }))}><option value="">Tutte</option>{mainCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                <select disabled={!filters.category} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none appearance-none disabled:opacity-50" value={filters.subcategory} onChange={e => setFilters(f => ({ ...f, subcategory: e.target.value }))}><option value="">Sottocategoria</option>{subCategoryOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none appearance-none" value={filters.tag} onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))}><option value="">Tag</option>{tagOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Tipo</h4>
                <div className="grid grid-cols-2 gap-2">
                    {typeOptions.map(t => <button key={t} onClick={() => toggleMultiSelect('types', t)} className={`px-3 py-3 text-[11px] font-bold rounded-xl border uppercase ${filters.types.includes(t) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{t}</button>)}
                </div>
            </div>
            <div className="space-y-4">
                 <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Segno Importo</h4>
                 <div className="flex flex-col gap-2">
                    <button onClick={() => setFilters(f => ({ ...f, amountSign: 'all' }))} className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all ${filters.amountSign === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Tutti</button>
                    <button onClick={() => setFilters(f => ({ ...f, amountSign: 'positive' }))} className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all ${filters.amountSign === 'positive' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Entrate (+)</button>
                    <button onClick={() => setFilters(f => ({ ...f, amountSign: 'negative' }))} className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all ${filters.amountSign === 'negative' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Uscite (-)</button>
                 </div>
            </div>
            <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>Conti (Attivi)</h4>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {accountOptions.map(a => <button key={a} onClick={() => toggleMultiSelect('accounts', a)} className={`px-3 py-2 text-[10px] font-bold rounded-xl border text-left truncate ${filters.accounts.includes(a) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>{a}</button>)}
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1400px]">
                <thead><tr className="bg-[#fcfdfe] border-b border-slate-100"><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">Data</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">Tipo</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">Conto</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase text-right">Imp. Orig.</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase text-right">Base (CHF)</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">Categoria</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">Sotto-cat.</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">Tag</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase">Descrizione</th><th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase text-right">Azioni</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map(tx => {
                        const { category, subcategory } = getCategoryInfo(tx.category_id);
                        const acc = getAccountInfo(tx.account_id);
                        const isTransfer = tx.kind === 'transfer';
                        // Logic for color: Blue if transfer, else Green if positive, Red if negative
                        const amountColorClass = isTransfer ? 'text-blue-600' : (tx.amount_base || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';

                        return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-5 text-sm font-medium text-slate-600 whitespace-nowrap">{new Date(tx.occurred_on).toLocaleDateString('it-IT')}</td>
                                <td className="px-6 py-5">{getKindBadge(tx.kind)}</td>
                                <td className="px-6 py-5 text-sm font-bold text-slate-800">{acc.name}</td>
                                <td className={`px-6 py-5 text-sm font-mono text-right whitespace-nowrap ${amountColorClass}`}>{(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="opacity-50 text-[10px]">{acc.currency}</span></td>
                                <td className={`px-6 py-5 text-[15px] font-bold text-right whitespace-nowrap ${amountColorClass}`}>{(tx.amount_base || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="opacity-50 text-[10px]">CHF</span></td>
                                <td className="px-6 py-5 text-sm text-slate-600"><span className="px-3 py-1 bg-slate-100 rounded-lg text-[11px] font-bold uppercase">{category}</span></td>
                                <td className="px-6 py-5 text-xs font-bold text-blue-600">{subcategory !== '-' ? subcategory : '-'}</td>
                                <td className="px-6 py-5"><span className="px-2 py-1 border border-slate-200 rounded text-[10px] font-bold uppercase text-slate-500 bg-white">{tx.tag || '-'}</span></td>
                                <td className="px-6 py-5 text-sm text-slate-500 max-w-xs truncate">{tx.description || '-'}</td>
                                <td className="px-6 py-5 text-right space-x-1"><button onClick={() => setModalState({ open: true, initialData: tx })} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button><button onClick={() => setDeleteDialog({ open: true, tx })} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
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

      <TransactionModal isOpen={modalState.open} onClose={() => setModalState({ open: false })} onSave={async (t) => { if(t.id) await updateTransaction(t.id, t); else await addTransaction(t); }} initialData={modalState.initialData} accounts={accounts} categories={categories} />
      
      <ConfirmModal 
        isOpen={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={async () => { if(deleteDialog.tx) await deleteTransaction(deleteDialog.tx.id); setDeleteDialog({ open: false }); }}
        title="Elimina Movimento"
        message={`Confermi l'eliminazione di "${deleteDialog.tx?.description}"?`}
        confirmText="Elimina"
        isDangerous={true}
      />
    </div>
  );
};
