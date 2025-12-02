
import React, { useState } from 'react';
import { MegaTransaction } from '../types';
import { AlertCircle, Check, X, Trash2, Pencil, Wallet } from 'lucide-react';
import { formatCurrency, formatCurrencyWithSign, formatDateShort } from '../utils';

interface TransactionTableProps {
  transactions: MegaTransaction[];
  isLoading: boolean;
  onEdit: (tx: MegaTransaction) => void;
  onDelete: (id: string) => void;
}

interface MobileCardProps {
  tx: MegaTransaction;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (tx: MegaTransaction) => void;
  onDelete: (id: string) => void;
}

const MobileTransactionCard: React.FC<MobileCardProps> = ({ 
  tx, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete 
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all active:scale-[0.99]">
         {/* Main Compact Row */}
         <div 
           className="p-3 flex items-center justify-between gap-3 cursor-pointer"
           onClick={onToggle}
         >
            {/* Left: Icon & Category */}
            <div className="flex items-center gap-3 overflow-hidden flex-1">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold 
                  ${tx.amount_base < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {tx.category_name.charAt(0)}
               </div>
               <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-slate-800 text-sm truncate leading-tight">
                    {tx.category_name}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-500 truncate mt-0.5">
                    <span className="truncate">{tx.subcategory_name !== '-' ? tx.subcategory_name : 'Generale'}</span>
                    {tx.tag && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1 rounded font-medium">#{tx.tag}</span>}
                  </div>
               </div>
            </div>

            {/* Right: Amount & Date */}
            <div className="flex flex-col items-end shrink-0">
               <span className={`font-mono font-bold text-sm leading-tight ${tx.amount_base < 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                  {formatCurrencyWithSign(tx.amount_base)}
               </span>
               <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {formatDateShort(tx.date)}
               </span>
            </div>
         </div>

         {/* Expanded Actions & Details */}
         {isExpanded && (
           <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
              <div className="border-t border-slate-50 pt-2 mb-3 flex flex-col gap-1">
                 <div className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Wallet size={10} /> {tx.account_name}</span>
                    <span className="font-mono">{tx.amount_original.toLocaleString()} {tx.currency}</span>
                 </div>
                 {tx.note && (
                   <p className="text-xs text-slate-400 italic bg-slate-50 p-1.5 rounded mt-1">
                     "{tx.note}"
                   </p>
                 )}
              </div>
              
              <div className="flex gap-2">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                   className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:bg-indigo-100"
                 >
                   <Pencil size={14} /> Modifica
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }}
                   className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:bg-red-100"
                 >
                   <Trash2 size={14} /> Elimina
                 </button>
              </div>
           </div>
         )}
      </div>
  );
};

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, 
  isLoading,
  onEdit,
  onDelete
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <>
      {/* --- DESKTOP TABLE VIEW --- */}
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
                  <td className="px-5 py-3 text-right text-slate-500 font-mono text-xs">
                    {tx.amount_original.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">{tx.currency}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-700 whitespace-nowrap font-medium">{tx.category_name}</td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{tx.subcategory_name !== '-' ? tx.subcategory_name : <span className="text-slate-300">-</span>}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-xs truncate" title={tx.note}>{tx.note}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{tx.tag ? <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 uppercase tracking-wide">{tx.tag}</span> : <span className="text-slate-300">-</span>}</td>
                  <td className={`px-5 py-3 text-right font-mono font-bold whitespace-nowrap border-l border-slate-100 ${tx.amount_base < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(tx.amount_base)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {tx.analytics_included 
                      ? <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto"><Check size={12} /></div> 
                      : <div className="w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto"><X size={12} /></div>}
                  </td>
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

      {/* --- MOBILE LIST VIEW --- */}
      <div className="md:hidden flex flex-col gap-2 pb-safe">
         <div className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between items-center">
            <span>Ultimi Movimenti</span>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-mono">{transactions.length}</span>
         </div>
         {transactions.map(tx => (
           <MobileTransactionCard 
             key={tx.id} 
             tx={tx} 
             isExpanded={expandedId === tx.id}
             onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
             onEdit={onEdit}
             onDelete={onDelete}
           />
         ))}
         
         <div className="h-24"></div>
      </div>
    </>
  );
};
