
import React from 'react';
import { X, Info } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
             <Info size={18} className="text-indigo-600" /> {title}
           </h3>
           <button 
             onClick={onClose} 
             className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
           >
             <X size={20} />
           </button>
        </div>
        
        <div className="p-6 text-sm text-slate-600 leading-relaxed">
           {children}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100">
           <button 
             onClick={onClose} 
             className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 active:scale-[0.98]"
           >
             Ho capito
           </button>
        </div>
      </div>
    </div>
  );
};
