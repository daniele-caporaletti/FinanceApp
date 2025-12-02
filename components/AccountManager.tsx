import React, { useState, useMemo } from 'react';
import { DbAccount, MegaTransaction } from '../types';
import { addAccount, toggleAccountActive, toggleAccountSelect } from '../services/supabaseService';
import { Plus, Check, AlertTriangle, Eye, EyeOff, CheckSquare, Square, Wallet, MoreVertical } from 'lucide-react';

interface AccountManagerProps {
  accounts: DbAccount[];
  transactions: MegaTransaction[];
}

export const AccountManager: React.FC<AccountManagerProps> = ({ accounts, transactions }) => {
  const [showInactive, setShowInactive] = useState(false);
  
  // New Account Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState('EUR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate Balances
  const balances = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      const current = map.get(t.account_id) || 0;
      map.set(t.account_id, current + t.amount_original);
    });
    return map;
  }, [transactions]);

  // Filter accounts for display
  const displayedAccounts = useMemo(() => {
    return accounts.filter(a => showInactive || a.is_active);
  }, [accounts, showInactive]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await addAccount(newName.trim(), newCurrency.trim());
      setNewName('');
      setNewCurrency('EUR');
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Error adding account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-indigo-600" /> Gestione Conti
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Configura i tuoi wallet</p>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Toggle Show Inactive */}
           <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-500 select-none bg-slate-50 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors">
             <input 
               type="checkbox" 
               checked={showInactive} 
               onChange={(e) => setShowInactive(e.target.checked)}
               className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
             />
             Inattivi
           </label>

           <button 
             onClick={() => setIsAdding(!isAdding)}
             className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 text-sm font-bold"
           >
             <Plus size={18} />
             <span className="hidden sm:inline">Nuovo Conto</span>
           </button>
        </div>
      </div>

      {/* Add Account Form */}
      {isAdding && (
        <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 animate-in fade-in slide-in-from-top-2">
           <div className="max-w-2xl mx-auto">
              <div className="flex items-start gap-3 mb-6 p-4 bg-white/60 text-amber-800 rounded-2xl border border-amber-100/50 shadow-sm">
                <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-500" />
                <p className="text-sm leading-relaxed">
                  <strong>Attenzione:</strong> La creazione è permanente.
                </p>
              </div>

              <form onSubmit={handleAddAccount} className="flex flex-col sm:flex-row gap-4 items-end">
                 <div className="flex-1 w-full space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Nome Conto</label>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                      placeholder="Es. Intesa Sanpaolo"
                      required
                    />
                 </div>
                 <div className="w-32 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Valuta</label>
                    <input 
                      type="text" 
                      value={newCurrency}
                      onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm font-mono text-center"
                      placeholder="EUR"
                      required
                      maxLength={3}
                    />
                 </div>
                 <button 
                   type="submit" 
                   disabled={isSubmitting}
                   className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-bold shadow-lg shadow-indigo-200"
                 >
                   {isSubmitting ? '...' : 'Salva'}
                 </button>
              </form>
              {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
           </div>
        </div>
      )}

      {/* Accounts GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAccounts.map((account) => {
              const balance = balances.get(account.id) || 0;
              return (
                <div key={account.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group relative">
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${account.is_active ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-300'}`}>
                           {account.name.charAt(0)}
                        </div>
                        <div>
                           <div className={`font-bold text-lg leading-tight ${account.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{account.name}</div>
                           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{account.currency}</div>
                        </div>
                    </div>
                    {/* Status Badge */}
                    {!account.is_active && (
                       <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Archiviato</span>
                    )}
                  </div>

                  <div className={`text-3xl font-mono font-bold tracking-tight mb-6 ${balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-2 pt-4 border-t border-slate-50">
                    <button 
                      onClick={() => toggleAccountActive(account.id, account.is_active)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                          account.is_active 
                          ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' 
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {account.is_active ? <><EyeOff size={16} /> Nascondi</> : <><Eye size={16} /> Attiva</>}
                    </button>
                    
                    <button
                       onClick={() => toggleAccountSelect(account.id, account.is_select)}
                       className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                          account.is_select 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                       }`}
                     >
                        {account.is_select ? <><CheckSquare size={16} /> Filtri ON</> : <><Square size={16} /> Filtri OFF</>}
                     </button>
                  </div>

                </div>
              );
            })}
            
            {/* Empty State Card */}
            {displayedAccounts.length === 0 && (
               <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <Wallet size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>Nessun conto trovato.</p>
               </div>
            )}
      </div>
    </div>
  );
};