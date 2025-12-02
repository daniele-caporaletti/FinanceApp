import React, { useState, useRef, useEffect } from 'react';
import { DbCategory, DbSubcategory } from '../types';
import { addCategory, addSubcategory } from '../services/supabaseService';
import { Plus, AlertTriangle, Folder, Tag, ChevronRight } from 'lucide-react';

interface CategoryManagerProps {
  categories: DbCategory[];
  subcategories: DbSubcategory[];
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, subcategories }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Category Form State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Subcategory Form State
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for auto-scrolling on mobile
  const rightColRef = useRef<HTMLDivElement>(null);

  // Derived state
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const currentSubcategories = subcategories.filter(s => s.category_id === selectedCategoryId);

  // Auto-scroll effect for mobile
  useEffect(() => {
    if (selectedCategoryId && window.innerWidth < 768) {
       setTimeout(() => {
          rightColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
       }, 100);
    }
  }, [selectedCategoryId]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione della categoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim() || !selectedCategoryId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await addSubcategory(selectedCategoryId, newSubcategoryName.trim());
      setNewSubcategoryName('');
      setIsAddingSubcategory(false);
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione della sottocategoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/60 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      
      {/* --- Left Column: Categories List --- */}
      <div className="w-full md:w-1/3 border-r border-slate-200/60 flex flex-col max-h-[400px] md:max-h-full bg-white/40">
        <div className="p-4 border-b border-slate-200/60 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur z-10">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><Folder size={16} /></div>
            Categorie
          </h3>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
            title="Nuova Categoria"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Add Category Form */}
        {isAddingCategory && (
          <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2 items-start mb-2 text-[10px] uppercase font-bold text-amber-600 tracking-wide">
               <AlertTriangle size={12} className="shrink-0" />
               <span>Creazione permanente</span>
            </div>
            <form onSubmit={handleAddCategory} className="flex flex-col gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome categoria..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsAddingCategory(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !newCategoryName.trim()}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {categories.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">Nessuna categoria.</div>
          ) : (
             categories.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => setSelectedCategoryId(cat.id)}
                 className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all
                   ${selectedCategoryId === cat.id 
                     ? 'bg-white shadow-sm border border-slate-100' 
                     : 'hover:bg-white/50 border border-transparent'
                   }`}
               >
                 <span className={`font-semibold ${selectedCategoryId === cat.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                   {cat.name}
                 </span>
                 <ChevronRight size={16} className={`transition-transform duration-300 ${selectedCategoryId === cat.id ? 'text-indigo-400 translate-x-1' : 'text-slate-300'}`} />
               </button>
             ))
          )}
        </div>
      </div>

      {/* --- Right Column: Subcategories List --- */}
      <div ref={rightColRef} className="w-full md:w-2/3 flex flex-col bg-white/60 min-h-[400px] border-t md:border-t-0 border-slate-200">
        {!selectedCategory ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
            <div className="bg-slate-50 p-6 rounded-full mb-4 shadow-inner">
               <Folder size={48} className="text-slate-200" />
            </div>
            <p className="text-lg font-bold text-slate-400">Seleziona una categoria</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-200/60 bg-white/50 flex justify-between items-center h-[64px] sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                 <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center">
                    Categoria <ChevronRight size={12} className="mx-1" />
                 </span>
                 <h3 className="font-bold text-slate-800 text-xl tracking-tight">{selectedCategory.name}</h3>
              </div>
              <button 
                onClick={() => setIsAddingSubcategory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 active:scale-95"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nuova Sottocategoria</span>
              </button>
            </div>

            {/* Add Subcategory Form */}
            {isAddingSubcategory && (
              <div className="p-6 bg-slate-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-2">
                 <div className="max-w-md bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex gap-2 items-start mb-3 text-[10px] uppercase font-bold text-amber-600 tracking-wide">
                       <AlertTriangle size={12} className="shrink-0" />
                       <p>Creazione permanente</p>
                    </div>
                    <form onSubmit={handleAddSubcategory} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Sottocategoria</label>
                        <input
                          type="text"
                          value={newSubcategoryName}
                          onChange={(e) => setNewSubcategoryName(e.target.value)}
                          className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Es. Spesa al supermercato"
                          autoFocus
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingSubcategory(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        Annulla
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting || !newSubcategoryName.trim()}
                        className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                      >
                        Salva
                      </button>
                    </form>
                    {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}
                 </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
               {currentSubcategories.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 min-h-[200px]">
                    <Tag size={32} className="mb-2 text-slate-300" />
                    <p>Nessuna sottocategoria presente.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentSubcategories.map(sub => (
                       <div key={sub.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                             <Tag size={14} />
                          </div>
                          <span className="text-sm font-bold text-slate-700">{sub.name}</span>
                       </div>
                    ))}
                 </div>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};