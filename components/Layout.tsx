
import React, { useState, useEffect } from 'react';
import { AppSection } from '../types';
import { useFinance } from '../FinanceContext';
import { useNavigation } from '../NavigationContext';
import { useAuth } from '../AuthContext';

// --- COMPONENTS ---

interface SidebarItemProps {
  section: AppSection;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ section, icon, label, onClick, isActive }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 mb-1 text-sm font-bold transition-all rounded-xl group ${
        isActive 
          ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
          : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'
      }`}
    >
      <span className={`mr-3 transition-colors ${isActive ? 'text-slate-300' : 'text-slate-400 group-hover:text-blue-500'}`}>{icon}</span>
      {label}
    </button>
  );
};

// --- ICONS ---
const Icons = {
  Dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </svg>
  ),
  Movimenti: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 6h4" />
    </svg>
  ),
  Analisi: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  Conti: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="12" y1="15" x2="12" y2="15.01" strokeWidth="3" />
    </svg>
  ),
  Portfolio: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  SpeseEssenziali: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  Categorie: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  ),
  Tag: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94 .94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
};

// --- MAIN LAYOUT ---

interface LayoutProps {
  children: React.ReactNode;
  isSyncing: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, isSyncing }) => {
  const { currentSection, navigateTo } = useNavigation();
  const { syncData } = useFinance();
  const { user, signOut } = useAuth();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const userEmail = user?.email || 'User';

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleNav = (section: AppSection) => {
    navigateTo(section);
    setIsMobileMoreOpen(false);
  };

  const handleNewTransaction = () => {
    setIsMobileMoreOpen(false);
    navigateTo(AppSection.Movimenti, { openNew: true });
  };

  const handleManualSync = async () => {
    if(!isSyncing) {
        await syncData();
    }
  };

  // DESKTOP NAVIGATION GROUPS
  const navGroups = [
    {
        title: "Generale",
        items: [
            { section: AppSection.Dashboard, label: 'Home', icon: Icons.Dashboard },
            { section: AppSection.Movimenti, label: 'Movimenti', icon: Icons.Movimenti },
            { section: AppSection.Analisi, label: 'Analisi', icon: Icons.Analisi },
        ]
    },
    {
        title: "Patrimonio",
        items: [
            { section: AppSection.Conti, label: 'Conti', icon: Icons.Conti },
            { section: AppSection.Portfolio, label: 'Portfolio', icon: Icons.Portfolio },
        ]
    },
    {
        title: "Strumenti",
        items: [
            { section: AppSection.SpeseEssenziali, label: 'Pianificazione', icon: Icons.SpeseEssenziali },
            { section: AppSection.Categorie, label: 'Categorie', icon: Icons.Categorie },
            { section: AppSection.Tag, label: 'Tag', icon: Icons.Tag },
        ]
    }
  ];

  const mobileSheetItems = [
    { section: AppSection.Conti, label: 'Conti', icon: Icons.Conti },
    { section: AppSection.Portfolio, label: 'Portfolio', icon: Icons.Portfolio },
    { section: AppSection.SpeseEssenziali, label: 'Pianificazione', icon: Icons.SpeseEssenziali },
    { section: AppSection.Categorie, label: 'Categorie', icon: Icons.Categorie },
    { section: AppSection.Tag, label: 'Tag', icon: Icons.Tag },
  ];

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-[#fcfdfe] border-r border-slate-200 p-6 z-40 flex-col">
        {/* Header */}
        <div className="mb-8 px-2 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">F</div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter">finance<span className="text-blue-600">.</span></h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase -mt-0.5">Personal OS</p>
            </div>
        </div>

        {/* CTA */}
        <button 
            onClick={handleNewTransaction}
            className="w-full py-3.5 mb-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] group"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            <span className="font-bold text-sm tracking-wide">Nuovo Movimento</span>
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
          {navGroups.map((group, idx) => (
              <div key={idx}>
                  <div className="px-4 mb-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">{group.title}</div>
                  <div className="space-y-0.5">
                    {group.items.map(item => (
                        <SidebarItem 
                        key={item.section}
                        section={item.section} 
                        label={item.label} 
                        icon={item.icon}
                        isActive={currentSection === item.section}
                        onClick={() => handleNav(item.section)} 
                        />
                    ))}
                  </div>
              </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          {/* Install App Button */}
          {deferredPrompt && (
             <button 
                onClick={handleInstallClick}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center space-x-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>Installa App</span>
             </button>
          )}

          {/* Manual Sync Button */}
          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-wide hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : 'group-hover:text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
             </svg>
             <span>{isSyncing ? 'Sync in corso...' : 'Sincronizza'}</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
             <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate">{userEmail}</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span className="text-[10px] text-slate-400 font-medium">Online</span>
                </div>
             </div>
             <button onClick={signOut} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-white rounded-xl transition-all shadow-sm" title="Esci">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 p-4 lg:p-12 w-full min-w-0 pb-32 lg:pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
           {children}
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] z-50 px-2 pb-safe pt-2">
         <div className="grid grid-cols-5 items-end pb-2">
            <button onClick={() => handleNav(AppSection.Dashboard)} className={`flex flex-col items-center justify-center w-full py-2 space-y-1 transition-all duration-300 ${currentSection === AppSection.Dashboard ? '-translate-y-1' : ''}`}>
                <div className={`p-2 rounded-2xl transition-all ${currentSection === AppSection.Dashboard ? 'text-slate-900' : 'text-slate-400'}`}>{Icons.Dashboard}</div>
                <span className={`text-[9px] font-bold transition-all ${currentSection === AppSection.Dashboard ? 'text-slate-900' : 'text-slate-300'}`}>Home</span>
            </button>
             <button onClick={() => handleNav(AppSection.Movimenti)} className={`flex flex-col items-center justify-center w-full py-2 space-y-1 transition-all duration-300 ${currentSection === AppSection.Movimenti ? '-translate-y-1' : ''}`}>
                <div className={`p-2 rounded-2xl transition-all ${currentSection === AppSection.Movimenti ? 'text-slate-900' : 'text-slate-400'}`}>{Icons.Movimenti}</div>
                <span className={`text-[9px] font-bold transition-all ${currentSection === AppSection.Movimenti ? 'text-slate-900' : 'text-slate-300'}`}>Movimenti</span>
            </button>
            <div className="flex items-center justify-center -translate-y-5">
                <button onClick={handleNewTransaction} className="w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
            <button onClick={() => handleNav(AppSection.Analisi)} className={`flex flex-col items-center justify-center w-full py-2 space-y-1 transition-all duration-300 ${currentSection === AppSection.Analisi ? '-translate-y-1' : ''}`}>
                <div className={`p-2 rounded-2xl transition-all ${currentSection === AppSection.Analisi ? 'text-slate-900' : 'text-slate-400'}`}>{Icons.Analisi}</div>
                <span className={`text-[9px] font-bold transition-all ${currentSection === AppSection.Analisi ? 'text-slate-900' : 'text-slate-300'}`}>Analisi</span>
            </button>
            <button onClick={() => setIsMobileMoreOpen(true)} className={`flex flex-col items-center justify-center w-full py-2 space-y-1 transition-all duration-300 ${isMobileMoreOpen ? '-translate-y-1' : ''}`}>
                <div className={`p-2 rounded-2xl transition-all ${isMobileMoreOpen ? 'text-blue-600' : 'text-slate-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </div>
                <span className={`text-[9px] font-bold transition-all ${isMobileMoreOpen ? 'text-blue-600' : 'text-slate-300'}`}>Altro</span>
            </button>
         </div>
      </div>

      {isMobileMoreOpen && (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300" onClick={() => setIsMobileMoreOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-[70] lg:hidden animate-in slide-in-from-bottom duration-300 p-6 pb-28 border-t border-slate-100 shadow-2xl overflow-y-auto max-h-[85vh]">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                {deferredPrompt && (
                    <div className="mb-6">
                        <button onClick={handleInstallClick} className="w-full p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center space-x-3 shadow-xl active:scale-[0.98] transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <div className="text-left"><span className="block text-sm font-bold">Installa Applicazione</span><span className="block text-[10px] text-slate-400 font-medium">Aggiungi alla schermata home</span></div>
                        </button>
                    </div>
                )}
                
                {/* Mobile Sync Button */}
                <div className="mb-6">
                    <button onClick={() => { handleManualSync(); setIsMobileMoreOpen(false); }} className="w-full p-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl flex items-center justify-center space-x-3 active:scale-[0.98] transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span className="block text-sm font-bold">{isSyncing ? 'Sincronizzazione...' : 'Sincronizza Dati'}</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {mobileSheetItems.map(item => (
                        <button key={item.section} onClick={() => handleNav(item.section)} className={`flex flex-col items-center p-5 rounded-[1.5rem] border transition-all ${currentSection === item.section ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-600 active:bg-slate-100'}`}>
                            <div className={`p-3 rounded-2xl mb-2 ${currentSection === item.section ? 'bg-white text-blue-600 shadow-sm' : 'bg-white text-slate-400 border border-slate-100'}`}>{item.icon}</div>
                            <span className="text-xs font-bold">{item.label}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 pt-8 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                        <div><p className="text-xs font-bold text-slate-900">{userEmail}</p><p className="text-[10px] font-medium text-slate-400">Account sincronizzato</p></div>
                        <button onClick={signOut} className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-rose-100 transition-colors">
                            <span>Esci</span><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};
