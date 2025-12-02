
import React, { useState, useMemo, useEffect } from 'react';
import { DbAccount, DbCategory, DbSubcategory, MegaTransaction } from '../types';
import { saveTransaction, saveTransfer, updateTransaction } from '../services/supabaseService';
import { X, ArrowRightLeft, Repeat, Coins, Check, AlertCircle } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface TransactionFormProps {
  accounts: DbAccount[];
  categories: DbCategory[];
  subcategories: DbSubcategory[];
  existingTags: string[];
  initialData?: MegaTransaction | null;
  onClose: () => void;
}

type TxType = 'NORMAL' | 'TRANSFER' | 'RECURRING';

export const TransactionForm: React.FC<TransactionFormProps> = ({
  accounts,
  categories,
  subcategories,
  existingTags,
  initialData,
  onClose
}) => {
  const [activeType, setActiveType] = useState<TxType>('NORMAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Normal / Recurring Fields
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  // analyticsIncluded is now always true for Normal/Recurring, so state is removed/ignored
  const [isWork, setIsWork] = useState(false); // context = work vs personal

  // Transfer Fields (Only for creation)
  const [fromAccountId, setFromAccountId] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [toAmount, setToAmount] = useState('');

  // Check if we are in Edit Mode
  const isEditMode = !!initialData;

  // Initialize Form for Edit
  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.split('T')[0]);
      setAccountId(initialData.account_id);
      setAmount(initialData.amount_original.toString());
      setCategoryId(initialData.category_id);
      setSubcategoryId(initialData.subcategory_id || '');
      setNote(initialData.note || '');
      setTag(initialData.tag || '');
      setIsWork(initialData.context === 'work');

      const rawRecurrence = initialData.recurrence ? initialData.recurrence.toLowerCase() : '';
      if (rawRecurrence && rawRecurrence !== 'one_off') {
        setActiveType('RECURRING');
      } else {
        setActiveType('NORMAL');
      }
    }
  }, [initialData]);

  // Derived: Active Accounts
  const activeAccounts = useMemo(() => accounts.filter(a => a.is_active), [accounts]);

  // Derived: Filtered Subcategories
  const currentSubcategories = useMemo(() => {
    return subcategories.filter(s => s.category_id === categoryId);
  }, [subcategories, categoryId]);

  // Helper: Find currency
  const getCurrency = (accId: string) => {
    return accounts.find(a => a.id === accId)?.currency || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (activeType === 'TRANSFER') {
        if (isEditMode) throw new Error("La modifica dei giroconti non è supportata in questa modalità.");

        // Find Transfer Category
        const transferCat = categories.find(c => c.name.toLowerCase() === 'transfer');
        if (!transferCat) {
          throw new Error("Categoria 'Transfer' non trovata. Creala in Gestione Categorie per effettuare giroconti.");
        }

        if (!fromAccountId || !toAccountId) throw new Error("Seleziona entrambi i conti.");
        if (fromAccountId === toAccountId) throw new Error("I conti devono essere diversi.");
        if (!fromAmount || !toAmount) throw new Error("Inserisci gli importi.");

        await saveTransfer(
          date,
          fromAccountId,
          parseFloat(fromAmount),
          toAccountId,
          parseFloat(toAmount),
          transferCat.id
        );

      } else {
        // Normal or Recurring
        if (!accountId) throw new Error("Seleziona un conto.");
        if (!categoryId) throw new Error("Seleziona una categoria.");
        if (!amount) throw new Error("Inserisci un importo.");

        const isRecurring = activeType === 'RECURRING';
        const payload = {
          date,
          account_id: accountId,
          amount_original: parseFloat(amount),
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          note: note.trim() || undefined,
          
          // Tag: Only for Normal. Recurring is null.
          tag: isRecurring ? undefined : (tag.trim() || undefined),
          
          // Analytics: Always true for Normal and Recurring per requirements
          analytics_included: true,
          
          // Context: Recurring is always personal. Normal depends on checkbox.
          context: isRecurring ? 'personal' : (isWork ? 'work' : 'personal') as 'personal' | 'work',
          
          recurrence: isRecurring ? 'recurring' : 'one_off' as 'recurring' | 'one_off'
        };

        if (isEditMode && initialData) {
          await updateTransaction(initialData.id, payload);
        } else {
          await saveTransaction(payload);
        }
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white md:rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {isEditMode ? 'Modifica Transazione' : 'Nuova Transazione'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button 
            onClick={() => setActiveType('NORMAL')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium flex justify-center items-center gap-1 sm:gap-2 border-b-2 transition-colors
              ${activeType === 'NORMAL' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Coins size={16} /> Movimento
          </button>
          
          {/* Disable Transfer tab in Edit Mode to avoid complex split-transaction editing */}
          <button 
            onClick={() => !isEditMode && setActiveType('TRANSFER')}
            disabled={isEditMode}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium flex justify-center items-center gap-1 sm:gap-2 border-b-2 transition-colors
              ${activeType === 'TRANSFER' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}
              ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}
              `}
          >
            <ArrowRightLeft size={16} /> Giroconto
          </button>
          
          <button 
            onClick={() => setActiveType('RECURRING')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium flex justify-center items-center gap-1 sm:gap-2 border-b-2 transition-colors
              ${activeType === 'RECURRING' ? 'border-amber-600 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Repeat size={16} /> Ricorrente
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form id="transaction-form" onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 pb-6">
            
            {/* Date Field (Common) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Data</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            {/* --- TRANSFER FORM (Create Mode Only) --- */}
            {activeType === 'TRANSFER' ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {/* FROM Section */}
                  <div className="flex flex-col gap-3">
                     <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Origine (Prelievo)</span>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Conto</label>
                        <CustomSelect
                          value={fromAccountId}
                          onChange={setFromAccountId}
                          options={activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
                          placeholder="Seleziona Conto..."
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Importo (Uscita)</label>
                        <div className="relative">
                           <input 
                             type="number" 
                             step="0.01"
                             value={fromAmount}
                             onChange={e => setFromAmount(e.target.value)}
                             className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                             placeholder="0.00"
                             required
                           />
                           <span className="absolute right-3 top-2.5 text-slate-400 text-sm">
                             {getCurrency(fromAccountId)}
                           </span>
                        </div>
                     </div>
                  </div>

                  {/* TO Section */}
                  <div className="flex flex-col gap-3 md:border-l md:border-slate-200 md:pl-6">
                     <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Destinazione (Versamento)</span>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Conto</label>
                        <CustomSelect
                          value={toAccountId}
                          onChange={setToAccountId}
                          options={activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
                          placeholder="Seleziona Conto..."
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Importo (Entrata)</label>
                        <div className="relative">
                           <input 
                             type="number" 
                             step="0.01"
                             value={toAmount}
                             onChange={e => setToAmount(e.target.value)}
                             className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                             placeholder="0.00"
                             required
                           />
                           <span className="absolute right-3 top-2.5 text-slate-400 text-sm">
                             {getCurrency(toAccountId)}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
            ) : (
              /* --- NORMAL / RECURRING FORM --- */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Conto</label>
                    <CustomSelect
                      value={accountId}
                      onChange={setAccountId}
                      options={activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
                      placeholder="Seleziona Conto..."
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Importo</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-slate-500 font-medium">
                        {getCurrency(accountId)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Category */}
                   <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Categoria</label>
                    <CustomSelect
                      value={categoryId}
                      onChange={(val) => {
                        setCategoryId(val);
                        setSubcategoryId('');
                      }}
                      options={categories.map(c => ({ value: c.id, label: c.name }))}
                      placeholder="Seleziona Categoria..."
                    />
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Sottocategoria</label>
                    <CustomSelect
                      value={subcategoryId}
                      onChange={setSubcategoryId}
                      options={currentSubcategories.map(s => ({ value: s.id, label: s.name }))}
                      placeholder={categoryId ? 'Nessuna Sottocategoria' : '-'}
                      disabled={!categoryId}
                    />
                  </div>
                </div>

                {/* Note & Tag */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Note</label>
                    <input 
                      type="text" 
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      placeholder="Descrizione..."
                    />
                  </div>
                  
                  {/* Tag: Only show for NORMAL, hidden for RECURRING */}
                  {activeType === 'NORMAL' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Tag</label>
                      <input 
                        type="text" 
                        list="tags-list"
                        value={tag}
                        onChange={e => setTag(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        placeholder="Cerca o crea tag..."
                      />
                      <datalist id="tags-list">
                        {existingTags.map(t => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  )}
                </div>

                {/* Toggles */}
                <div className="flex flex-col sm:flex-row gap-6 pt-2">
                   {/* Analytics Included (Hidden, defaulting to true) */}
                   
                   {/* Work Context: Only show for NORMAL, hidden for RECURRING */}
                   {activeType === 'NORMAL' && (
                     <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={isWork}
                            onChange={e => setIsWork(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-slate-800 transition-colors"></div>
                          <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full peer-checked:translate-x-5 transition-transform"></div>
                        </div>
                        <span className="text-sm text-slate-700">Movimento Lavorativo</span>
                     </label>
                   )}
                </div>
              </>
            )}

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
          >
            Annulla
          </button>
          <button 
            type="submit"
            form="transaction-form"
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm font-medium flex items-center gap-2"
          >
            {isSubmitting ? (
              <>Salvataggio...</>
            ) : (
              <><Check size={18} /> {isEditMode ? 'Aggiorna' : 'Salva'}</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
