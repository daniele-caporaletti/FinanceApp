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
      <div className="w-full h-96 flex flex-col items-center justify-center text-slate-400 bg-white/60 backdrop-blur rounded-3xl shadow-sm border border-white/40">
        <div className="bg-slate-50 p-4 rounded-full mb-3">
           <AlertCircle size={32} className="text-slate-300" />
        </div>
        <p className="text-lg font-medium text-slate-600">Nessuna transazione trovata</p>
        <p className="text-sm">Clicca "Sync Data" per aggiornare o modifica i filtri.</p>
      </div>
    );
  }

  // --- MOBILE CARD VIEW ---
  const MobileCard = ({ tx }: { tx: MegaTransaction }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 relative active:scale-[0.99] transition-transform">
       {/* Header: Date & Amount */}
       <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide bg-slate-50 px-2 py-1 rounded-lg">
             <Calendar size={12} />
             {new Date(tx.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className={`font-mono font-bold text-lg tracking-tight ${tx.amount_base < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
             CHF {tx.amount_base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
       </div>

       {/* Main Info */}
       <div>
          <div className="font-bold text-slate-800 text-lg leading-snug">{tx.category_name}</div>
          <div className="text-sm text-slate-500 flex flex-wrap items-center gap-2 mt-1">
             <span>{tx.subcategory_name !== '-' ? tx.subcategory_name : 'Generale'}</span>
             {tx.tag && (
               <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide">
                 #{tx.tag}
               </span>
             )}
          </div>
       </div>

       {/* Account & Note */}
       <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
          <div className="bg-white p-1 rounded-full shadow-sm"><Wallet size={12} className="text-slate-400" /></div>
          <span className="font-semibold text-slate-700">{tx.account_name}</span>
          {tx.note && (
            <>
               <span className="text-slate-300">|</span>
               <span className="truncate italic max-w-[150px]">{tx.note}</span>
            </>
          )}
       </div>

       {/* Actions (Absolute Bottom Right) */}
       <div className="absolute bottom-5 right-5 flex gap-2">
          <button 
            onClick={() => onEdit(tx)}
            className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 active:scale-90 transition-all shadow-sm"
          >
            <Pencil size={14} />
          </button>
          <button 
            onClick={() => onDelete(tx.id)}
            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-full hover:bg-red-100 active:scale-90 transition-all shadow-sm"
          >
            <Trash2 size={14} />
          </button>
       </div>
    </div>
  );

  return (
    <>
      {/* --- DESKTOP TABLE VIEW (Hidden on Mobile) --- */}
      <div className="hidden md:flex w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/60 overflow-hidden flex-col h-[calc(100vh-16rem)]">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="min-w-max w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-sm border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Data</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Conto</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px] text-right">Importo</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Categoria</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Sottocategoria</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px] w-64">Note</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Tag</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px] text-right border-l border-slate-200/50">CHF Base</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px] text-center">Analisi</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Contesto</th>
                <th className="px-5 py-4 font-bold text-slate-400 uppercase tracking-wider text-[11px] text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-5 py-3 text-slate-900 font-medium whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-500">{tx.date.substring(0, 10)}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                       {tx.account_name}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500 font-mono text-xs">{tx.amount_original.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">{tx.currency}</span></td>
                  <td className="px-5 py-3 text-slate-700 whitespace-nowrap font-medium">{tx.category_name}</td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{tx.subcategory_name !== '-' ? tx.subcategory_name : <span className="text-slate-300">-</span>}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-xs truncate" title={tx.note}>{tx.note}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{tx.tag ? <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 uppercase tracking-wide">{tx.tag}</span> : <span className="text-slate-300">-</span>}</td>
                  <td className={`px-5 py-3 text-right font-mono font-bold whitespace-nowrap border-l border-slate-100 ${tx.amount_base < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{tx.amount_base.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3 text-center">{tx.analytics_included ? <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto"><Check size={12} /></div> : <div className="w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto"><X size={12} /></div>}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{tx.context ? <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tx.context === 'work' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{tx.context}</span> : '-'}</td>
                  <td className="px-5 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(tx)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(tx.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         <div className="bg-slate-50/80 backdrop-blur border-t border-slate-200 px-6 py-3 text-xs text-slate-500 flex justify-between items-center shrink-0">
          <div className="font-mono font-medium">Record totali: <span className="text-slate-800">{transactions.length}</span></div>
        </div>
      </div>

      {/* --- MOBILE LIST VIEW (Cards) --- */}
      <div className="md:hidden flex flex-col gap-3 pb-safe">
         <div className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between items-center">
            <span>Lista Transazioni</span>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{transactions.length}</span>
         </div>
         {transactions.map(tx => <MobileCard key={tx.id} tx={tx} />)}
      </div>
    </>
  );
};