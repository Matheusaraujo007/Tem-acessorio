
import React, { ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { UserRole } from '../types';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const isPDV = location.pathname === '/pdv';
  
  // Verificações de Permissão
  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  // Estados de interface
  const [isStockOpen, setIsStockOpen] = useState(location.pathname.includes('estoque') || location.pathname.includes('balanco'));
  const [isVendasOpen, setIsVendasOpen] = useState(location.pathname.includes('pdv') || location.pathname.includes('clientes'));
  
  // Estados de Autenticação (Simulada)
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setIsLoggedOut(true);
    setShowLogoutConfirm(false);
  };

  const handleLogin = () => {
    setIsLoggedOut(false);
    navigate('/');
  };

  // Tela de Login / Sessão Encerrada
  if (isLoggedOut) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display animate-in fade-in duration-500">
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-8 max-w-md w-full mx-4">
          <div className="bg-primary rounded-2xl size-20 flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined text-5xl">lock_open</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sessão Encerrada</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Sua conexão com o ERP Retail foi finalizada com segurança.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full py-5 bg-primary hover:bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            Acessar Sistema Novamente
          </button>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Versão 4.0.2 - Tem Acessório</p>
        </div>
      </div>
    );
  }

  if (isPDV) {
    return <div className="h-screen w-full overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col justify-between p-4">
        <div className="flex flex-col gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-primary rounded-lg size-10 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-slate-900 dark:text-white text-base font-bold leading-none">ERP Retail</h1>
              <p className="text-slate-500 dark:text-[#9da8b9] text-xs font-normal">Gestão Multi-loja</p>
            </div>
          </div>
          {/* Nav Items */}
          <nav className="flex flex-col gap-1">
            <SidebarItem to="/" icon="dashboard" label="Dashboard" />
            
            {/* Menu Vendas Expansível */}
            <div className="flex flex-col">
              <button 
                onClick={() => setIsVendasOpen(!isVendasOpen)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-slate-600 dark:text-[#9da8b9] hover:bg-slate-100 dark:hover:bg-slate-800 ${isVendasOpen ? 'text-primary font-black' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">shopping_cart</span>
                  <p className="text-sm">Vendas (PDV)</p>
                </div>
                <span className={`material-symbols-outlined transition-transform text-sm ${isVendasOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              
              {isVendasOpen && (
                <div className="flex flex-col gap-1 pl-9 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <NavLink to="/pdv" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Ir para Loja</NavLink>
                  <NavLink to="/clientes" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Base de Clientes</NavLink>
                </div>
              )}
            </div>

            <SidebarItem to="/relatorios" icon="analytics" label="Relatórios" />
            
            {/* Menu Estoque Expansível */}
            <div className="flex flex-col">
              <button 
                onClick={() => setIsStockOpen(!isStockOpen)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-slate-600 dark:text-[#9da8b9] hover:bg-slate-100 dark:hover:bg-slate-800 ${isStockOpen ? 'text-primary font-black' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">inventory_2</span>
                  <p className="text-sm">Estoque</p>
                </div>
                <span className={`material-symbols-outlined transition-transform text-sm ${isStockOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              
              {isStockOpen && (
                <div className="flex flex-col gap-1 pl-9 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <NavLink to="/estoque" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Catálogo de Itens</NavLink>
                  <NavLink to="/balanco" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Balanço (Auditoria)</NavLink>
                </div>
              )}
            </div>

            <SidebarItem to="/entradas" icon="arrow_circle_down" label="Entradas" />
            <SidebarItem to="/saidas" icon="arrow_circle_up" label="Saídas" />
            
            {/* Proteção de Menu Estratégico */}
            {isAdminOrManager && (
              <>
                <SidebarItem to="/dre" icon="payments" label="Financeiro (DRE)" />
                <SidebarItem to="/config" icon="settings" label="Configurações" />
              </>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-1 pt-4 border-t border-slate-200 dark:border-slate-800">
          <a className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-[#9da8b9] hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined">chat_bubble</span>
            <p className="text-sm font-medium">Suporte</p>
          </a>
          
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-3 py-2 mt-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all font-bold group"
          >
            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">logout</span>
            <p className="text-sm uppercase tracking-widest text-[10px]">Encerrar Sessão</p>
          </button>

          <div className="flex items-center gap-3 px-3 py-2 mt-2 border-t border-slate-100 dark:border-slate-800/50 pt-4">
            <div className="size-8 rounded-full bg-slate-300 dark:bg-slate-700 bg-cover bg-center" style={{ backgroundImage: `url(${currentUser?.avatar || 'https://picsum.photos/seed/user/100/100'})` }}></div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-bold truncate">{currentUser?.name || 'Carregando...'}</p>
              <p className="text-[10px] text-slate-500 uppercase">{currentUser?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark/50 flex flex-col">
         <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold">Painel ERP</h2>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="relative">
              <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-semibold border border-transparent hover:border-primary transition-all uppercase text-[11px] tracking-tight">
                <span className="material-symbols-outlined text-primary text-lg">apartment</span>
                {currentUser?.storeId === 'matriz' ? 'Loja Matriz' : 'Filial Ativa'}
                <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white dark:border-background-dark rounded-full"></span>
            </button>
            <div className="size-9 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-700" style={{ backgroundImage: `url(${currentUser?.avatar || 'https://picsum.photos/seed/avatar/100/100'})` }}></div>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 flex flex-col items-center text-center gap-6">
              <div className="size-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                 <span className="material-symbols-outlined text-4xl">logout</span>
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Deseja Sair?</h3>
                 <p className="text-sm text-slate-500 mt-2">Você precisará de suas credenciais para acessar o sistema novamente.</p>
              </div>
              <div className="flex gap-3 w-full">
                 <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                   Cancelar
                 </button>
                 <button 
                  onClick={handleLogout}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
                 >
                   Sim, Sair
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        isActive
          ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20'
          : 'text-slate-600 dark:text-[#9da8b9] hover:bg-slate-100 dark:hover:bg-slate-800'
      }`
    }
  >
    <span className={`material-symbols-outlined ${icon === 'payments' ? 'fill-1' : ''}`}>{icon}</span>
    <p className="text-sm">{label}</p>
  </NavLink>
);

export default Layout;
