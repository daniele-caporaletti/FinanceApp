
import React, { useState, useMemo } from 'react';
import { MegaTransaction } from '../types';
import { Tag, Calendar, Calculator, Folder, Wallet } from 'lucide-react';

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

  return (
    <div className="flex flex-col gap-6">
      {/* Filters Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-slate-500 font-medium pb-4 border-b border-slate-100 mb-4">
          <Tag size={20} />
          <span>Filtri Analisi Tag</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Year Selector */}
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Anno</label>
                <div className="relative">
                    <select
                        value={selectedYear}
                        onChange={(e) => {
                           setSelectedYear(parseInt(e.target.value));
                           setSelectedTag(''); // Reset tag when year changes
                        }}
                        className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                        {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <Calendar size={16} />
                    </div>
                </div>
            </div>

            {/* Tag Selector */}
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Seleziona Tag</label>
                <div className="relative">
                    <select
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                        disabled={availableTags.length === 0}
                        className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <option value="">{availableTags.length === 0 ? 'Nessun tag disponibile per quest\'anno' : '-- Seleziona un Tag --'}</option>
                        {availableTags.map((t) => (
                        <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <Tag size={16} />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Year Total Tagged Card */}
        <div className="bg-slate-800 rounded-xl p-6 text-white shadow-sm flex items-center justify-between border border-slate-700">
            <div>
                <h2 className="text-slate-300 font-medium mb-1 flex items-center gap-2">
                    Totale Tag {selectedYear}
                </h2>
                <p className="text-2xl font-bold font-mono">
                    CHF {yearTaggedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    Somma di tutti i movimenti taggati
                </p>
            </div>
            <div className="bg-slate-700 p-3 rounded-full">
                <Wallet size={24} className="text-slate-300" />
            </div>
        </div>

        {/* Tag Total Card (Only if tag selected) */}
        {selectedTag ? (
            <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-sm flex items-center justify-between border border-indigo-500">
                <div>
                    <h2 className="text-indigo-100 font-medium mb-1 flex items-center gap-2">
                        Totale per Tag: 
                        <span className="font-bold text-white bg-indigo-500/50 px-2 py-0.5 rounded text-sm">{selectedTag}</span>
                    </h2>
                    <p className="text-2xl font-bold font-mono">
                        CHF {tagTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                    <Calculator size={24} />
                </div>
            </div>
        ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 flex items-center justify-center text-slate-400">
                <span className="text-sm">Seleziona un tag per vedere il totale specifico</span>
            </div>
        )}
      </div>

      {selectedTag && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Breakdown Breakdown */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex items-center gap-2 shrink-0">
                    <Folder size={18} />
                    Suddivisione Categorie
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="divide-y divide-slate-100">
                        {Array.from(breakdown.entries()).map(([catName, data]) => (
                            <div key={catName} className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-slate-800">{catName}</span>
                                    <span className={`font-mono font-bold ${data.total < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="pl-4 space-y-1.5 border-l-2 border-slate-100 ml-1">
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
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
                 <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 shrink-0">
                    Dettaglio Movimenti ({filteredTransactions.length})
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Conto</th>
                                <th className="px-4 py-3">Categoria</th>
                                <th className="px-4 py-3">Sottocategoria</th>
                                <th className="px-4 py-3">Note</th>
                                <th className="px-4 py-3 text-right">Importo (CHF)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-slate-600 font-mono text-xs">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{tx.account_name}</span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-slate-600">{tx.category_name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-slate-500 text-xs">
                                        {tx.subcategory_name !== '-' ? tx.subcategory_name : ''}
                                    </td>
                                    <td className="px-4 py-2 text-slate-500 text-xs truncate max-w-[150px]" title={tx.note}>
                                        {tx.note}
                                    </td>
                                    <td className={`px-4 py-2 whitespace-nowrap text-right font-mono font-medium ${tx.amount_base < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
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
