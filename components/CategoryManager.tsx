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
       // Small timeout to allow render
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
      
      {/* --- Left Column: Categories List --- */}
      <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col max-h-[400px] md:max-h-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 bg-slate-50 z-10">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Folder size={18} />
            Categorie
          </h3>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            title="Nuova Categoria"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Add Category Form */}
        {isAddingCategory && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2 items-start mb-2 text-xs text-amber-700">
               <AlertTriangle size={14} className="shrink-0 mt-0.5" />
               <span>Creazione permanente. Non potrai eliminare questa categoria.</span>
            </div>
            <form onSubmit={handleAddCategory} className="flex flex-col gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome categoria..."
                className="w-full px-3 py-1.5 text-sm rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsAddingCategory(false)}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !newCategoryName.trim()}
                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {categories.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">Nessuna categoria.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {categories.map(cat => (
                <li key={cat.id}>
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between group transition-all
                      ${selectedCategoryId === cat.id 
                        ? 'bg-indigo-50 border-l-4 border-indigo-600 pl-[12px]' 
                        : 'hover:bg-slate-50 border-l-4 border-transparent pl-[12px]'
                      }`}
                  >
                    <span className={`font-medium ${selectedCategoryId === cat.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {cat.name}
                    </span>
                    <ChevronRight size={16} className={`text-slate-300 transition-transform ${selectedCategoryId === cat.id ? 'text-indigo-400 translate-x-1' : ''}`} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* --- Right Column: Subcategories List --- */}
      <div ref={rightColRef} className="w-full md:w-2/3 flex flex-col bg-white min-h-[400px] border-t md:border-t-0 border-slate-200">
        {!selectedCategory ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
            <Folder size={48} className="mb-4 text-slate-200" />
            <p className="text-lg font-medium">Seleziona una categoria</p>
            <p className="text-sm">Gestisci le sottocategorie dal pannello a sinistra.</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center h-[57px] sticky top-0 z-10">
              <div className="flex items-center gap-2">
                 <span className="text-slate-400 text-sm flex items-center">
                    Categoria <ChevronRight size={14} className="mx-1" />
                 </span>
                 <h3 className="font-bold text-slate-800 text-lg">{selectedCategory.name}</h3>
              </div>
              <button 
                onClick={() => setIsAddingSubcategory(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Aggiungi Sottocategoria</span>
                <span className="sm:hidden">Aggiungi</span>
              </button>
            </div>

            {/* Add Subcategory Form */}
            {isAddingSubcategory && (
              <div className="p-6 bg-slate-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-2">
                 <div className="max-w-md">
                    <div className="flex gap-2 items-start mb-3 p-2 bg-amber-50 text-amber-800 rounded border border-amber-200 text-xs">
                       <AlertTriangle size={16} className="shrink-0" />
                       <p><strong>Attenzione:</strong> La creazione di una sottocategoria è permanente per garantire l'integrità dei dati storici.</p>
                    </div>
                    <form onSubmit={handleAddSubcategory} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Sottocategoria</label>
                        <input
                          type="text"
                          value={newSubcategoryName}
                          onChange={(e) => setNewSubcategoryName(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Es. Spesa al supermercato"
                          autoFocus
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingSubcategory(false)}
                        className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Annulla
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting || !newSubcategoryName.trim()}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Salva
                      </button>
                    </form>
                    {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                 </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
               {currentSubcategories.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl min-h-[200px]">
                    <Tag size={32} className="mb-2 text-slate-200" />
                    <p>Nessuna sottocategoria presente per {selectedCategory.name}.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentSubcategories.map(sub => (
                       <div key={sub.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-200 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                             <Tag size={14} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{sub.name}</span>
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