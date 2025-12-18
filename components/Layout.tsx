
import React from 'react';
import { AppSection } from '../types';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { useAuth } from '../AuthContext';

interface SidebarItemProps {
  section: AppSection;
  icon: React.ReactNode;
  label: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ section, icon, label }) => {
  const { currentSection, navigateTo } = useNavigation();
  const isActive = currentSection === section;
  return (
    <button
      onClick={() => navigateTo(section)}
      className={`flex items-center w-full px-4 py-3 mb-2 text-sm font-medium transition-all rounded-xl ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-x-1' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className={`mr-3 transition-transform ${isActive ? 'scale-110' : ''}`}>{icon}</span>
      {label}
    </button>
  );
};

interface LayoutProps {
  children: React.ReactNode;
  isSyncing: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, isSyncing }) => {
  const { syncData, transactions } = useFinance();
  const { currentSection } = useNavigation();
  const { user, signOut } = useAuth();

  const userInitial = user?.email ? user.email.substring(0, 2).toUpperCase() : 'UD';
  const userEmail = user?.email || 'User Default';

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 p-6 z-30 flex flex-col shadow-sm">
        <div className="mb-10 px-2 flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">F</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">FinanceWeb</h1>
            <div className="h-1 w-8 bg-blue-600 rounded-full"></div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <SidebarItem 
            section={AppSection.Dashboard} 
            label="Dashboard" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>} 
          />
          <SidebarItem 
            section={AppSection.Movimenti} 
            label="Movimenti" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>} 
          />
          <SidebarItem 
            section={AppSection.Tag} 
            label="Tag" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>} 
          />
          <SidebarItem 
            section={AppSection.Conti} 
            label="Conti" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>} 
          />
          <SidebarItem 
            section={AppSection.Categorie} 
            label="Categorie" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>} 
          />
          <SidebarItem 
            section={AppSection.Investimenti} 
            label="Investimenti" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>} 
          />
          <div className="my-4 border-t border-slate-100"></div>
          <SidebarItem 
            section={AppSection.Analisi} 
            label="Analisi" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>} 
          />
          <SidebarItem 
            section={AppSection.Ricorrenze} 
            label="Ricorrenze" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} 
          />
        </nav>

        <div className="mt-auto space-y-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
             <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Local</span>
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
             </div>
             <div className="text-xl font-bold text-slate-800">{transactions.length.toLocaleString('it-IT')}</div>
             <div className="text-[11px] text-slate-500">Movimenti sincronizzati</div>
          </div>

          <button 
            onClick={() => syncData()}
            disabled={isSyncing}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center transition-all border font-bold text-sm ${
              isSyncing 
                ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-wait' 
                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50 active:scale-95'
            }`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? 'Sincronizzazione...' : 'Aggiorna Dati'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 capitalize tracking-tight">{currentSection}</h2>
            <p className="text-slate-500 mt-1">Bentornato nella tua area personale.</p>
          </div>
          <div className="flex items-center space-x-4">
             <div className="bg-white border border-slate-200 px-5 py-2.5 rounded-2xl flex items-center shadow-sm">
                <div className="w-8 h-8 rounded-full bg-blue-600 mr-3 flex items-center justify-center text-white font-bold text-xs">
                  {userInitial}
                </div>
                <div className="flex flex-col mr-4">
                  <span className="text-xs font-bold text-slate-900 max-w-[150px] truncate">{userEmail}</span>
                  <span className="text-[10px] text-slate-400 font-medium leading-none">Standard User</span>
                </div>
                <button onClick={signOut} className="text-slate-400 hover:text-rose-600 transition-colors" title="Logout">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
             </div>
          </div>
        </header>
        <div className="max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
};
