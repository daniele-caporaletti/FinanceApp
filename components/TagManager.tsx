
import React, { useState, useMemo } from 'react';
import { MegaTransaction } from '../types';
import { Tag, Calendar, Calculator, Folder, Wallet, ChevronDown } from 'lucide-react';

interface TagManagerProps {
  transactions: MegaTransaction[];
  years: number[];
}

export const TagManager: React.FC<TagManagerProps> = ({ transactions, years }) => {
  // Default to the first available year (most recent) or current year
  const [selectedYear, setSelectedYear] = useState<number>(years.length > 0 ? years[0] : new Date().getFullYear());
  const [selectedTag, setSelectedTag] = useState<string>('');

  // 1. Filter by Year AND analytics_included (Exclude Transfers/Hidden items)
  const transactionsByYear = useMemo(() => {
    return transactions.filter(t => 
      new Date(t.date).getFullYear() === selectedYear && 
      t.analytics_included === true
    );
  }, [transactions, selectedYear]);

  // 2. Extract Tags for the dropdown (only tags present in the filtered year data)
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    transactionsByYear.forEach(t => {
      if (t.tag) tags.add(t.tag);
    });
    return Array.from(tags).sort();
  }, [transactionsByYear]);

  // 3. Filter by Tag
  const filteredTransactions = useMemo(() => {
    if (!selectedTag) return [];
    return transactionsByYear.filter(t => t.tag === selectedTag);
  }, [transactionsByYear, selectedTag]);

  // 4. Calculate Total Amount for the Tag
  const tagTotalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount_base, 0);
  }, [filteredTransactions]);

  // 5. Calculate Total Amount for ALL TAGGED transactions in the Year
  // We filter transactionsByYear to only include those that have a non-empty tag
  const yearTaggedTotalAmount = useMemo(() => {
    return transactionsByYear
      .filter(t => t.tag && t.tag.trim() !== '')
      .reduce((sum, t) => sum + t.amount_base, 0);
  }, [transactionsByYear]);

  // 6. Calculate Breakdown (Category -> Subcategory -> Total)
  const breakdown = useMemo(() => {
    const map = new Map<string, { total: number, subcategories: Map<string, number> }>();

    filteredTransactions.forEach(t => {
      const catName = t.category_name;
      const subName = t.subcategory_name;
      const amount = t.amount_base;

      if (!map.has(catName)) {
        map.set(catName, { total: 0, subcategories: new Map() });
      }

      const catEntry = map.get(catName)!;
      catEntry.total += amount;

      const currentSubTotal = catEntry.subcategories.get(subName) || 0;
      catEntry.subcategories.set(subName, currentSubTotal + amount);
    });

    return map;
  }, [filteredTransactions]);

  // Styling helper
  const selectContainerClass = "relative group";
  const selectClass = "w-full appearance-none bg-white border border-slate-200 text-slate-700 font-medium py-3 px-4 pr-10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer text-sm shadow-sm hover:border-indigo-200";
  const iconClass = "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block";

  return (
    <div className="flex flex-col gap-6">
      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white/60">
        <div className="flex items-center gap-3 text-slate-800 font-bold text-lg mb-6">
           <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
              <Tag size={20} />
           </div>
           Analisi Tag
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Year Selector */}
            <div>
                <label className={labelClass}>Anno</label>
                <div className={selectContainerClass}>
                    <select
                        value={selectedYear}
                        onChange={(e) => {
                           setSelectedYear(parseInt(e.target.value));
                           setSelectedTag(''); // Reset tag when year changes
                        }}
                        className={selectClass}
                    >
                        {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className={iconClass} />
                </div>
            </div>

            {/* Tag Selector */}
            <div>
                <label className={labelClass}>Tag Selezionato</label>
                <div className={selectContainerClass}>
                    <select
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                        disabled={availableTags.length === 0}
                        className={`${selectClass} ${availableTags.length === 0 ? 'bg-slate-50 text-slate-400' : ''}`}
                    >
                        <option value="">{availableTags.length === 0 ? 'Nessun tag disponibile' : '-- Seleziona un Tag --'}</option>
                        {availableTags.map((t) => (
                        <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <Tag size={16} className={iconClass} />
                </div>
            </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Year Total Tagged Card */}
        <div className="bg-slate-800 rounded-[2rem] p-6 text-white shadow-lg shadow-slate-900/10 flex items-center justify-between border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-700/50 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Totale Tag {selectedYear}
                </h2>
                <p className="text-3xl font-bold font-mono tracking-tight">
                    CHF {yearTaggedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                    Somma di tutti i movimenti taggati
                </p>
            </div>
            <div className="bg-slate-700/50 p-3 rounded-2xl relative z-10 border border-slate-600">
                <Wallet size={24} className="text-slate-300" />
            </div>
        </div>

        {/* Tag Total Card (Only if tag selected) */}
        {selectedTag ? (
            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-between border border-indigo-500 relative overflow-hidden">
                 <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl translate-y-10 -translate-x-10"></div>
                <div className="relative z-10">
                    <h2 className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        Totale per Tag <span className="text-white bg-white/20 px-2 py-0.5 rounded text-[10px]">{selectedTag}</span>
                    </h2>
                    <p className="text-3xl font-bold font-mono tracking-tight">
                        CHF {tagTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl relative z-10 backdrop-blur-sm">
                    <Calculator size={24} />
                </div>
            </div>
        ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex items-center justify-center text-slate-400">
                <span className="text-sm font-medium">Seleziona un tag per i dettagli</span>
            </div>
        )}
      </div>

      {selectedTag && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Breakdown Breakdown */}
            <div className="lg:col-span-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-5 border-b border-slate-50 bg-slate-50/50 font-bold text-slate-700 flex items-center gap-2 shrink-0">
                    <Folder size={18} className="text-indigo-500" />
                    Suddivisione
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="flex flex-col gap-2">
                        {Array.from(breakdown.entries()).map(([catName, data]) => (
                            <div key={catName} className="p-4 rounded-xl bg-white border border-slate-100 hover:border-indigo-100 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-700 text-sm">{catName}</span>
                                    <span className={`font-mono font-bold text-sm ${data.total < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="pl-3 space-y-1 border-l-2 border-slate-100 ml-1">
                                    {Array.from(data.subcategories.entries()).map(([subName, amount]) => (
                                        <div key={subName} className="flex justify-between items-center text-xs text-slate-500">
                                            <span>{subName}</span>
                                            <span className="font-mono">{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Col: Transactions List (Read Only) */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[600px]">
                 <div className="p-5 border-b border-slate-50 bg-slate-50/50 font-bold text-slate-700 shrink-0 flex justify-between items-center">
                    <span>Dettaglio Movimenti</span>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{filteredTransactions.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                         <thead className="bg-white sticky top-0 z-10 shadow-sm text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-4">Data</th>
                                <th className="px-5 py-4">Conto</th>
                                <th className="px-5 py-4">Categoria</th>
                                <th className="px-5 py-4">Sottocategoria</th>
                                <th className="px-5 py-4">Note</th>
                                <th className="px-5 py-4 text-right">Importo (CHF)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-mono text-xs">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                            {tx.account_name}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-slate-800 font-medium">{tx.category_name}</td>
                                    <td className="px-5 py-3 whitespace-nowrap text-slate-500 text-xs">
                                        {tx.subcategory_name !== '-' ? tx.subcategory_name : ''}
                                    </td>
                                    <td className="px-5 py-3 text-slate-400 text-xs truncate max-w-[150px]" title={tx.note}>
                                        {tx.note}
                                    </td>
                                    <td className={`px-5 py-3 whitespace-nowrap text-right font-mono font-bold ${tx.amount_base < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {tx.amount_base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
