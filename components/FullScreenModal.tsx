
import React, { useEffect } from 'react';

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const FullScreenModal: React.FC<FullScreenModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children 
}) => {
  
  // Blocca lo scroll del body quando il modale è aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center md:p-6 bg-white/80 md:bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Container Modale: Full su mobile, Card su Desktop */}
      <div className="bg-white w-full h-full md:max-w-3xl md:h-auto md:max-h-[85vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500 border border-slate-100">
        
        {/* Header */}
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>}
          </div>
          
          <button 
            onClick={onClose} 
            className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all shadow-sm border border-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10">
          {children}
        </div>

        {/* Footer (Opzionale, per chiudere su mobile facilmente) */}
        <div className="p-6 border-t border-slate-50 md:hidden flex-shrink-0 bg-white pb-safe">
            <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
            >
                Chiudi
            </button>
        </div>

      </div>
    </div>
  );
};
