
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, systemConfig, refreshData } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
    }
    setLoading(false);
  };

  const handleInitialSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch('/api/init-db');
      const data = await res.json();
      if (res.ok) {
        alert("Sistema inicializado com sucesso! Use admin@erp.com / admin123");
        await refreshData();
      } else {
        alert("Erro ao configurar: " + data.error);
      }
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark font-display relative overflow-hidden">
      {/* Círculos de Background Decorativos */}
      <div className="absolute top-0 right-0 size-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 size-[400px] bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <div className="w-full max-w-md px-6 z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-10 rounded-[3rem] shadow-2xl border border-white/20 dark:border-slate-800">
          <div className="flex flex-col items-center mb-10">
            {systemConfig.logoUrl ? (
              <img src={systemConfig.logoUrl} className="h-16 mb-4 object-contain" alt="Logo" />
            ) : (
              <div className="bg-primary size-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 mb-4">
                <span className="material-symbols-outlined text-4xl">storefront</span>
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter text-center">{systemConfig.companyName}</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 text-center">Acesso ao Terminal de Gestão</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-black text-center animate-in shake duration-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">E-mail Corporativo</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-14 bg-white dark:bg-slate-800 border-none rounded-2xl pl-12 pr-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="admin@erp.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Senha de Acesso</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-14 bg-white dark:bg-slate-800 border-none rounded-2xl pl-12 pr-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-primary hover:bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <>
                  Entrar no Sistema
                  <span className="material-symbols-outlined text-xl">login</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
             <button 
              onClick={handleInitialSetup}
              disabled={setupLoading}
              className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase flex items-center gap-2"
             >
               {setupLoading ? 'Configurando...' : 'Configurar Sistema (Primeiro Acesso)'}
               <span className="material-symbols-outlined text-sm">settings</span>
             </button>
             <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em]">Retail Cloud v4.5.1</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
