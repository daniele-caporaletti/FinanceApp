import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './services/db';
import { syncData, deleteTransaction } from './services/supabaseService';
import { Header } from './components/Header';
import { TransactionTable } from './components/TransactionTable';
import { FilterBar } from './components/FilterBar';
import { AccountManager } from './components/AccountManager';
import { CategoryManager } from './components/CategoryManager';
import { TagManager } from './components/TagManager';
import { Dashboard, NavigationFilters } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { ConfirmModal } from './components/ConfirmModal';
import { LoginScreen } from './components/LoginScreen';
import { InstallPWA } from './components/InstallPWA';
import { MegaTransaction } from './types';
import { LayoutDashboard, WalletCards, Layers, Plus, Tag, TableProperties } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'accounts' | 'categories' | 'tags'>('dashboard');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<MegaTransaction | null>(null);

  // Delete Confirmation State
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter State (For the Transaction Table)
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'ALL'>('ALL');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | 'ALL'>('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'ALL'>('ALL');
  
  const [recurrenceFilter, setRecurrenceFilter] = useState<'ALL' | 'ONE_OFF' | 'RECURRING'>('ALL');
  const [contextFilter, setContextFilter] = useState<'ALL' | 'PERSONAL' | 'WORK'>('ALL');
  const [amountFilter, setAmountFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [viewTransfers, setViewTransfers] = useState<boolean>(false); 

  // Load Data from Local DB (Dexie)
  const transactions = useLiveQuery(() => db.megaTransactions.orderBy('date').reverse().toArray());
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray());
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('name').toArray());
  const accounts = useLiveQuery(() => db.accounts.orderBy('name').toArray());

  // Filter accounts for the dropdown: Only show those with is_select = true
  const selectableAccounts = useMemo(() => {
    return accounts?.filter(a => a.is_select) || [];
  }, [accounts]);

  // Calculate available years from ALL transaction data
  const availableYears = useMemo(() => {
    if (!transactions) return [];
    const years = new Set(transactions.map(t => parseInt(t.date.substring(0, 4), 10)));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Calculate unique tags for autocomplete
  const existingTags = useMemo(() => {
    if (!transactions) return [];
    const tags = new Set<string>();
    transactions.forEach(t => {
      if (t.tag) tags.add(t.tag);
    });
    return Array.from(tags).sort();
  }, [transactions]);

  // Helper function to filter transactions based on current state (Only for Table Tab)
  const getFilteredTransactions = useCallback((txs: MegaTransaction[]) => {
    return txs.filter(t => {
      const txYear = parseInt(t.date.substring(0, 4), 10);
      const txMonth = parseInt(t.date.substring(5, 7), 10) - 1; 

      const yearMatch = selectedYear === 'ALL' || txYear === selectedYear;
      const monthMatch = selectedMonth === 'ALL' || txMonth === selectedMonth;
      const categoryMatch = selectedCategoryId === 'ALL' || t.category_id === selectedCategoryId;
      const subcategoryMatch = selectedSubcategoryId === 'ALL' || t.subcategory_id === selectedSubcategoryId;

      const isAccountSelectable = selectableAccounts.some(acc => acc.id === t.account_id);
      const accountMatch = (selectedAccountId === 'ALL' || t.account_id === selectedAccountId) && isAccountSelectable;

      const rawRecurrence = t.recurrence ? t.recurrence.trim().toLowerCase() : '';
      const isRecurring = rawRecurrence.length > 0 && rawRecurrence !== 'one_off' && rawRecurrence !== 'none';
      
      let recurrenceMatch = true;
      if (recurrenceFilter === 'ONE_OFF') recurrenceMatch = !isRecurring;
      else if (recurrenceFilter === 'RECURRING') recurrenceMatch = !!isRecurring;

      const analyticsMatch = viewTransfers || t.analytics_included === true;

      const isWork = t.context && t.context.toLowerCase() === 'work';
      let contextMatch = true;
      if (contextFilter === 'PERSONAL') contextMatch = !isWork;
      else if (contextFilter === 'WORK') contextMatch = !!isWork;

      let amountMatch = true;
      if (amountFilter === 'INCOME') amountMatch = t.amount_base > 0;
      else if (amountFilter === 'EXPENSE') amountMatch = t.amount_base < 0;

      return yearMatch && monthMatch && categoryMatch && subcategoryMatch && accountMatch && recurrenceMatch && analyticsMatch && contextMatch && amountMatch;
    });
  }, [selectedYear, selectedMonth, selectedCategoryId, selectedSubcategoryId, selectedAccountId, selectableAccounts, recurrenceFilter, contextFilter, amountFilter, viewTransfers]);

  // Derived filtered data for the Table
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return getFilteredTransactions(transactions);
  }, [transactions, getFilteredTransactions]);

  const handleCategoryChange = (catId: string | 'ALL') => {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId('ALL');
  };

  const handleNavigateToAccounts = useCallback(() => {
    setActiveTab('accounts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateToTransactions = useCallback((filters: NavigationFilters) => {
    setSelectedYear(filters.year);
    setSelectedMonth(filters.month);
    setRecurrenceFilter(filters.recurrence);
    setContextFilter(filters.context);
    setAmountFilter(filters.amount);
    setViewTransfers(filters.viewTransfers);

    setSelectedCategoryId('ALL');
    setSelectedSubcategoryId('ALL');
    setSelectedAccountId('ALL');

    setActiveTab('transactions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSync = useCallback(async (initializeFilters = false) => {
    setIsSyncing(true);
    setError(null);
    setSyncStatus('Initializing...');
    
    try {
      await syncData((status) => {
        setSyncStatus(status);
      });

      if (initializeFilters) {
        const now = new Date();
        setSelectedYear(now.getFullYear());
        setSelectedMonth(now.getMonth());
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  }, []);

  const handleEdit = (tx: MegaTransaction) => {
    setEditingTransaction(tx);
    setIsTxFormOpen(true);
  };

  const promptDelete = (id: string) => {
    setTransactionToDeleteId(id);
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

  const cancelDelete = () => {
    setTransactionToDeleteId(null);
  };

  const closeForm = () => {
    setIsTxFormOpen(false);
    setEditingTransaction(null);
  };

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    // Trigger sync on first login
    handleSync(true);
  }, [handleSync]);

  // Navigation Items for Desktop and Mobile
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimenti', icon: TableProperties },
    { id: 'tags', label: 'Analisi Tag', icon: Tag },
    { id: 'accounts', label: 'Conti', icon: WalletCards },
    { id: 'categories', label: 'Categorie', icon: Layers },
  ] as const;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-24 md:pb-0 safe-bottom">
      <Header 
        onSync={() => handleSync(false)} 
        isSyncing={isSyncing} 
        transactionCount={transactions?.length || 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative">
        
        {/* Status Bar */}
        <div className="mb-6 h-8 flex items-center justify-center sm:justify-start">
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

        {/* Desktop Navigation (Floating Pills) */}
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
            onClick={() => {
              setEditingTransaction(null);
              setIsTxFormOpen(true);
            }}
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
                
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                selectedCategoryId={selectedCategoryId}
                selectedSubcategoryId={selectedSubcategoryId}
                selectedAccountId={selectedAccountId}
                
                recurrenceFilter={recurrenceFilter}
                contextFilter={contextFilter}
                amountFilter={amountFilter}
                viewTransfers={viewTransfers}

                onYearChange={setSelectedYear}
                onMonthChange={setSelectedMonth}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={setSelectedSubcategoryId}
                onAccountChange={setSelectedAccountId}
                
                onRecurrenceChange={setRecurrenceFilter}
                onContextChange={setContextFilter}
                onAmountChange={setAmountFilter}
                onViewTransfersChange={setViewTransfers}
              />

              <TransactionTable 
                  transactions={filteredTransactions} 
                  isLoading={!transactions && !error}
                  onEdit={handleEdit}
                  onDelete={promptDelete}
              />
            </>
          )}

          {activeTab === 'tags' && (
            <TagManager 
              transactions={transactions || []}
              years={availableYears}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountManager 
              accounts={accounts || []} 
              transactions={transactions || []} 
            />
          )}

          {activeTab === 'categories' && (
            <CategoryManager 
              categories={categories || []} 
              subcategories={subcategories || []} 
            />
          )}
        </div>
        
      </main>

      {/* Mobile Bottom Navigation Bar (Glassmorphism) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200/50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-40 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                activeTab === item.id 
                  ? 'text-indigo-600 scale-105' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-full ${activeTab === item.id ? 'bg-indigo-50' : ''}`}>
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-semibold tracking-tight">{item.label}</span>
            </button>
          ))}
          {/* Mobile Install Button in Nav */}
          <div className="w-full h-full flex flex-col items-center justify-center">
            <InstallPWA isMobile={true} />
          </div>
        </div>
      </nav>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => {
          setEditingTransaction(null);
          setIsTxFormOpen(true);
        }}
        className="md:hidden fixed bottom-20 right-5 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-500/30 flex items-center justify-center z-50 active:scale-90 transition-transform hover:bg-indigo-700"
        aria-label="Nuova Transazione"
      >
        <Plus size={28} />
      </button>

      {/* New Transaction / Edit Modal */}
      {isTxFormOpen && (
        <TransactionForm
          accounts={accounts || []}
          categories={categories || []}
          subcategories={subcategories || []}
          existingTags={existingTags}
          initialData={editingTransaction}
          onClose={closeForm}
        />
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmModal 
        isOpen={!!transactionToDeleteId}
        title="Elimina Transazione"
        message="Sei sicuro di voler eliminare definitivamente questa transazione? L'operazione non può essere annullata."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isProcessing={isDeleting}
      />
    </div>
  );
};

export default App;