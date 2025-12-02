
import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { APP_SECRET } from '../constants';
import { initSupabase } from '../services/supabaseService';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate small delay for better UX
    setTimeout(() => {
      if (password === 'FinanceApp') {
        try {
          const secret = atob(APP_SECRET);
          
          initSupabase(secret);
          
          onLogin();
        } catch (err) {
          setError('Errore durante l\'accesso.');
          setIsLoading(false);
        }
      } else {
        setError('Password errata. Riprova.');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8 flex flex-col items-center">
           <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
             <Lock className="text-white w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-white tracking-tight">FinanceApp</h1>
        </div>

        <div className="p-8">
           <form onSubmit={handleLogin} className="flex flex-col gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg tracking-widest"
                 placeholder="••••••••"
                 autoFocus
               />
             </div>

             {error && (
               <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                 <ShieldCheck size={16} /> {error}
               </div>
             )}

             <button 
               type="submit" 
               disabled={isLoading || !password}
               className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {isLoading ? 'Accesso in corso...' : (
                 <>Accedi <ArrowRight size={18} /></>
               )}
             </button>
           </form>
        </div>
      </div>
    </div>
  );
};