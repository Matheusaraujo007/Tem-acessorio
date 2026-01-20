
import React, { ReactNode, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { UserRole } from '../types';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, systemConfig } = useApp();
  const isPDV = location.pathname === '/pdv';
  
  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  const [isStockOpen, setIsStockOpen] = useState(location.pathname.includes('estoque') || location.pathname.includes('balanco'));
  const [isVendasOpen, setIsVendasOpen] = useState(location.pathname.includes('pdv') || location.pathname.includes('clientes'));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    document.title = `${systemConfig.companyName} | Gestão Integrada`;
  }, [systemConfig.companyName]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isPDV) return <div className="h-screen w-full overflow-hidden">{children}</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col justify-between p-4">
        <div className="flex flex-col gap-8">
          {/* Logo e Nome Dinâmicos */}
          <div className="flex items-center gap-3 px-2">
            {systemConfig.logoUrl ? (
              <img src={systemConfig.logoUrl} className="size-10 rounded-lg object-contain" alt="Logo" />
            ) : (
              <div className="bg-primary rounded-lg size-10 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined">storefront</span>
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <h1 className="text-slate-900 dark:text-white text-sm font-black leading-tight truncate uppercase">{systemConfig.companyName}</h1>
              <p className="text-slate-500 dark:text-[#9da8b9] text-[10px] font-bold uppercase tracking-widest">Painel Gestor</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <SidebarItem to="/" icon="dashboard" label="Dashboard" />
            
            <div className="flex flex-col">
              <button onClick={() => setIsVendasOpen(!isVendasOpen)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-slate-600 dark:text-[#9da8b9] hover:bg-slate-100 dark:hover:bg-slate-800 ${isVendasOpen ? 'text-primary font-black' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">shopping_cart</span>
                  <p className="text-sm">Vendas (PDV)</p>
                </div>
                <span className={`material-symbols-outlined transition-transform text-sm ${isVendasOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {isVendasOpen && (
                <div className="flex flex-col gap-1 pl-9 mt-1">
                  <NavLink to="/pdv" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Ir para Loja</NavLink>
                  <NavLink to="/clientes" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Clientes</NavLink>
                </div>
              )}
            </div>

            <SidebarItem to="/relatorios" icon="analytics" label="Relatórios" />
            
            <div className="flex flex-col">
              <button onClick={() => setIsStockOpen(!isStockOpen)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-slate-600 dark:text-[#9da8b9] hover:bg-slate-100 dark:hover:bg-slate-800 ${isStockOpen ? 'text-primary font-black' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">inventory_2</span>
                  <p className="text-sm">Estoque</p>
                </div>
                <span className={`material-symbols-outlined transition-transform text-sm ${isStockOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {isStockOpen && (
                <div className="flex flex-col gap-1 pl-9 mt-1">
                  <NavLink to="/estoque" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Itens</NavLink>
                  <NavLink to="/balanco" className={({isActive}) => `text-xs py-2 px-3 rounded-lg font-bold transition-all ${isActive ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}>Balanço</NavLink>
                </div>
              )}
            </div>

            <SidebarItem to="/entradas" icon="arrow_circle_down" label="Entradas" />
            <SidebarItem to="/saidas" icon="arrow_circle_up" label="Saídas" />
            
            {isAdminOrManager && (
              <>
                <SidebarItem to="/dre" icon="payments" label="Financeiro" />
                <SidebarItem to="/config" icon="settings" label="Config" />
              </>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-1 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-3 px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all font-bold group">
            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">logout</span>
            <p className="text-xs uppercase tracking-widest font-black">Sair</p>
          </button>

          <div className="flex items-center gap-3 px-3 py-2 mt-2 border-t border-slate-100 dark:border-slate-800/50 pt-4">
            <div className="size-8 rounded-full bg-slate-300 dark:bg-slate-700 bg-cover bg-center border border-slate-200 dark:border-slate-700" style={{ backgroundImage: `url(${currentUser?.avatar || 'https://picsum.photos/seed/user/100/100'})` }}></div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-black truncate">{currentUser?.name}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">{currentUser?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark/50 flex flex-col">
        {children}
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 text-center space-y-6">
              <div className="size-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-4xl">logout</span></div>
              <h3 className="text-xl font-black uppercase tracking-tight">Sair do Sistema?</h3>
              <div className="flex gap-3">
                 <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase">Não</button>
                 <button onClick={handleLogout} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-500/20">Sim, Sair</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => (
  <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-primary text-white font-bold' : 'text-slate-600 dark:text-[#9da8b9] hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
    <span className="material-symbols-outlined">{icon}</span>
    <p className="text-sm">{label}</p>
  </NavLink>
);

export default Layout;
