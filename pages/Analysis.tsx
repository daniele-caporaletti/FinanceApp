
import React, { useMemo, useState } from 'react';
import { useFinance } from '../FinanceContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export const Analysis: React.FC = () => {
  const { transactions, categories } = useFinance();
  const currentYear = new Date().getFullYear();
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  
  // Stato per gestire l'espansione delle sottocategorie nel dettaglio
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const fullMonthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  const toggleDetail = (categoryName: string) => {
    setExpandedDetails(prev => {
        const next = new Set(prev);
        if (next.has(categoryName)) next.delete(categoryName);
        else next.add(categoryName);
        return next;
    });
  };

  // 1. Data Filtering (Core Logic: No Work, No Transfer)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Exclude logic
      if (t.kind === 'work' || t.kind === 'transfer') return false;

      const d = new Date(t.occurred_on);
      const yearMatch = d.getFullYear() === selectedYear;
      const monthMatch = selectedMonth === 'all' || d.getMonth() === selectedMonth;

      return yearMatch && monthMatch;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // 2. Available Years
  const availableYears = useMemo(() => {
    const years = transactions.map(t => new Date(t.occurred_on).getFullYear());
    const unique = Array.from(new Set(years));
    if (!unique.includes(currentYear)) unique.push(currentYear);
    return unique.sort((a, b) => b - a);
  }, [transactions, currentYear]);

  // 3. KPI Calculations
  const kpi = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach(t => {
      const amt = t.amount_base || 0;
      // Normalizzazione: Entrate positive, Spese negative nel DB ma le sommiamo in assoluto per i KPI
      if (amt > 0) income += amt;
      else expense += Math.abs(amt);
    });

    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expense, savings, savingsRate };
  }, [filteredTransactions]);

  // 4. Chart Data: Monthly Trend (Only if 'all' months selected)
  const trendData = useMemo(() => {
    if (selectedMonth !== 'all') return []; // No trend if single month

    const data = Array.from({ length: 12 }, (_, i) => ({
      name: monthNames[i],
      Income: 0,
      Expense: 0,
      Savings: 0
    }));

    transactions.filter(t => {
        if (t.kind === 'work' || t.kind === 'transfer') return false;
        return new Date(t.occurred_on).getFullYear() === selectedYear;
    }).forEach(t => {
        const monthIdx = new Date(t.occurred_on).getMonth();
        const amt = t.amount_base || 0;
        if (amt > 0) data[monthIdx].Income += amt;
        else data[monthIdx].Expense += Math.abs(amt);
    });
    
    // Calculate Net for chart
    return data.map(d => ({ ...d, Savings: d.Income - d.Expense }));
  }, [transactions, selectedYear, selectedMonth]);

  // 5. Chart Data: Category Distribution (Pie Chart)
  const categoryData = useMemo(() => {
    const groups: Record<string, number> = {};
    
    filteredTransactions.forEach(t => {
      // Consideriamo solo le spese per la torta
      if ((t.amount_base || 0) >= 0) return;

      const cat = categories.find(c => c.id === t.category_id);
      let groupName = 'Altro';
      
      if (cat) {
        if (cat.parent_id) {
            const parent = categories.find(p => p.id === cat.parent_id);
            groupName = parent ? parent.name : cat.name;
        } else {
            groupName = cat.name;
        }
      }

      if (!groups[groupName]) groups[groupName] = 0;
      groups[groupName] += Math.abs(t.amount_base || 0);
    });

    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, categories]);

  // 6. Top Subcategories (Drill down list)
  const topCategoriesList = useMemo(() => {
     const list: { 
         name: string; 
         total: number; 
         color: string;
         subs: { name: string; total: number }[] 
     }[] = [];

     categoryData.slice(0, 6).forEach((cat, idx) => { // Top 6 categories
         const subsMap: Record<string, number> = {};
         
         // Re-scan transactions for this specific main category to find sub-breakdown
         filteredTransactions.forEach(t => {
            if ((t.amount_base || 0) >= 0) return;
            
            const c = categories.find(x => x.id === t.category_id);
            if (!c) return;

            // Check if transaction belongs to this main category
            let mainName = '';
            let subName = '';
            if (c.parent_id) {
                const p = categories.find(x => x.id === c.parent_id);
                mainName = p ? p.name : c.name;
                subName = c.name;
            } else {
                mainName = c.name;
                subName = 'Generale';
            }

            if (mainName === cat.name) {
                if (!subsMap[subName]) subsMap[subName] = 0;
                subsMap[subName] += Math.abs(t.amount_base || 0);
            }
         });

         const subs = Object.entries(subsMap)
            .map(([n, v]) => ({ name: n, total: v }))
            .sort((a,b) => b.total - a.total);

         list.push({
             name: cat.name,
             total: cat.value,
             color: COLORS[idx % COLORS.length],
             subs: subs
         });
     });

     return list;
  }, [categoryData, filteredTransactions, categories]);


  // --- Custom Tooltip for Charts ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
             <div key={index} className="text-sm font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                <span style={{ color: entry.color || entry.fill }}>
                    {entry.name}: {entry.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm">
         <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar max-w-full p-2 w-full md:w-auto">
            {availableYears.map(y => (
                <button 
                  key={y} 
                  onClick={() => setSelectedYear(y)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedYear === y ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    {y}
                </button>
            ))}
         </div>
         <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar max-w-full p-2 border-t md:border-t-0 md:border-l border-slate-100 w-full md:w-auto">
            <button 
                onClick={() => setSelectedMonth('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${selectedMonth === 'all' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                Tutto l'anno
            </button>
            {monthNames.map((m, idx) => (
                 <button 
                   key={m} 
                   onClick={() => setSelectedMonth(idx)}
                   className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${selectedMonth === idx ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                 >
                    {m}
                 </button>
            ))}
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
         <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entrate Nette</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">CHF {kpi.income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
         </div>
         <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uscite Nette</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg></div>
            </div>
            <div className="text-2xl font-black text-rose-600 mt-2">CHF {kpi.expense.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
         </div>
         <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
             <div className="flex justify-between items-start relative z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risparmio</span>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${kpi.savingsRate >= 20 ? 'bg-emerald-100 text-emerald-700' : kpi.savingsRate > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                    {kpi.savingsRate.toFixed(1)}% Rate
                </span>
            </div>
            <div className={`text-2xl font-black mt-2 relative z-10 ${kpi.savings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.savings > 0 ? '+' : ''}CHF {kpi.savings.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
            
            {/* Visual Bar Background */}
            <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
                <div className={`h-full ${kpi.savingsRate > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(Math.abs(kpi.savingsRate), 100)}%` }}></div>
            </div>
         </div>
      </div>

      {/* Main Trend Chart (Only visible if 'all' months selected) */}
      {selectedMonth === 'all' && (
          <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 h-[350px] md:h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Andamento Annuale</h3>
                  <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span><span className="text-xs font-bold text-slate-500 hidden md:inline">Entrate</span></div>
                      <div className="flex items-center space-x-2"><span className="w-3 h-3 bg-rose-500 rounded-full"></span><span className="text-xs font-bold text-slate-500 hidden md:inline">Uscite</span></div>
                  </div>
              </div>
              <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} barGap={4} barSize={12}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value / 1000}k`} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} name="Entrate" />
                          <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Uscite" />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Category Pie Chart */}
          <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Ripartizione Spese</h3>
              <p className="text-xs text-slate-400 mb-6">Dove sono finiti i tuoi soldi nel periodo selezionato.</p>
              
              <div className="flex-1 relative">
                 {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold text-sm">Nessuna spesa registrata</div>
                 )}
                 {/* Center Label Total */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tot. Spese</span>
                     <span className="text-xl font-black text-slate-800">CHF {kpi.expense.toLocaleString('it-IT', { notation: 'compact' })}</span>
                 </div>
              </div>
          </div>

          {/* Top Spending Details */}
          <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Dettaglio Top Categorie</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                  {topCategoriesList.length > 0 ? topCategoriesList.map((cat, idx) => {
                      const isExpanded = expandedDetails.has(cat.name);
                      const visibleSubs = isExpanded ? cat.subs : cat.subs.slice(0, 3);
                      
                      return (
                          <div key={idx} className="group">
                              {/* Header Categoria */}
                              <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center space-x-3">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                      <span className="font-bold text-sm text-slate-700">{cat.name}</span>
                                  </div>
                                  <span className="font-black text-sm text-slate-900">CHF {cat.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                              </div>
                              
                              {/* Progress bar visual */}
                              <div className="w-full h-1.5 bg-slate-50 rounded-full mb-3 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${(cat.total / kpi.expense) * 100}%`, backgroundColor: cat.color }}></div>
                              </div>

                              {/* Subcategories (Expandable) */}
                              <div className="pl-6 space-y-1.5 animate-in fade-in duration-300">
                                  {visibleSubs.map((sub, sIdx) => (
                                      <div key={sIdx} className="flex justify-between items-center text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                          <span>{sub.name}</span>
                                          <span className="font-medium">CHF {sub.total.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</span>
                                      </div>
                                  ))}
                                  
                                  {/* Toggle Button */}
                                  {cat.subs.length > 3 && (
                                      <button 
                                        onClick={() => toggleDetail(cat.name)}
                                        className="flex items-center space-x-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors mt-1 pt-1 cursor-pointer focus:outline-none"
                                      >
                                          <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                          >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                          </svg>
                                          <span>{isExpanded ? 'Mostra meno' : `Vedi altre ${cat.subs.length - 3}`}</span>
                                      </button>
                                  )}
                              </div>
                          </div>
                      );
                  }) : (
                      <div className="text-center py-20 text-slate-300 font-bold text-sm">Nessun dato disponibile</div>
                  )}
              </div>
          </div>
      </div>

    </div>
  );
};
