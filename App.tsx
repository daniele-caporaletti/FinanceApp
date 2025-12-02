
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './services/db';
import { syncData, deleteTransaction, getSession, onAuthStateChange, authSignOut } from './services/supabaseService';
import { Header } from './components/Header';
import { TransactionTable } from './components/TransactionTable';
import { FilterBar } from './components/FilterBar';
import { AccountManager } from './components/AccountManager';
import { CategoryManager } from './components/CategoryManager';
import { TagManager } from './components/TagManager';
import { InvestmentManager } from './components/InvestmentManager'; 
import { Dashboard, NavigationFilters } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { ConfirmModal } from './components/ConfirmModal';
import { LoginScreen } from './components/LoginScreen';
import { MegaTransaction } from './types';
import { LayoutDashboard, WalletCards, Layers, Plus, Tag, TableProperties, TrendingUp } from 'lucide-react';
import { useTransactionFilters } from './hooks/useTransactionFilters';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  // --- Auth State ---
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // --- Sync State ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // --- Navigation State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'tags' | 'accounts' | 'categories' | 'investments'>('dashboard');
  
  // --- Modal States ---
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<MegaTransaction | null>(null);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Data Loading (Dexie) ---
  const transactions = useLiveQuery(() => db.megaTransactions.orderBy('date').reverse().toArray());
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray());
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('name').toArray());
  const accounts = useLiveQuery(() => db.accounts.orderBy('name').toArray());
  const investments = useLiveQuery(() => db.investments.orderBy('name').toArray());
  const investmentTrends = useLiveQuery(() => db.investmentTrends.toArray());

  // --- Filter Logic (Custom Hook) ---
  const { 
    filters, 
    setFilter, 
    resetCategoryFilters, 
    setFilters, 
    filteredTransactions, 
    availableYears,
    selectableAccounts 
  } = useTransactionFilters(transactions, accounts);

  // --- Derived Data ---
  const existingTags = useMemo(() => {
    if (!transactions) return [];
    const tags = new Set<string>();
    transactions.forEach(t => { if (t.tag) tags.add(t.tag); });
    return Array.from(tags).sort();
  }, [transactions]);

  // --- Auth Logic ---
  useEffect(() => {
    // Check initial session
    getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthChecking(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange((s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Sync Logic ---
  const handleSync = useCallback(async (initializeFilters = false) => {
    if (!session) return; // Don't sync if not logged in

    setIsSyncing(true);
    setError(null);
    setSyncStatus('Initializing...');
    
    try {
      await syncData((status) => setSyncStatus(status));

      if (initializeFilters) {
        const now = new Date();
        setFilter('year', now.getFullYear());
        setFilter('month', now.getMonth());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  }, [setFilter, session]);

  // Auto-sync when session becomes active
  useEffect(() => {
    if (session) {
      handleSync(true);
    }
  }, [session, handleSync]);

  // --- Actions ---

  const handleSignOut = async () => {
    await authSignOut();
    setSession(null);
    // Optional: Clear local DB on logout? 
    // await db.delete(); await db.open(); 
  };

  const handleNavigateToAccounts = useCallback(() => {
    setActiveTab('accounts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateToTransactions = useCallback((navFilters: NavigationFilters) => {
    // Bulk update filters based on dashboard click
    setFilters({
      year: navFilters.year,
      month: navFilters.month,
      recurrence: navFilters.recurrence,
      context: navFilters.context,
      amount: navFilters.amount,
      viewTransfers: navFilters.viewTransfers,
      categoryId: navFilters.categoryId || 'ALL', 
      excludeCategoryId: navFilters.excludeCategoryId || null, // Handle exclusion
      subcategoryId: 'ALL',
      accountId: 'ALL'
    });

    setActiveTab('transactions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setFilters]);

  const handleEdit = (tx: MegaTransaction) => {
    setEditingTransaction(tx);
    setIsTxFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(transactionToDeleteId);
      setTransactionToDeleteId(null);
    } catch (err: any) {
      alert(`Errore durante l'eliminazione: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimenti', icon: TableProperties },
    { id: 'tags', label: 'Tag', icon: Tag },
    { id: 'accounts', label: 'Conti', icon: WalletCards },
    { id: 'categories', label: 'Categorie', icon: Layers },
    { id: 'investments', label: 'Investimenti', icon: TrendingUp },
  ] as const;

  const showStatusBar = isSyncing || (syncStatus === 'Complete') || error;

  // --- RENDER ---

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-safe md:pb-0">
      <Header 
        onSync={() => handleSync(false)} 
        onLogout={handleSignOut}
        isSyncing={isSyncing} 
        transactionCount={transactions?.length || 0}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-8 relative pb-24 md:pb-12">
        
        {/* Status Bar (Only if needed) */}
        {showStatusBar && (
          <div className="flex justify-start mb-4">
              <div className="h-8 flex items-center">
                  {isSyncing && (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100 animate-pulse shadow-sm">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          {syncStatus}
                      </div>
                  )}
                  {!isSyncing && syncStatus === 'Complete' && (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100 shadow-sm animate-in fade-in zoom-in duration-300">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                          Sync Complete
                      </div>
                  )}
                  {error && (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-100 shadow-sm">
                          <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                          Error: {error}
                      </div>
                  )}
              </div>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center mb-8">
          <div className="flex bg-white/70 backdrop-blur-md p-1.5 rounded-full border border-white/40 shadow-sm">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                {item.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => { setEditingTransaction(null); setIsTxFormOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all font-semibold active:scale-95 hover:-translate-y-0.5"
          >
            <Plus size={20} />
            <span className="text-sm">Nuova Transazione</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={transactions || []}
              accounts={accounts || []}
              categories={categories || []} // Pass categories
              years={availableYears}
              onNavigateToAccounts={handleNavigateToAccounts}
              onNavigateToTransactions={handleNavigateToTransactions}
            />
          )}

          {activeTab === 'transactions' && (
            <>
              <FilterBar 
                years={availableYears}
                categories={categories || []}
                subcategories={subcategories || []}
                accounts={selectableAccounts}
                
                selectedYear={filters.year}
                selectedMonth={filters.month}
                selectedCategoryId={filters.categoryId}
                selectedSubcategoryId={filters.subcategoryId}
                selectedAccountId={filters.accountId}
                recurrenceFilter={filters.recurrence}
                contextFilter={filters.context}
                amountFilter={filters.amount}
                viewTransfers={filters.viewTransfers}

                onYearChange={(v) => setFilter('year', v)}
                onMonthChange={(v) => setFilter('month', v)}
                onCategoryChange={(v) => { setFilter('categoryId', v); setFilter('subcategoryId', 'ALL'); }}
                onSubcategoryChange={(v) => setFilter('subcategoryId', v)}
                onAccountChange={(v) => setFilter('accountId', v)}
                onRecurrenceChange={(v) => setFilter('recurrence', v)}
                onContextChange={(v) => setFilter('context', v)}
                onAmountChange={(v) => setFilter('amount', v)}
                onViewTransfersChange={(v) => setFilter('viewTransfers', v)}
              />

              <TransactionTable 
                  transactions={filteredTransactions} 
                  isLoading={!transactions && !error}
                  onEdit={handleEdit}
                  onDelete={(id) => setTransactionToDeleteId(id)}
              />
            </>
          )}

          {activeTab === 'tags' && (
            <TagManager transactions={transactions || []} years={availableYears} />
          )}

          {activeTab === 'accounts' && (
            <AccountManager accounts={accounts || []} transactions={transactions || []} />
          )}

          {activeTab === 'categories' && (
            <CategoryManager categories={categories || []} subcategories={subcategories || []} />
          )}
          
          {activeTab === 'investments' && (
            <InvestmentManager 
              investments={investments || []}
              trends={investmentTrends || []}
            />
          )}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-40 pb-safe">
        <div className="grid grid-cols-5 h-16 px-1">
          {NAV_ITEMS.filter(item => item.id !== 'categories').slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                activeTab === item.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-50 shadow-sm' : ''}`}>
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-medium tracking-tight ${activeTab === item.id ? 'font-bold' : ''}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile FAB */}
      <button
        onClick={() => { setEditingTransaction(null); setIsTxFormOpen(true); }}
        className="md:hidden fixed bottom-[5.5rem] right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center z-50 active:scale-90 transition-transform hover:bg-indigo-700"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Modals */}
      {isTxFormOpen && (
        <TransactionForm
          accounts={accounts || []}
          categories={categories || []}
          subcategories={subcategories || []}
          existingTags={existingTags}
          initialData={editingTransaction}
          onClose={() => { setIsTxFormOpen(false); setEditingTransaction(null); }}
        />
      )}

      <ConfirmModal 
        isOpen={!!transactionToDeleteId}
        title="Elimina Transazione"
        message="Sei sicuro di voler eliminare definitivamente questa transazione?"
        onConfirm={confirmDelete}
        onCancel={() => setTransactionToDeleteId(null)}
        isProcessing={isDeleting}
      />
    </div>
  );
};

export default App;
