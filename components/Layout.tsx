
import React, { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isPDV = location.pathname === '/pdv';
  
  // Estados de menus expansíveis
  const [isStockOpen, setIsStockOpen] = useState(location.pathname.includes('estoque') || location.pathname.includes('balanco'));
  const [isVendasOpen, setIsVendasOpen] = useState(location.pathname.includes('pdv') || location.pathname.includes('clientes'));

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
            <SidebarItem to="/dre" icon="payments" label="Financeiro (DRE)" />
            <SidebarItem to="/config" icon="settings" label="Configurações" />
          </nav>
        </div>
        <div className="flex flex-col gap-1 pt-4 border-t border-slate-200 dark:border-slate-800">
          <a className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-[#9da8b9] hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined">chat_bubble</span>
            <p className="text-sm font-medium">Suporte</p>
          </a>
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <div className="size-8 rounded-full bg-slate-300 dark:bg-slate-700 bg-cover bg-center" style={{ backgroundImage: `url('https://picsum.photos/seed/user/100/100')` }}></div>
            <div className="flex flex-col">
              <p className="text-xs font-bold truncate w-24">Carlos Silva</p>
              <p className="text-[10px] text-slate-500">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark/50 flex flex-col">
         {/* Top Header */}
         <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold">Painel ERP</h2>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="relative">
              <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-semibold border border-transparent hover:border-primary transition-all">
                <span className="material-symbols-outlined text-primary text-lg">apartment</span>
                Loja Matriz
                <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white dark:border-background-dark rounded-full"></span>
            </button>
            <div className="size-9 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-700" style={{ backgroundImage: `url('https://picsum.photos/seed/avatar/100/100')` }}></div>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
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
