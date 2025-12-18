
import React, { useState } from 'react';
import { AppSection } from '../types';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { useAuth } from '../AuthContext';

interface SidebarItemProps {
  section: AppSection;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ section, icon, label, onClick }) => {
  const { currentSection, navigateTo } = useNavigation();
  const isActive = currentSection === section;
  
  const handleClick = () => {
    navigateTo(section);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center w-full px-4 py-2.5 mb-1 text-sm font-medium transition-all rounded-full ${
        isActive 
          ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={`mr-3 ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>{icon}</span>
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
  const { user, signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userEmail = user?.email || 'User';

  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 z-30 flex items-center justify-between px-4">
          <div className="flex items-center">
             <h1 className="text-xl font-black text-slate-900 tracking-tighter">finance<span className="text-blue-600">.</span></h1>
          </div>
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
          >
             {isMobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
             )}
          </button>
      </div>

      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/60 p-6 z-40 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-12 px-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">finance<span className="text-blue-600">.</span></h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-0.5">Personal Assets</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
          <div className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generale</div>
          <SidebarItem 
            section={AppSection.Dashboard} 
            label="Overview" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>} 
          />
          <SidebarItem 
            section={AppSection.Movimenti} 
            label="Movimenti" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>} 
          />
          <SidebarItem 
            section={AppSection.Analisi} 
            label="Analisi" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>} 
          />
          
          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestione</div>
          <SidebarItem 
            section={AppSection.Conti} 
            label="Conti" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>} 
          />
          <SidebarItem 
            section={AppSection.Investimenti} 
            label="Investimenti" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>} 
          />
          <SidebarItem 
            section={AppSection.Ricorrenze} 
            label="Ricorrenze" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} 
          />

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configurazione</div>
          <SidebarItem 
            section={AppSection.Categorie} 
            label="Categorie" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>} 
          />
          <SidebarItem 
            section={AppSection.Tag} 
            label="Tag" 
            onClick={closeMobileMenu}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>} 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4 px-1">
             <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-[10px] font-medium text-slate-400">{transactions.length} record</span>
             </div>
             <button 
                onClick={() => syncData()} 
                disabled={isSyncing}
                className={`p-1.5 rounded-lg transition-colors ${isSyncing ? 'text-amber-500' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}
             >
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
          </div>

          <div className="flex items-center justify-between p-1">
             <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 max-w-[140px] truncate">{userEmail}</span>
                <span className="text-[10px] text-slate-400 font-medium">Pro Plan</span>
             </div>
             <button onClick={signOut} className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 hover:bg-rose-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-12 pt-20 lg:pt-12">
        <div className="max-w-7xl mx-auto space-y-8">
           {children}
        </div>
      </main>
    </div>
  );
};
