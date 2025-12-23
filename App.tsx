
import React from 'react';
import { FinanceProvider, useFinance } from './FinanceContext';
import { NavigationProvider, useNavigation } from './NavigationContext';
import { AuthProvider, useAuth } from './AuthContext';
import { Layout } from './components/Layout';
import { AppSection } from './types';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Accounts } from './pages/Accounts';
import { Categories } from './pages/Categories';
import { Tags } from './pages/Tags';
import { Portfolio } from './pages/Portfolio'; 
import { Recurrences } from './pages/Recurrences';
import { Analysis } from './pages/Analysis';
import { Login } from './pages/Login';

const AppContent: React.FC = () => {
  const { isSyncing, error, transactions, accounts } = useFinance();
  const { currentSection } = useNavigation();

  // Determina se abbiamo dati caricati (per decidere se mostrare full loader o overlay)
  const hasData = accounts.length > 0 || transactions.length > 0;

  // Se c'è un errore critico e non abbiamo dati, mostriamo la schermata di errore.
  if (error && !hasData) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-rose-100 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Errore di sincronizzazione</h2>
          <p className="text-slate-500 mb-4 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Riprova Sincronizzazione
          </button>
        </div>
      </div>
    );
  }

  // Se non abbiamo dati e stiamo sincronizzando (Primo avvio), mostriamo Full Screen Loader
  if (isSyncing && !hasData) {
     return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <h2 className="text-lg font-bold text-slate-700">Caricamento Finanze...</h2>
        </div>
     );
  }

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.Dashboard: return <Dashboard />;
      case AppSection.Movimenti: return <Transactions />;
      case AppSection.Conti: return <Accounts />;
      case AppSection.Categorie: return <Categories />;
      case AppSection.Tag: return <Tags />;
      case AppSection.Portfolio: return <Portfolio />;
      case AppSection.SpeseEssenziali: return <Recurrences />;
      case AppSection.Analisi: return <Analysis />;
      default: return <Dashboard />;
    }
  };

  return (
    <>
      {/* Overlay Loading: Appare sopra il contenuto esistente per non perdere lo stato (filtri, scroll, ecc) */}
      {isSyncing && hasData && (
        <div className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                <span className="text-sm font-bold text-slate-700">Sincronizzazione...</span>
            </div>
        </div>
      )}

      <Layout isSyncing={isSyncing}>
        {/* Warning Banner per Sync Parziale */}
        {error && hasData && (
           <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-full mb-4 rounded-xl mx-4 lg:mx-0 mt-4 lg:mt-0">
              <div className="flex items-center space-x-3 text-amber-800 text-sm font-medium">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 <span>Attenzione: Alcuni dati potrebbero non essere aggiornati. ({error})</span>
              </div>
           </div>
        )}
        {renderSection()}
      </Layout>
    </>
  );
};

const AuthWrapper: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <FinanceProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </FinanceProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

export default App;
