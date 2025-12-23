
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFinance } from '../FinanceContext';
import { Account } from '../types';
import { FullScreenModal } from '../components/FullScreenModal';
import { CustomSelect } from '../components/CustomSelect';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Partial<Account>) => Promise<void>;
  initialData?: Partial<Account>;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<Account>>({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialData,
        // Ensure defaults are set correctly
        name: initialData?.name || '',
        currency_code: initialData?.currency_code || 'CHF',
        status: initialData?.status || 'active',
        kind: initialData?.kind || 'cash',
        exclude_from_overview: initialData?.exclude_from_overview ?? false 
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      alert("Errore durante l'operazione.");
    } finally {
      setLoading(false);
    }
  };

  const currencyOptions = [
      { value: 'CHF', label: 'CHF' },
      { value: 'EUR', label: 'EUR' },
      { value: 'USD', label: 'USD' }
  ];

  const statusOptions = [
      { value: 'active', label: 'Attivo' },
      { value: 'inactive', label: 'Inattivo' }
  ];

  const kindOptions = [
      { value: 'cash', label: 'Liquidità (Cash)' },
      { value: 'pocket', label: 'Pocket (Risparmio)' },
      { value: 'invest', label: 'Investimento' },
      { value: 'pension', label: 'Fondo Pensione' }
  ];

  // LOGICA: 
  // exclude_from_overview = true  -> NASCOSTO
  // exclude_from_overview = false -> VISIBILE (Default)
  const isVisible = !formData.exclude_from_overview;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData?.id ? 'Modifica Conto' : 'Nuovo Conto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome</label>
            <input 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-semibold"
              value={formData.name || ''}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tipologia (Kind)</label>
             <CustomSelect value={formData.kind} onChange={(val) => setFormData(f => ({ ...f, kind: val }))} options={kindOptions} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Valuta</label>
              <CustomSelect value={formData.currency_code} onChange={(val) => setFormData(f => ({ ...f, currency_code: val }))} options={currencyOptions} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Stato</label>
              <CustomSelect value={formData.status} onChange={(val) => setFormData(f => ({ ...f, status: val }))} options={statusOptions} />
            </div>
          </div>

          {/* TOGGLE VISIBILITY */}
          <div 
            onClick={() => setFormData(f => ({ ...f, exclude_from_overview: !f.exclude_from_overview }))}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${isVisible ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}
          >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isVisible ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                    {isVisible ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className={`text-xs font-bold ${isVisible ? 'text-blue-700' : 'text-slate-500'}`}>
                        {isVisible ? 'Visibile in Dashboard' : 'Nascosto dalla Dashboard'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                        {isVisible ? 'Il conto contribuisce ai totali' : 'Il conto è escluso dai totali'}
                    </span>
                </div>
            </div>
            
            <div className={`w-12 h-7 rounded-full relative transition-all duration-300 ${isVisible ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${isVisible ? 'left-6' : 'left-1'}`}></div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-50 hover:bg-blue-700 transition-all active:scale-[0.98] ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Sincronizzazione...' : 'Conferma'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MOBILE SWIPEABLE ITEM FOR ACCOUNTS ---
interface SwipeableAccountProps { 
  children: React.ReactNode; 
  onEdit: () => void; 
  onToggle: () => void;
  isHidden: boolean; 
  colorClass: string;
}

const SwipeableAccountItem: React.FC<SwipeableAccountProps> = ({ children, onEdit, onToggle, isHidden, colorClass }) => {
  const [offsetX, setOffsetX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setOffsetX(0); 
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 10) {
            isSwiping.current = true;
            if (diffX > -150 && diffX < 150) {
                setOffsetX(diffX);
            }
        }
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(offsetX) > 80) {
      if (offsetX > 0) {
        onEdit(); // Swipe Right
      } else {
        onToggle(); // Swipe Left
      }
    }
    setOffsetX(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleClick = () => {
      if (isSwiping.current) return;
      setOffsetX(40);
      setTimeout(() => {
          setOffsetX(0);
          setTimeout(() => {
              setOffsetX(-40);
              setTimeout(() => {
                  setOffsetX(0);
              }, 250);
          }, 250);
      }, 250);
  };

  const bgStyle = offsetX > 0 ? colorClass : 'bg-slate-700';

  const actionContent = offsetX > 0 ? (
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest animate-in fade-in zoom-in duration-200">
         <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
         <span>Modifica</span>
      </div>
  ) : (
      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white flex items-center gap-1 font-bold text-xs uppercase tracking-widest animate-in fade-in zoom-in duration-200">
         <span>{isHidden ? 'Mostra' : 'Nascondi'}</span>
         {isHidden ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
         ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
         )}
      </div>
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl mb-3 shadow-sm border border-slate-100 ${Math.abs(offsetX) > 20 ? bgStyle : 'bg-white'}`}>
       {Math.abs(offsetX) > 20 && actionContent}
       <div 
         ref={itemRef}
         className="bg-white rounded-2xl relative z-10 transition-transform duration-300 ease-out active:duration-0 cursor-pointer"
         style={{ 
             transform: `translateX(${offsetX}px)`,
             touchAction: 'pan-y'
         }}
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

export const Accounts: React.FC = () => {
  const { accounts, transactions, updateAccount, addAccount } = useFinance();
  const [showInactive, setShowInactive] = useState(false);
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<Account> }>({ open: false });
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Tassi di cambio per il calcolo totale
  const [rates, setRates] = useState<Record<string, number>>({ CHF: 1, EUR: 1, USD: 1 });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [resEur, resUsd] = await Promise.all([
          fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=CHF'),
          fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=CHF')
        ]);
        
        const dataEur = resEur.ok ? await resEur.json() : null;
        const dataUsd = resUsd.ok ? await resUsd.json() : null;
        
        setRates({ 
            CHF: 1, 
            EUR: dataEur?.rates?.CHF ?? 1, 
            USD: dataUsd?.rates?.CHF ?? 1 
        });
      } catch (error) { 
          console.error("Rate fetch error", error); 
          setRates({ CHF: 1, EUR: 1, USD: 1 });
      }
    };
    fetchRates();
  }, []);

  const calculateBalance = (accountId: string) => {
    const balance = transactions
      .filter(t => t.account_id === accountId)
      .reduce((sum, t) => {
        const amount = t.amount_original || 0;
        if (t.kind === 'expense') return sum - Math.abs(amount);
        if (t.kind === 'income') return sum + Math.abs(amount);
        return sum + amount;
      }, 0);
    
    const rounded = Math.round(balance * 100) / 100;
    return rounded === 0 ? 0 : rounded;
  };

  const getFilteredAccounts = (kind: string) => {
      const list = accounts.filter(a => (a.kind || 'cash') === kind);
      if (showInactive) return list;
      return list.filter(a => a.status === 'active');
  };

  const calculateSectionTotal = (kind: string) => {
      const list = accounts.filter(a => (a.kind || 'cash') === kind && a.status === 'active');
      return list.reduce((sum, acc) => {
          const balance = calculateBalance(acc.id);
          const rate = rates[acc.currency_code] || 1;
          return sum + (balance * rate);
      }, 0);
  };

  const totalAllAssets = useMemo(() => {
      const allActive = accounts.filter(a => a.status === 'active');
      return allActive.reduce((sum, acc) => {
          const balance = calculateBalance(acc.id);
          const rate = rates[acc.currency_code] || 1;
          return sum + (balance * rate);
      }, 0);
  }, [accounts, transactions, rates]);

  const handleSaveAccount = async (payload: Partial<Account>) => {
    if (payload.id) {
      await updateAccount(payload.id, payload);
    } else {
      await addAccount(payload);
    }
  };

  // --- RENDER SECTION COMPONENT ---
  const AccountSection = ({ title, kind, icon, colorTheme, mainColor }: { title: string, kind: string, icon: React.ReactNode, colorTheme: string, mainColor: string }) => {
      const sectionAccounts = getFilteredAccounts(kind).sort((a,b) => a.name.localeCompare(b.name));
      const sectionTotal = calculateSectionTotal(kind);

      // Definisci stili in base al tema
      const headerBg = colorTheme === 'blue' ? 'bg-slate-50' 
        : colorTheme === 'indigo' ? 'bg-indigo-50/50' 
        : colorTheme === 'emerald' ? 'bg-emerald-50/50' 
        : 'bg-amber-50/50';
      
      const borderColor = colorTheme === 'blue' ? 'border-slate-200' 
        : colorTheme === 'indigo' ? 'border-indigo-100' 
        : colorTheme === 'emerald' ? 'border-emerald-100' 
        : 'border-amber-100';

      const iconBg = colorTheme === 'blue' ? 'bg-slate-200 text-slate-500' 
        : colorTheme === 'indigo' ? 'bg-indigo-100 text-indigo-600' 
        : colorTheme === 'emerald' ? 'bg-emerald-100 text-emerald-600' 
        : 'bg-amber-100 text-amber-600';

      return (
        <section className={`bg-transparent shadow-none border-none md:bg-white md:rounded-[2rem] md:shadow-sm md:border ${borderColor} overflow-hidden mb-6 last:mb-0`}>
            {/* Header Section: Card on Mobile, Top Bar on Desktop */}
            <div className={`px-6 py-5 bg-white rounded-[2rem] shadow-sm border border-slate-200 md:shadow-none md:border-0 md:rounded-none md:border-b md:border-slate-100 ${headerBg} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">{title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sectionAccounts.length} Conti</p>
                    </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Totale Sezione</span>
                        <span className={`text-lg font-black text-slate-900`}>
                            {sectionTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-bold">CHF</span>
                        </span>
                    </div>
                    <button 
                        onClick={() => setModalState({ open: true, initialData: { kind: kind as any, currency_code: 'CHF' } })}
                        className={`p-2.5 rounded-xl text-white shadow-lg transition-all active:scale-95 ${mainColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : mainColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : mainColor === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
            </div>

            {/* LISTA CONTI */}
            <div className="p-0 mt-3 space-y-3 md:space-y-0 md:mt-0">
                {sectionAccounts.length > 0 ? (
                    <div className="md:divide-y md:divide-slate-50">
                        {sectionAccounts.map(acc => {
                            const balance = calculateBalance(acc.id);
                            // exclude_from_overview = true -> NASCOSTO
                            const isExcluded = acc.exclude_from_overview;
                            const isActive = acc.status === 'active';

                            return (
                                <div key={acc.id}>
                                    {/* Desktop Row */}
                                    <div className="hidden md:flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors"></div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{acc.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{acc.currency_code}</span>
                                                    {!isActive && <span className="text-[9px] font-bold text-slate-400">Inattivo</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className={`text-right ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                                                <span className="text-base font-black">{balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                                                <span className="text-[10px] text-slate-400 font-bold ml-1">{acc.currency_code}</span>
                                            </div>
                                            {/* Action Buttons: Visible by default on Desktop */}
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => updateAccount(acc.id, { exclude_from_overview: !isExcluded })}
                                                    className={`p-2 rounded-lg transition-all ${!isExcluded ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                                                    title={!isExcluded ? "Visibile in dashboard" : "Nascosto dalla dashboard"}
                                                >
                                                    {/* Eye Logic: !isExcluded (Visible) = Eye Open; isExcluded (Hidden) = Eye Off */}
                                                    {!isExcluded ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => setModalState({ open: true, initialData: acc })}
                                                    className="p-2 text-slate-300 hover:text-slate-600 rounded-lg transition-all"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Row (Swipeable) */}
                                    <div className="md:hidden">
                                        <SwipeableAccountItem
                                            onEdit={() => setModalState({ open: true, initialData: acc })}
                                            onToggle={() => updateAccount(acc.id, { exclude_from_overview: !isExcluded })}
                                            isHidden={isExcluded}
                                            colorClass={`bg-${mainColor}-600`}
                                        >
                                            <div className="p-4 flex items-center justify-between">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900">{acc.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{acc.currency_code}</span>
                                                        
                                                        {/* Status Badges */}
                                                        {!isActive && (
                                                            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                Inattivo
                                                            </span>
                                                        )}
                                                        {isExcluded && (
                                                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                                Nascosto
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-base font-black ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                                                        {balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{acc.currency_code}</span>
                                                </div>
                                            </div>
                                        </SwipeableAccountItem>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium italic">
                        Nessun conto in questa sezione.
                    </div>
                )}
            </div>
        </section>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-3 mb-2">
           <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Conti</h2>
           <button onClick={() => setIsInfoOpen(true)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </button>
      </div>
      
      {/* ... Rest of Accounts Component (Upper Control Bar, Sections, Modals) - No changes here */}
      
      {/* Upper Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm w-full lg:w-auto">
          <button onClick={() => setShowInactive(false)} className={`flex-1 lg:flex-none px-6 lg:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${!showInactive ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>Attivi</button>
          <button onClick={() => setShowInactive(true)} className={`flex-1 lg:flex-none px-6 lg:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${showInactive ? 'bg-slate-900 text-white shadow-lg shadow-slate-100' : 'text-slate-500 hover:bg-slate-50'}`}>Tutti</button>
        </div>
        <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto space-x-8 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">Totale Asset</span>
          <div className="flex flex-col items-end">
            <span className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Asset (Tutti i tipi)</span>
            <span className="text-xl font-black text-slate-900">CHF {totalAllAssets.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
          <AccountSection title="Liquidità" kind="cash" mainColor="blue" colorTheme="blue" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
          <AccountSection title="Pockets & Risparmi" kind="pocket" mainColor="indigo" colorTheme="indigo" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
          <AccountSection title="Investimenti" kind="invest" mainColor="emerald" colorTheme="emerald" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
          <AccountSection title="Fondi Pensione" kind="pension" mainColor="amber" colorTheme="amber" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      </div>

      <AccountModal isOpen={modalState.open} onClose={() => setModalState({ open: false })} onSave={handleSaveAccount} initialData={modalState.initialData} />
      <FullScreenModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Gestione Conti" subtitle="Help">
        <div className="space-y-6">
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100"><p className="text-sm text-slate-600 leading-relaxed font-medium">Organizza i tuoi asset in quattro categorie principali per una migliore chiarezza finanziaria.</p></div>
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tipologie</h4>
              <ul className="space-y-3">
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5"></div><p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Liquidità (Cash):</span> Conti correnti, contanti, carte di credito. Soldi pronti all'uso.</p></li>
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5"></div><p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Pocket:</span> Conti di risparmio o accantonamento per obiettivi specifici (Vacanze, Tasse).</p></li>
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5"></div><p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Investimenti:</span> ETF, Azioni, Crypto. Asset che fluttuano di valore.</p></li>
                 <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5"></div><p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Pensione:</span> Fondi pensione integrativi o pilastri vincolati.</p></li>
              </ul>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};
