import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, Fingerprint } from 'lucide-react';
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

    setTimeout(() => {
      if (password === 'FinanceApp') {
        try {
          if (!APP_SECRET) {
            throw new Error("Configuration Error.");
          }
          const secret = atob(APP_SECRET);
          initSupabase(secret);
          onLogin();
        } catch (err: any) {
          setError(err.message || 'Access Denied.');
          setIsLoading(false);
        }
      } else {
        setError('Password errata.');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30 transform rotate-3">
            <Fingerprint className="text-white w-10 h-10 opacity-90" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">FinanceApp</h1>
          <p className="text-slate-400 font-medium">Vault Finanziario Personale</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-slate-800 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600 text-lg tracking-widest shadow-inner"
              placeholder="Password"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-1">
              <ShieldCheck size={16} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || !password}
            className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-200 focus:ring-4 focus:ring-white/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-xl"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>Sblocca Vault <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};