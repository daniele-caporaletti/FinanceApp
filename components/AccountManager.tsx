import React, { useState, useMemo } from 'react';
import { DbAccount, MegaTransaction } from '../types';
import { addAccount, toggleAccountActive, toggleAccountSelect } from '../services/supabaseService';
import { Plus, Check, AlertTriangle, Eye, EyeOff, CheckSquare, Square, Wallet } from 'lucide-react';

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
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/60 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-indigo-600" /> Gestione Conti
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Gestisci i tuoi conti e monitora i saldi</p>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Toggle Show Inactive */}
           <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-500 select-none bg-slate-100 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors">
             <input 
               type="checkbox" 
               checked={showInactive} 
               onChange={(e) => setShowInactive(e.target.checked)}
               className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
             />
             Mostra inattivi
           </label>

           <button 
             onClick={() => setIsAdding(!isAdding)}
             className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-md active:scale-95 text-sm font-bold"
           >
             <Plus size={18} />
             <span className="hidden sm:inline">Nuovo Conto</span>
           </button>
        </div>
      </div>

      {/* Add Account Form */}
      {isAdding && (
        <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 animate-in fade-in slide-in-from-top-2">
           <div className="max-w-2xl mx-auto">
              <div className="flex items-start gap-3 mb-6 p-4 bg-white/60 text-amber-800 rounded-xl border border-amber-100/50 shadow-sm">
                <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-500" />
                <p className="text-sm leading-relaxed">
                  <strong>Attenzione:</strong> La creazione di un conto è permanente. Una volta creato, non può essere eliminato dal database (può solo essere disattivato/nascosto). Assicurati che i dati siano corretti.
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

      {/* Accounts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
              <th className="px-6 py-4">Conto</th>
              <th className="px-6 py-4 text-center">Valuta</th>
              <th className="px-6 py-4 text-right">Saldo</th>
              <th className="px-6 py-4 text-center">Stato</th>
              <th className="px-6 py-4 text-center">Visibilità</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayedAccounts.map((account) => {
              const balance = balances.get(account.id) || 0;
              return (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 text-lg">{account.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">ID: {account.id}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold font-mono text-slate-600 border border-slate-200">
                      {account.currency}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold text-lg ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleAccountActive(account.id, account.is_active)}
                      className={`p-2 rounded-xl transition-all ${account.is_active ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}
                      title={account.is_active ? "Attivo (Clicca per disattivare)" : "Inattivo (Clicca per attivare)"}
                    >
                      {account.is_active ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <button
                       onClick={() => toggleAccountSelect(account.id, account.is_select)}
                       className={`p-1.5 rounded-lg transition-all ${account.is_select ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 hover:text-slate-500'}`}
                       title={account.is_select ? "Visibile nei filtri" : "Nascosto dai filtri"}
                     >
                        {account.is_select ? <CheckSquare size={24} /> : <Square size={24} />}
                     </button>
                  </td>
                </tr>
              );
            })}
            {displayedAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                   <div className="flex flex-col items-center gap-2">
                     <Wallet size={32} className="text-slate-300" />
                     <p>Nessun conto trovato.</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};