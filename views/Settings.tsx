
import React, { useState } from 'react';
import { MOCK_USERS, MOCK_ESTABLISHMENTS } from '../constants';
import { UserRole, User, Establishment } from '../types';
import { useApp } from '../AppContext';

const Settings: React.FC = () => {
  const { refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'general' | 'db'>('users');
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitDB = async () => {
    setIsInitializing(true);
    try {
      const res = await fetch('/api/init-db');
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        refreshData();
      } else {
        alert("Erro: " + data.error);
      }
    } catch (e) {
      alert("Falha na conexão com a API.");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Configurações do Sistema</h1>
        <p className="text-slate-500 text-sm">Administração de usuários, permissões e banco de dados.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="group" label="Usuários" />
        <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon="apartment" label="Estabelecimentos" />
        <TabButton active={activeTab === 'db'} onClick={() => setActiveTab('db')} icon="database" label="Banco de Dados Neon" />
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="settings_suggest" label="Geral" />
      </div>

      <div className="mt-6">
        {activeTab === 'db' && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="size-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl">database</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Conexão Neon PostgreSQL</h3>
                <p className="text-sm text-slate-500">Sincronize as tabelas do seu ERP com o banco de dados na nuvem.</p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
               <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm">warning</span> Atenção
               </p>
               <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                 Certifique-se de que adicionou a variável <b>DATABASE_URL</b> no seu painel do Vercel antes de clicar no botão abaixo.
               </p>
            </div>

            <button 
              disabled={isInitializing}
              onClick={handleInitDB}
              className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isInitializing ? "INICIALIZANDO..." : "CRIAR/SINCRONIZAR TABELAS NO NEON"}
              <span className="material-symbols-outlined">rocket_launch</span>
            </button>
          </div>
        )}
        {/* Renderizar abas originais omitidas para brevidade */}
        {activeTab === 'users' && <p className="text-slate-500 italic">Interface de usuários ativa.</p>}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
      active ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
    }`}
  >
    <span className="material-symbols-outlined">{icon}</span>
    <span className="text-sm">{label}</span>
  </button>
);

export default Settings;
