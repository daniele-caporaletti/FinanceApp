import React from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { InstallPWA } from './InstallPWA';

interface HeaderProps {
  onSync: () => void;
  isSyncing: boolean;
  transactionCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onSync, isSyncing, transactionCount }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 safe-top transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Database size={20} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-none">FinanceApp</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium uppercase tracking-wide">Secure Local DB</p>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-3 sm:gap-4">
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
              flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all text-xs sm:text-sm border
              ${isSyncing 
                ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-white border-slate-200 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-sm active:scale-95'}
            `}
          >
            <RefreshCw size={16} className={`sm:w-[16px] sm:h-[16px] ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};