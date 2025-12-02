import React, { useState, useMemo } from 'react';
import { DbAccount, MegaTransaction } from '../types';
import { addAccount, toggleAccountActive, toggleAccountSelect } from '../services/supabaseService';
import { Plus, Check, AlertTriangle, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Gestione Conti</h2>
          <p className="text-sm text-slate-500">Gestisci i tuoi conti, visualizza saldi e seleziona i filtri.</p>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Toggle Show Inactive */}
           <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 select-none">
             <input 
               type="checkbox" 
               checked={showInactive} 
               onChange={(e) => setShowInactive(e.target.checked)}
               className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
             />
             Mostra inattivi
           </label>

           <button 
             onClick={() => setIsAdding(!isAdding)}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
           >
             <Plus size={18} />
             Aggiungi Conto
           </button>
        </div>
      </div>

      {/* Add Account Form */}
      {isAdding && (
        <div className="p-6 bg-slate-50 border-b border-slate-200">
           <div className="max-w-2xl mx-auto">
              <div className="flex items-start gap-3 mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm">
                  <strong>Attenzione:</strong> La creazione di un conto è permanente. Una volta creato, non può essere eliminato dal database (può solo essere disattivato/nascosto). Assicurati che i dati siano corretti.
                </p>
              </div>

              <form onSubmit={handleAddAccount} className="flex flex-col sm:flex-row gap-4 items-end">
                 <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Conto</label>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Es. Intesa Sanpaolo"
                      required
                    />
                 </div>
                 <div className="w-32">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Valuta</label>
                    <input 
                      type="text" 
                      value={newCurrency}
                      onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="EUR"
                      required
                      maxLength={3}
                    />
                 </div>
                 <button 
                   type="submit" 
                   disabled={isSubmitting}
                   className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                 >
                   {isSubmitting ? 'Salvataggio...' : 'Conferma'}
                 </button>
              </form>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
           </div>
        </div>
      )}

      {/* Accounts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <th className="px-6 py-4">Nome Conto</th>
              <th className="px-6 py-4 text-center">Valuta</th>
              <th className="px-6 py-4 text-right">Saldo Attuale</th>
              <th className="px-6 py-4 text-center">Stato (Attivo)</th>
              <th className="px-6 py-4 text-center">Seleziona (Filtri)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedAccounts.map((account) => {
              const balance = balances.get(account.id) || 0;
              return (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{account.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{account.id}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600">
                      {account.currency}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleAccountActive(account.id, account.is_active)}
                      className={`p-2 rounded-full transition-colors ${account.is_active ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:bg-slate-100'}`}
                      title={account.is_active ? "Attivo (Clicca per disattivare)" : "Inattivo (Clicca per attivare)"}
                    >
                      {account.is_active ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <button
                       onClick={() => toggleAccountSelect(account.id, account.is_select)}
                       className={`p-1 rounded transition-colors ${account.is_select ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
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
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                   Nessun conto trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};