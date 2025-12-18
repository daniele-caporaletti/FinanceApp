
import React, { useMemo, useState } from 'react';
import { useFinance } from '../FinanceContext';
import { Category } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cat: Partial<Category>) => Promise<void>;
  initialData?: Partial<Category>;
  parentId?: string | null;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, initialData, parentId }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) setName(initialData?.name || '');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...initialData, name, parent_id: parentId !== undefined ? parentId : initialData?.parent_id });
      onClose();
    } catch (err) {
      alert("Errore nel salvataggio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 bg-[#fcfdfe] border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData?.id ? 'Modifica' : parentId ? 'Sottocategoria' : 'Nuova Categoria'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome</label>
            <input 
              required
              autoFocus
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-semibold"
              placeholder="es. Alimentari..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-50 hover:bg-blue-700 transition-all active:scale-[0.98] ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Salvataggio...' : 'Conferma'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const Categories: React.FC = () => {
  const { categories, transactions, addCategory, updateCategory, deleteCategory } = useFinance();
  
  const [modalState, setModalState] = useState<{ open: boolean; initialData?: Partial<Category>; parentId?: string | null }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item?: Category; isUsed: boolean }>({ open: false, isUsed: false });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const hierarchicalCategories = useMemo(() => {
    const main = categories.filter(c => !c.parent_id);
    const sub = categories.filter(c => c.parent_id);
    
    return main.map(parent => ({
      ...parent,
      subcategories: sub.filter(s => s.parent_id === parent.id).sort((a, b) => a.name.localeCompare(b.name))
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const stats = useMemo(() => ({
    total: categories.length,
    main: categories.filter(c => !c.parent_id).length,
    subs: categories.filter(c => c.parent_id).length
  }), [categories]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async (payload: Partial<Category>) => {
    if (payload.id) {
      await updateCategory(payload.id, payload);
    } else {
      await addCategory(payload);
    }
  };

  const openDeleteDialog = (cat: Category) => {
    const isUsed = transactions.some(t => t.category_id === cat.id);
    setDeleteModal({ open: true, item: cat, isUsed });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.item && !deleteModal.isUsed) {
      await deleteCategory(deleteModal.item.id);
      setDeleteModal({ open: false, isUsed: false });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Bar Consistent with design */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-6 px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Principali</span>
            <span className="text-xl font-black text-slate-900">{stats.main}</span>
          </div>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sottocategorie</span>
            <span className="text-xl font-black text-blue-600">{stats.subs}</span>
          </div>
        </div>
      </div>

      {/* Categories Table - Hierarchical approach */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfdfe] border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-12 text-center"></th>
                <th className="px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoria / Sotto-cat.</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {hierarchicalCategories.map(cat => {
                const isExpanded = expandedIds.has(cat.id);
                return (
                  <React.Fragment key={cat.id}>
                    {/* Main Category Row */}
                    <tr className="bg-slate-50/20 group">
                      <td className="px-4 py-4 text-center">
                        {cat.subcategories.length > 0 && (
                          <button 
                            onClick={() => toggleExpand(cat.id)}
                            className={`p-1 text-slate-400 hover:text-blue-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        )}
                      </td>
                      <td className="px-0 py-4 cursor-pointer" onClick={() => cat.subcategories.length > 0 && toggleExpand(cat.id)}>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                          <span className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{cat.name}</span>
                          <span className="text-[10px] font-black text-slate-300 ml-2">({cat.subcategories.length})</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right space-x-1">
                        <button 
                          onClick={() => setModalState({ open: true, parentId: cat.id })}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Aggiungi Sottocategoria"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <button 
                          onClick={() => setModalState({ open: true, initialData: cat })}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => openDeleteDialog(cat)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                    {/* Subcategories Rows - Conditionally Rendered */}
                    {isExpanded && cat.subcategories.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors group/sub animate-in slide-in-from-top-1 duration-200">
                        <td className="px-8 py-3"></td>
                        <td className="px-12 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                            <span className="text-sm font-semibold text-slate-600 group-hover/sub:text-slate-900">{sub.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-3 text-right space-x-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setModalState({ open: true, initialData: sub })}
                            className="p-1.5 text-slate-300 hover:text-blue-600 transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button 
                            onClick={() => openDeleteDialog(sub)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {/* Row per aggiunta categoria principale */}
              <tr 
                onClick={() => setModalState({ open: true, parentId: null })}
                className="hover:bg-blue-50/30 transition-colors cursor-pointer border-t-2 border-dashed border-slate-100"
              >
                <td colSpan={3} className="px-8 py-6 text-center text-slate-400 group">
                  <div className="flex items-center justify-center space-x-2 font-bold text-xs uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    <span>Crea Nuova Categoria Principale</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <CategoryModal 
        isOpen={modalState.open} 
        onClose={() => setModalState({ open: false })}
        onSave={handleSave}
        initialData={modalState.initialData}
        parentId={modalState.parentId}
      />

      <ConfirmModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ ...deleteModal, open: false })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.isUsed ? 'Impossibile eliminare' : 'Elimina Categoria'}
        message={deleteModal.isUsed 
            ? `"${deleteModal.item?.name}" è utilizzata in alcuni movimenti e non può essere rimossa.` 
            : `Vuoi davvero eliminare "${deleteModal.item?.name}"?`
        }
        confirmText={deleteModal.isUsed ? 'Chiudi' : 'Sì, Elimina'}
        isDangerous={!deleteModal.isUsed}
        // Se è usata, disabilitiamo la conferma (o cambiamo comportamento nel parent, qui semplifichiamo UI)
      />
    </div>
  );
};
