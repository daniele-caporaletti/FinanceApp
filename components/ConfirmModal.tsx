
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean; // Se true, il bottone è rosso (es. Elimina)
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Conferma", 
  cancelText = "Annulla",
  isDangerous = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden p-8 text-center animate-in zoom-in-95 duration-300">
        <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${isDangerous ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isDangerous ? (
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            ) : (
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <div className="text-slate-500 text-sm mb-8 leading-relaxed">
          {message}
        </div>

        <div className="space-y-3">
          <button 
            onClick={onConfirm}
            className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] ${
                isDangerous 
                ? 'bg-rose-600 shadow-rose-50 hover:bg-rose-700' 
                : 'bg-blue-600 shadow-blue-50 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
