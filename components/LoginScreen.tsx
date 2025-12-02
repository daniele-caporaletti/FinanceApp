
import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { authSignIn } from '../services/supabaseService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('user@FinanceApp.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await authSignIn(email, password);
      if (error) throw error;
      // Success handled by Auth State Listener in App.tsx
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'autenticazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-indigo-600 p-8 flex flex-col items-center">
           <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
             <Lock className="text-white w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-white tracking-tight">FinanceApp</h1>
           <p className="text-indigo-200 text-sm mt-1">Gestione Finanziaria Personale</p>
        </div>

        <div className="p-8">
           <form onSubmit={handleAuth} className="flex flex-col gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
               <div className="relative">
                 <input 
                   type="email" 
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="nome@esempio.com"
                   required
                 />
                 <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
               </div>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
               <div className="relative">
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="••••••••"
                   autoFocus
                   required
                 />
                 <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
               </div>
             </div>

             {error && (
               <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                 <ShieldCheck size={16} /> {error}
               </div>
             )}

             <button 
               type="submit" 
               disabled={isLoading || !email || !password}
               className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
             >
               {isLoading ? 'Elaborazione...' : (
                 <>Accedi <ArrowRight size={18} /></>
               )}
             </button>
           </form>
        </div>
      </div>
    </div>
  );
};
