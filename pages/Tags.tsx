
import React, { useMemo, useState } from 'react';
import { useFinance } from '../FinanceContext';
import { Transaction } from '../types';

export const Tags: React.FC = () => {
  const { transactions, categories, accounts } = useFinance();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [drillDownId, setDrillDownId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Estrae tutti i tag unici dai movimenti
  const availableTags = useMemo(() => {
    const tags = transactions.map(t => t.tag).filter(Boolean) as string[];
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Seleziona il primo tag se non ce n'è uno selezionato
  React.useEffect(() => {
    if (!selectedTag && availableTags.length > 0) {
      setSelectedTag(availableTags[0]);
    }
  }, [availableTags, selectedTag]);

  // Reset drill-down e espansioni quando cambia il tag
  React.useEffect(() => {
    setDrillDownId(null);
    setExpandedCategories(new Set());
  }, [selectedTag]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const tagTransactions = useMemo(() => {
    if (!selectedTag) return [];
    return transactions.filter(t => t.tag === selectedTag)
      .sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime());
  }, [selectedTag, transactions]);

  const totalBalance = useMemo(() => {
    return tagTransactions.reduce((sum, t) => sum + (t.amount_base || 0), 0);
  }, [tagTransactions]);

  const getCategoryInfo = (id: string | null) => {
    if (!id) return { main: '-', sub: '-', mainId: null };
    const cat = categories.find(c => c.id === id);
    if (!cat) return { main: 'Sconosciuta', sub: '-', mainId: null };
    if (cat.parent_id) {
      const parent = categories.find(p => p.id === cat.parent_id);
      return { main: parent ? parent.name : 'Sconosciuta', sub: cat.name, mainId: parent?.id || null };
    }
    return { main: cat.name, sub: '-', mainId: cat.id };
  };

  const categorySummary = useMemo(() => {
    const summary: Record<string, { total: number; mainId: string | null; subs: Record<string, { total: number; id: string }> }> = {};
    
    tagTransactions.forEach(t => {
      const { main, sub, mainId } = getCategoryInfo(t.category_id);
      if (!summary[main]) summary[main] = { total: 0, mainId, subs: {} };
      summary[main].total += (t.amount_base || 0);
      
      if (sub !== '-' && t.category_id) {
        if (!summary[main].subs[sub]) summary[main].subs[sub] = { total: 0, id: t.category_id };
        summary[main].subs[sub].total += (t.amount_base || 0);
      }
    });

    return Object.entries(summary)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [tagTransactions, categories]);

  const drillDownData = useMemo(() => {
    if (!drillDownId) return null;
    const cat = categories.find(c => c.id === drillDownId);
    const parent = cat?.parent_id ? categories.find(p => p.id === cat.parent_id) : null;
    
    return {
      name: cat?.name || 'Sconosciuta',
      parentName: parent?.name || '',
      txs: tagTransactions.filter(t => t.category_id === drillDownId)
    };
  }, [drillDownId, tagTransactions, categories]);

  const getAccountInfo = (id: string) => {
    const account = accounts.find(a => a.id === id);
    return account ? { name: account.name, currency: account.currency_code } : { name: 'Sconosciuto', currency: '' };
  };

  const getKindBadge = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'income':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold uppercase rounded-md">Entrata</span>;
      case 'expense':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-bold uppercase rounded-md">Uscita</span>;
      case 'transfer':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold uppercase rounded-md">Giroconto</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 text-[9px] font-bold uppercase rounded-md">{kind}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-220px)] flex flex-col">
      {/* Tag Selector */}
      <div className="flex flex-col md:flex-row flex-shrink-0 gap-4 items-start">
        <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-1.5 w-full md:w-auto overflow-hidden">
          <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto custom-scrollbar p-0.5">
            {availableTags.length > 0 ? (
              availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                    selectedTag === tag 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  #{tag}
                </button>
              ))
            ) : (
              <div className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase italic">Nessun Tag trovato</div>
            )}
          </div>
        </div>
        
        {selectedTag && (
          <div className="flex-shrink-0 px-6 py-3.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm flex flex-col items-end min-w-[180px] self-stretch justify-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Totale #{selectedTag}</span>
            <span className={`text-xl font-black tracking-tighter ${totalBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {totalBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[10px] opacity-40 ml-0.5">CHF</span>
            </span>
          </div>
        )}
      </div>

      {!selectedTag ? (
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Nessun Tag Selezionato</h3>
          <p className="text-slate-400 mt-2 text-sm">Scegli un tag in alto per visualizzare l'analisi.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Vista Unica */}
          <div className="px-8 py-5 bg-[#fcfdfe] border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              {drillDownId && (
                <button 
                  onClick={() => setDrillDownId(null)}
                  className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div className="flex flex-col">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {drillDownId ? `Dettagli: ${drillDownData?.name}` : 'Analisi per Categoria'}
                </h4>
                {drillDownId && <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tighter">{drillDownData?.parentName}</span>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black text-slate-300 uppercase">Filtro Attivo:</span>
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">#{selectedTag}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!drillDownId ? (
              /* TABELLA RIEPILOGO */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-10 py-5 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Categoria / Sottocategoria</th>
                    <th className="px-10 py-5 text-[9px] font-bold text-slate-300 uppercase tracking-widest text-right">Totale (CHF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {categorySummary.map((cat) => {
                    const isExpanded = expandedCategories.has(cat.name);
                    const hasSubs = Object.keys(cat.subs).length > 0;

                    return (
                      <React.Fragment key={cat.name}>
                        <tr 
                          className="bg-slate-50/20 group cursor-pointer hover:bg-slate-50/50 transition-colors"
                          onClick={() => hasSubs && toggleCategory(cat.name)}
                        >
                          <td className="px-10 py-6">
                            <div className="flex items-center space-x-3">
                              {hasSubs ? (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                                </svg>
                              ) : (
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-slate-300 shadow-sm"></div>
                                </div>
                              )}
                              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{cat.name}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <span className={`text-base font-black tracking-tight ${cat.total >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                              {cat.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && Object.entries(cat.subs).map(([subName, subData]) => (
                          <tr 
                            key={subName} 
                            onClick={() => setDrillDownId(subData.id)}
                            className="hover:bg-blue-50/50 cursor-pointer transition-all group animate-in slide-in-from-top-1 duration-200"
                          >
                            <td className="px-16 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-1 h-1 bg-slate-300 rounded-full group-hover:bg-blue-400"></div>
                                <span className="text-xs font-bold text-slate-500 group-hover:text-blue-700">{subName}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                              </div>
                            </td>
                            <td className="px-10 py-4 text-right">
                              <span className={`text-xs font-black ${subData.total >= 0 ? 'text-slate-800' : 'text-rose-500/80'} group-hover:text-blue-700`}>
                                {subData.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {categorySummary.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                          </div>
                          <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nessun dato per questo tag</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* TABELLA DETTAGLI COMPLETA (COME SEZIONE MOVIMENTI) */
              <div className="animate-in slide-in-from-right-4 duration-300 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1300px]">
                  <thead>
                    <tr className="bg-[#fcfdfe] border-b border-slate-100 sticky top-0 bg-white z-10 shadow-sm">
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Tipo</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Conto</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest text-right">Imp. Orig.</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest text-right">Base (CHF)</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Categoria</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Sotto-cat.</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Tag</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Descrizione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {drillDownData?.txs.map(tx => {
                      const { main, sub } = getCategoryInfo(tx.category_id);
                      const { name: accountName, currency } = getAccountInfo(tx.account_id);
                      const isIncome = tx.kind.toLowerCase() === 'income';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-6 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">
                            {new Date(tx.occurred_on).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            {getKindBadge(tx.kind)}
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-800 whitespace-nowrap">
                            {accountName}
                          </td>
                          <td className={`px-6 py-4 text-right font-mono text-xs ${isIncome ? 'text-emerald-600' : tx.kind === 'transfer' ? 'text-blue-600' : 'text-rose-600'}`}>
                            {(tx.amount_original ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[9px] opacity-40 ml-0.5 uppercase">{currency}</span>
                          </td>
                          <td className={`px-6 py-4 text-right font-black text-sm whitespace-nowrap ${isIncome ? 'text-emerald-600' : tx.kind === 'transfer' ? 'text-blue-600' : 'text-rose-600'}`}>
                            {(tx.amount_base ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[9px] opacity-40 ml-0.5">CHF</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold text-[10px] uppercase tracking-tighter">{main}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-blue-600 font-bold text-[11px]">{sub}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-1.5 py-0.5 border border-slate-200 text-slate-400 text-[9px] rounded uppercase font-bold bg-white">{tx.tag}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate group-hover:text-slate-800 transition-colors">
                            {tx.description || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50/80 sticky bottom-0 z-10 border-t border-slate-100">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Totale Selezione</td>
                      <td className={`px-6 py-4 text-right font-black text-base ${drillDownData?.txs.reduce((s,t) => s + (t.amount_base || 0), 0) || 0 >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {(drillDownData?.txs.reduce((s,t) => s + (t.amount_base || 0), 0) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
