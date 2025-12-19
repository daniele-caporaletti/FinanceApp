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
      setFormData(initialData || {
        name: '',
        currency_code: 'CHF',
        status: 'active',
        exclude_from_overview: false
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
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

          <div 
            onClick={() => setFormData(f => ({ ...f, exclude_from_overview: !f.exclude_from_overview }))}
            className="flex items-center justify-center p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-100 gap-3"
          >
            <span className="text-xs font-bold text-slate-700">Mostra in Overview</span>
            <div className={`w-10 h-5 rounded-full relative transition-all ${!formData.exclude_from_overview ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${!formData.exclude_from_overview ? 'left-6' : 'left-1'}`}></div>
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
}

const SwipeableAccountItem: React.FC<SwipeableAccountProps> = ({ children, onEdit, onToggle, isHidden }) => {
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
    
    if (Math.abs(diff) > 5) {
        isSwiping.current = true;
        if (diff > -150 && diff < 150) {
            setOffsetX(diff);
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
  };

  const handleClick = () => {
      if (isSwiping.current) return;
      // Bounce Hint: Right (Edit) -> Left (Toggle) -> Center
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

  const bgStyle = offsetX > 0 ? 'bg-blue-600' : 'bg-slate-700'; // Right: Blue, Left: Dark Slate

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

  const calculateBalance = (accountId: string) => {
    return transactions
      .filter(t => t.account_id === accountId)
      .reduce((sum, t) => {
        const amount = t.amount_original || 0;
        if (t.kind === 'expense') return sum - Math.abs(amount);
        if (t.kind === 'income') return sum + Math.abs(amount);
        return sum + amount;
      }, 0);
  };

  const activeAccounts = useMemo(() => accounts.filter(a => a.status === 'active'), [accounts]);
  const inactiveAccounts = useMemo(() => accounts.filter(a => a.status !== 'active'), [accounts]);
  
  const totalActiveBalance = useMemo(() => {
    return activeAccounts.reduce((sum, acc) => {
        const balance = calculateBalance(acc.id);
        const rate = rates[acc.currency_code] || 1;
        return sum + (balance * rate);
    }, 0);
  }, [activeAccounts, transactions, rates]);

  const displayedAccounts = useMemo(() => {
    const list = showInactive ? [...activeAccounts, ...inactiveAccounts] : activeAccounts;
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeAccounts, inactiveAccounts, showInactive]);

  const handleSaveAccount = async (payload: Partial<Account>) => {
    if (payload.id) {
      await updateAccount(payload.id, payload);
    } else {
      await addAccount(payload);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
           <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Conti</h2>
           <button 
              onClick={() => setIsInfoOpen(true)}
              className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
           >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </button>
      </div>

      {/* Upper Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm w-full lg:w-auto">
          <button
            onClick={() => setShowInactive(false)}
            className={`flex-1 lg:flex-none px-6 lg:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${!showInactive ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Attivi
          </button>
          <button
            onClick={() => setShowInactive(true)}
            className={`flex-1 lg:flex-none px-6 lg:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${showInactive ? 'bg-slate-900 text-white shadow-lg shadow-slate-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Tutti
          </button>
        </div>

        <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto space-x-8 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">Patrimonio Attivo</span>
          <div className="flex flex-col items-end">
            <span className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patrimonio Attivo</span>
            <span className="text-xl font-black text-slate-900">
              CHF {totalActiveBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* VISTA DESKTOP: TABELLA */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfdfe] border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conto</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Saldo</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">In Overview</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedAccounts.map((account) => {
                const balance = calculateBalance(account.id);
                const isActive = account.status === 'active';
                const isExcluded = account.exclude_from_overview;

                return (
                  <tr key={account.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{account.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{account.currency_code} Account</div>
                    </td>
                    <td className={`px-8 py-5 text-right text-lg font-black tracking-tight ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-300 ml-1">{account.currency_code}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {isActive ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => updateAccount(account.id, { exclude_from_overview: !isExcluded })}
                        className={`p-1.5 rounded-lg border transition-all inline-flex ${!isExcluded ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                        title={isExcluded ? "Nascosto in dashboard" : "Visibile in dashboard"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => setModalState({ open: true, initialData: account })}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Row per aggiunta conto */}
              <tr 
                onClick={() => setModalState({ open: true })}
                className="hover:bg-blue-50/30 transition-colors cursor-pointer border-t-2 border-dashed border-slate-100"
              >
                <td colSpan={5} className="px-8 py-6 text-center text-slate-400 group">
                  <div className="flex items-center justify-center space-x-2 font-bold text-xs uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    <span>Aggiungi Nuovo Conto</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MOBILE: LISTA COMPATTA SWIPEABLE */}
      <div className="md:hidden space-y-3 relative z-10">
        {displayedAccounts.map((account) => {
           const balance = calculateBalance(account.id);
           const isActive = account.status === 'active';
           const isExcluded = account.exclude_from_overview;
           
           return (
             <SwipeableAccountItem
                key={account.id}
                onEdit={() => setModalState({ open: true, initialData: account })}
                onToggle={() => updateAccount(account.id, { exclude_from_overview: !isExcluded })}
                isHidden={isExcluded}
             >
                <div className="p-4 active:scale-[0.98] transition-transform flex items-center justify-between">
                   {/* Left: Name & Badges */}
                   <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-bold text-slate-900">{account.name}</span>
                         {isExcluded && <div className="w-1.5 h-1.5 rounded-full bg-slate-300" title="Nascosto in overview"></div>}
                      </div>
                      <div className="flex items-center gap-1.5">
                         <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{account.currency_code}</span>
                         {!isActive && <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inattivo</span>}
                      </div>
                   </div>

                   {/* Right: Balance */}
                   <div className="flex flex-col items-end">
                      <span className={`text-base font-black ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                         {balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400">Saldo Attuale</span>
                   </div>
                </div>
             </SwipeableAccountItem>
           );
        })}
        
        <button 
           onClick={() => setModalState({ open: true })}
           className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 font-bold text-sm hover:bg-slate-50 hover:border-blue-200 hover:text-blue-500 transition-all flex items-center justify-center space-x-2"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
           <span>Nuovo Conto</span>
        </button>
      </div>

      <AccountModal 
        isOpen={modalState.open} 
        onClose={() => setModalState({ open: false })}
        onSave={handleSaveAccount}
        initialData={modalState.initialData}
      />

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Gestione Conti"
        subtitle="Help"
      >
        <div className="space-y-6">
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Gestisci i conti su cui vengono registrate le transazioni.
               </p>
           </div>
           
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Azioni Mobile</h4>
              <ul className="space-y-3">
                 <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></div>
                    <span className="text-sm text-slate-600">Scorri verso <strong>destra</strong> per Modificare.</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                    <span className="text-sm text-slate-600">Scorri verso <strong>sinistra</strong> per Nascondere/Mostrare.</span>
                 </li>
              </ul>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};