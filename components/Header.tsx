
import React from 'react';
import { Database, RefreshCw, LogOut, Check, AlertCircle } from 'lucide-react';
import { InstallPWA } from './InstallPWA';

interface HeaderProps {
  onSync: () => void;
  onLogout: () => void;
  isSyncing: boolean;
  syncStatus: string;
  syncError: string | null;
  transactionCount: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onSync, 
  onLogout, 
  isSyncing, 
  syncStatus, 
  syncError, 
  transactionCount 
}) => {
  
  // Determine Button State Configuration
  let buttonClass = 'bg-white border-slate-200 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50';
  let icon = <RefreshCw size={16} className="sm:w-[16px] sm:h-[16px]" />;
  let text = 'Sync Data';
  let mobileText = null; // Normally hidden on mobile to save space

  if (syncError) {
    buttonClass = 'bg-red-50 border-red-200 text-red-600';
    icon = <AlertCircle size={16} />;
    text = 'Errore';
  } else if (!isSyncing && syncStatus === 'Complete') {
    buttonClass = 'bg-emerald-50 border-emerald-200 text-emerald-600';
    icon = <Check size={16} />;
    text = 'Completo';
  } else if (isSyncing) {
    buttonClass = 'bg-indigo-50 border-indigo-200 text-indigo-600 cursor-not-allowed';
    icon = <RefreshCw size={16} className="animate-spin" />;
    text = syncStatus || 'Syncing...';
    // On mobile, just show "..." or nothing next to spinner to keep it compact
    mobileText = null; 
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 safe-top transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Database size={20} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-none">FinanceApp</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium uppercase tracking-wide">Local DB</p>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          <InstallPWA />
          
          <div className="hidden md:flex flex-col items-end border-r border-slate-200/60 pr-4 mr-1">
             <div className="text-sm font-bold text-slate-800 font-mono tabular-nums leading-none">
               {transactionCount > 0 ? transactionCount.toLocaleString() : '0'}
             </div>
             <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Records</div>
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`
              flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full font-medium transition-all text-xs sm:text-sm border shadow-sm active:scale-95
              ${buttonClass}
            `}
            title={syncError || syncStatus}
          >
            {icon}
            {/* Desktop Text: Always Show */}
            <span className="hidden sm:inline truncate max-w-[150px]">{text}</span>
            {/* Mobile Text: Only if specifically set (rarely) */}
            {mobileText && <span className="sm:hidden">{mobileText}</span>}
          </button>

          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors active:scale-95"
            title="Logout"
          >
             <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
