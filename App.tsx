
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
import { Investments } from './pages/Investments';
import { Recurrences } from './pages/Recurrences';
import { Analysis } from './pages/Analysis';
import { Login } from './pages/Login';

const AppContent: React.FC = () => {
  const { isSyncing, error, transactions, accounts } = useFinance();
  const { currentSection } = useNavigation();

  // Loading Screen (Solo se non c'è errore bloccante)
  if (isSyncing && !error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 relative mb-8">
           <div className="absolute inset-0 border-8 border-blue-100 rounded-full"></div>
           <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Sincronizzazione in corso...</h1>
        <p className="text-slate-500 text-center max-w-sm">
          Stiamo scaricando tutti i tuoi dati da Supabase per garantirti un'esperienza fluida e veloce.
        </p>
      </div>
    );
  }

  // Se c'è un errore ma abbiamo caricato qualcosa (partial sync), mostriamo l'app con un avviso.
  // Se non abbiamo caricato NULLA e c'è errore, mostriamo schermata di errore.
  const hasPartialData = accounts.length > 0 || transactions.length > 0;

  if (error && !hasPartialData) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-rose-100 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Errore di sincronizzazione</h2>
          <p className="text-slate-500 mb-4 text-sm">{error}</p>
          <div className="bg-rose-50 p-4 rounded-xl text-xs text-rose-700 text-left mb-6 font-mono overflow-auto max-h-32 border border-rose-100">
             Suggerimento: Controlla su Supabase di avere le policy RLS attive per 'SELECT'. Senza policy SELECT, Supabase blocca il download.
          </div>
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

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.Dashboard: return <Dashboard />;
      case AppSection.Movimenti: return <Transactions />;
      case AppSection.Conti: return <Accounts />;
      case AppSection.Categorie: return <Categories />;
      case AppSection.Tag: return <Tags />;
      case AppSection.Investimenti: return <Investments />;
      case AppSection.SpeseEssenziali: return <Recurrences />;
      case AppSection.Analisi: return <Analysis />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout isSyncing={isSyncing}>
      {/* Warning Banner per Sync Parziale */}
      {error && hasPartialData && (
         <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-full">
            <div className="flex items-center space-x-3 text-amber-800 text-sm font-medium">
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               <span>Attenzione: Alcune tabelle non sono state sincronizzate. ({error})</span>
            </div>
         </div>
      )}
      {renderSection()}
    </Layout>
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
