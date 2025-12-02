
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-lg text-white shadow-sm">
            <Database size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">FinanceApp</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block font-medium">Local DB Powered</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <InstallPWA />
          
          <div className="hidden md:block text-right border-r border-slate-100 pr-4 mr-1">
             <div className="text-sm font-bold text-slate-700 font-mono">
               {transactionCount > 0 ? transactionCount.toLocaleString() : '0'}
             </div>
             <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Records</div>
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`
              flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm
              ${isSyncing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95'}
            `}
          >
            <RefreshCw size={16} className={`sm:w-[18px] sm:h-[18px] ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
