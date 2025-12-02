import React from 'react';
import { MegaTransaction } from '../types';
import { AlertCircle, Check, X, Trash2, Pencil, Calendar, Wallet, Tag } from 'lucide-react';

interface TransactionTableProps {
  transactions: MegaTransaction[];
  isLoading: boolean;
  onEdit: (tx: MegaTransaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, 
  isLoading,
  onEdit,
  onDelete
}) => {
  if (isLoading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p>Caricamento dati locali...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl shadow-sm border border-slate-200">
        <AlertCircle size={48} className="mb-4 text-slate-300" />
        <p className="text-lg font-medium text-slate-600">Nessuna transazione trovata</p>
        <p className="text-sm">Clicca "Sync Data" per aggiornare o modifica i filtri.</p>
      </div>
    );
  }

  // --- MOBILE CARD VIEW ---
  const MobileCard = ({ tx }: { tx: MegaTransaction }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
       {/* Header: Date & Amount */}
       <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
             <Calendar size={14} />
             {new Date(tx.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className={`font-mono font-bold text-lg ${tx.amount_base < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
             CHF {tx.amount_base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
       </div>

       {/* Main Info */}
       <div>
          <div className="font-bold text-slate-800 text-base mb-0.5">{tx.category_name}</div>
          <div className="text-sm text-slate-500 flex items-center gap-1.5">
             <span>{tx.subcategory_name !== '-' ? tx.subcategory_name : 'Generale'}</span>
             {tx.tag && (
               <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100 uppercase">
                 {tx.tag}
               </span>
             )}
          </div>
       </div>

       {/* Account & Note */}
       <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <Wallet size={12} className="shrink-0" />
          <span className="font-medium text-slate-700">{tx.account_name}</span>
          <span className="text-slate-300">|</span>
          <span className="truncate italic max-w-[150px]">{tx.note || 'Nessuna nota'}</span>
       </div>

       {/* Actions (Absolute Bottom Right) */}
       <div className="absolute bottom-4 right-4 flex gap-2">
          <button 
            onClick={() => onEdit(tx)}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 active:scale-95 transition-all"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={() => onDelete(tx.id)}
            className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 active:scale-95 transition-all"
          >
            <Trash2 size={16} />
          </button>
       </div>
    </div>
  );

  return (
    <>
      {/* --- DESKTOP TABLE VIEW (Hidden on Mobile) --- */}
      <div className="hidden md:flex w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-col h-[calc(100vh-14rem)]">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="min-w-max w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 sticky left-0 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Data</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Conto</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-right">Importo</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Categoria</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Sottocategoria</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 w-64">Note</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Tag</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-right border-l border-slate-100">Importo (CHF)</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-center">Analisi</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Contesto</th>
                <th className="px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-center sticky right-0 z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-2 text-slate-900 font-medium whitespace-nowrap bg-white sticky left-0 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">{tx.date.substring(0, 10)}</td>
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap"><span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{tx.account_name}</span></td>
                  <td className="px-4 py-2 text-right text-slate-500 font-mono text-xs">{tx.amount_original.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">{tx.currency}</span></td>
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{tx.category_name}</td>
                  <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{tx.subcategory_name !== '-' ? tx.subcategory_name : <span className="text-slate-300">-</span>}</td>
                  <td className="px-4 py-2 text-slate-600 text-xs max-w-xs truncate" title={tx.note}>{tx.note}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{tx.tag ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{tx.tag}</span> : <span className="text-slate-300">-</span>}</td>
                  <td className={`px-4 py-2 text-right font-mono font-bold whitespace-nowrap border-l border-slate-100 ${tx.amount_base < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{tx.amount_base.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-center">{tx.analytics_included ? <Check size={16} className="text-indigo-600 mx-auto" /> : <X size={16} className="text-slate-300 mx-auto" />}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{tx.context || '-'}</td>
                  <td className="px-4 py-2 bg-white sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] group-hover:bg-slate-50 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onEdit(tx)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                      <button onClick={() => onDelete(tx.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 flex justify-between items-center shrink-0">
          <div className="font-mono">Record totali: {transactions.length}</div>
        </div>
      </div>

      {/* --- MOBILE LIST VIEW (Cards) --- */}
      <div className="md:hidden flex flex-col gap-3 pb-safe">
         <div className="px-1 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
            <span>Lista Transazioni</span>
            <span>{transactions.length} record</span>
         </div>
         {transactions.map(tx => <MobileCard key={tx.id} tx={tx} />)}
      </div>
    </>
  );
};