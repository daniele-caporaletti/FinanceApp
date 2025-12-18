
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { Transaction } from '../types';
import { FullScreenModal } from '../components/FullScreenModal';

export const Tags: React.FC = () => {
  const { transactions, categories, accounts } = useFinance();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [drillDownId, setDrillDownId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Filtro Anno per i Tag
  const [filterYear, setFilterYear] = useState<number | 'all' | 'general'>('all');

  // Estrae tutti i tag unici dai movimenti
  const allUniqueTags = useMemo(() => {
    const tags = transactions.map(t => t.tag).filter(Boolean) as string[];
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Estrae gli anni presenti nei tag (es. "Vacanza 2023" -> 2023)
  const tagYears = useMemo(() => {
    const years = new Set<number>();
    allUniqueTags.forEach(t => {
       const match = t.trim().match(/(\d{4})$/);
       if (match) {
           const y = parseInt(match[1]);
           if (y >= 2000 && y <= 2100) years.add(y);
       }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allUniqueTags]);

  // Filtra i tag visualizzati in base all'anno selezionato
  const availableTags = useMemo(() => {
    if (filterYear === 'all') return allUniqueTags;
    
    return allUniqueTags.filter(t => {
       const match = t.trim().match(/(\d{4})$/);
       const y = match ? parseInt(match[1]) : null;
       
       if (filterYear === 'general') {
           // Mostra se non c'è anno o se l'anno è fuori range (non considerato anno fiscale)
           return !y || (y < 2000 || y > 2100);
       }
       return y === filterYear;
    });
  }, [allUniqueTags, filterYear]);

  // Seleziona il primo tag disponibile se la selezione corrente non è valida o vuota
  useEffect(() => {
    if (availableTags.length > 0) {
        if (!selectedTag || !availableTags.includes(selectedTag)) {
            setSelectedTag(availableTags[0]);
        }
    } else {
        setSelectedTag(null);
    }
  }, [availableTags, selectedTag]);

  // Reset drill-down e espansioni quando cambia il tag
  useEffect(() => {
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
    <div className="space-y-6 animate-in fade-in duration-500 min-h-screen flex flex-col pb-20">
      
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2 flex-shrink-0">
           <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Tag</h2>
           <button 
              onClick={() => setIsInfoOpen(true)}
              className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
           >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </button>
      </div>

      {/* Tag Year Filter & List */}
      <div className="flex flex-col md:flex-row flex-shrink-0 gap-4 items-start w-full">
        <div className="flex-1 w-full md:w-auto min-w-0 flex flex-col gap-2">
            
            {/* Year Filters */}
            {tagYears.length > 0 && (
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                    <button 
                        onClick={() => setFilterYear('all')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                            filterYear === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        Tutti
                    </button>
                    {tagYears.map(y => (
                        <button
                            key={y}
                            onClick={() => setFilterYear(y)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                                filterYear === y ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            {y}
                        </button>
                    ))}
                    <button 
                        onClick={() => setFilterYear('general')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                            filterYear === 'general' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        Generali
                    </button>
                </div>
            )}

            {/* Tag List - Scrollable Horizontal on Mobile */}
            <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-1.5 w-full overflow-hidden">
                <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto custom-scrollbar p-0.5 md:flex-wrap flex-nowrap overflow-x-auto md:overflow-x-visible no-scrollbar">
                    {availableTags.length > 0 ? (
                    availableTags.map(tag => (
                        <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
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
        </div>
        
        {/* Total Card */}
        {selectedTag && (
          <div className="w-full md:w-auto flex-shrink-0 px-6 py-3.5 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm flex flex-col items-end justify-center self-stretch">
            <div className="flex flex-col items-end justify-center h-full">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 text-right">Totale #{selectedTag}</span>
                <span className={`text-xl font-black tracking-tighter ${totalBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {totalBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })} <span className="text-[10px] opacity-40 ml-0.5">CHF</span>
                </span>
            </div>
          </div>
        )}
      </div>

      {!selectedTag ? (
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Nessun Tag Selezionato</h3>
          <p className="text-slate-400 mt-2 text-sm">Scegli un tag in alto per visualizzare l'analisi.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden w-full">
          {/* Header Vista Unica */}
          <div className="px-6 py-5 bg-[#fcfdfe] border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3 overflow-hidden">
              {drillDownId && (
                <button 
                  onClick={() => setDrillDownId(null)}
                  className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all group flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div className="flex flex-col truncate">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate">
                  {drillDownId ? `Dettagli: ${drillDownData?.name}` : 'Analisi per Categoria'}
                </h4>
                {drillDownId && <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tighter truncate">{drillDownData?.parentName}</span>}
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-[10px] font-black text-slate-300 uppercase">Filtro Attivo:</span>
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">#{selectedTag}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
            {!drillDownId ? (
              <>
                {/* VISTA DESKTOP: TABELLA RIEPILOGO */}
                <table className="hidden md:table w-full text-left border-collapse">
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
                          {isExpanded && Object.entries(cat.subs).map(([subName, subData]: [string, { total: number; id: string }]) => (
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
                  </tbody>
                </table>

                {/* VISTA MOBILE: LISTA CATEGORIE */}
                <div className="md:hidden">
                   {categorySummary.map((cat) => {
                      const isExpanded = expandedCategories.has(cat.name);
                      const hasSubs = Object.keys(cat.subs).length > 0;
                      
                      return (
                         <div key={cat.name} className="border-b border-slate-50 last:border-0">
                            {/* Main Row */}
                            <div 
                               onClick={() => hasSubs && toggleCategory(cat.name)}
                               className="p-4 flex justify-between items-center active:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                   <div className={`w-1.5 h-1.5 rounded-full ${hasSubs ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                                   <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                   <span className={`font-black text-sm ${cat.total >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                                      {cat.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                   </span>
                                   {hasSubs && (
                                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                   )}
                                </div>
                            </div>
                            
                            {/* Subs List */}
                            {isExpanded && (
                               <div className="bg-slate-50 pl-8 pr-4 py-2 space-y-2">
                                  {Object.entries(cat.subs).map(([subName, subData]: [string, { total: number; id: string }]) => (
                                     <div 
                                        key={subName} 
                                        onClick={() => setDrillDownId(subData.id)}
                                        className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                                     >
                                        <span className="text-xs font-semibold text-slate-500">{subName}</span>
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-xs font-bold ${subData.total >= 0 ? 'text-slate-700' : 'text-rose-500'}`}>
                                                {subData.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                            </span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>
                      );
                   })}
                </div>
                
                {categorySummary.length === 0 && (
                    <div className="p-10 text-center text-slate-400 text-sm font-bold uppercase">Nessun dato</div>
                )}
              </>
            ) : (
              /* VISTA DRILL-DOWN */
              <div className="animate-in slide-in-from-right-4 duration-300">
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
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
                      <tbody className="divide-y divide-slate-100">
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

                {/* Mobile Transaction Cards */}
                <div className="md:hidden p-4 space-y-3">
                    {drillDownData?.txs.map(tx => {
                        const { name: accountName, currency } = getAccountInfo(tx.account_id);
                        const isTransfer = tx.kind === 'transfer';
                        const amountColorClass = isTransfer ? 'text-blue-600' : (tx.amount_base || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';

                        return (
                            <div key={tx.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{new Date(tx.occurred_on).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</span>
                                       <span className="text-sm font-bold text-slate-800 mt-0.5">{tx.description || '-'}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                       <span className={`text-base font-black ${amountColorClass}`}>
                                          {(tx.amount_original || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                          <span className="text-[9px] ml-0.5 opacity-60">{currency}</span>
                                       </span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                                     <span className="px-2 py-0.5 rounded-[6px] bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-500 uppercase">{accountName}</span>
                                     {getKindBadge(tx.kind)}
                                 </div>
                            </div>
                        );
                    })}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      <FullScreenModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        title="Gestione Tag"
        subtitle="Help"
      >
        <div className="space-y-6">
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  I Tag sono etichette trasversali che ti permettono di raggruppare spese di categorie diverse sotto un unico evento.
               </p>
           </div>
           
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Esempi d'Uso</h4>
              <ul className="space-y-3">
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Viaggi:</span> Usa un tag come <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-bold text-slate-700">#Giappone2024</code> per raggruppare volo, hotel, cibo e souvenir.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Eventi:</span> Usa <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-bold text-slate-700">#MatrimonioLuca</code> per tracciare regalo, abito e viaggio.</p>
                 </li>
              </ul>
           </div>

           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtro Anno</h4>
              <p className="text-sm text-slate-500">
                  Il sistema riconosce automaticamente l'anno se il tag finisce con 4 cifre (es. "Vacanza 2023"). Questo permette di filtrare i tag per anno nella barra in alto.
              </p>
           </div>
        </div>
      </FullScreenModal>
    </div>
  );
};
