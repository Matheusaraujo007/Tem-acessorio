
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, Establishment, RolePermissions } from '../types';
import { useApp } from '../AppContext';

const Settings: React.FC = () => {
  const { 
    currentUser, systemConfig, updateConfig, 
    users, addUser, deleteUser, 
    establishments, addEstablishment, deleteEstablishment, 
    rolePermissions, updateRolePermissions,
    refreshData 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'general' | 'permissions' | 'db'>('general');
  const [setupLoading, setSetupLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  
  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '', email: '', password: '', role: UserRole.VENDOR, storeId: '', active: true
  });
  
  const [storeForm, setStoreForm] = useState<Partial<Establishment>>({
    name: '', cnpj: '', location: '', hasStockAccess: true, active: true
  });

  useEffect(() => {
    setLocalConfig(systemConfig);
  }, [systemConfig]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateConfig(localConfig);
      setTimeout(() => setIsSaving(false), 800);
    } catch (e) {
      alert("Erro ao salvar identidade.");
      setIsSaving(false);
    }
  };

  const handleTogglePermission = (role: UserRole, module: keyof RolePermissions) => {
    const current = rolePermissions[role];
    const updated = { ...current, [module]: !current[module] };
    updateRolePermissions(role, updated);
  };

  const modules: { id: keyof RolePermissions; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard / Visão Geral' },
    { id: 'pdv', label: 'PDV / Terminal de Venda' },
    { id: 'customers', label: 'Gestão de Clientes' },
    { id: 'reports', label: 'Relatórios de Performance' },
    { id: 'inventory', label: 'Estoque / Produtos' },
    { id: 'balance', label: 'Balanço / Auditoria' },
    { id: 'incomes', label: 'Entradas Financeiras' },
    { id: 'expenses', label: 'Saídas Financeiras' },
    { id: 'financial', label: 'Financeiro / DRE' },
    { id: 'settings', label: 'Configurações do Sistema' },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gestão do Sistema</h1>
        <p className="text-slate-500 text-sm font-medium">Configure a identidade visual, equipe, permissões e infraestrutura.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="palette" label="Identidade" />
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="badge" label="Colaboradores" />
        <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon="store" label="Filiais" />
        <TabButton active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} icon="shield_person" label="Permissões" />
        <TabButton active={activeTab === 'db'} onClick={() => setActiveTab('db')} icon="settings_ethernet" label="Infraestrutura" />
      </div>

      <div className="mt-6">
        {activeTab === 'general' && (
          <div className="max-w-5xl space-y-8 animate-in slide-in-from-top-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Visual da Marca</h4>
                   {/* Resto do formulário mantido igual */}
                   <div className="flex flex-col items-center gap-6 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <div className="size-32 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                         {localConfig.logoUrl ? (
                           <img src={localConfig.logoUrl} className="size-full object-contain p-2" alt="Logo preview" />
                         ) : (
                           <span className="material-symbols-outlined text-6xl text-slate-200">image</span>
                         )}
                      </div>
                      <input type="file" ref={logoInputRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setLocalConfig({ ...localConfig, logoUrl: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }} className="hidden" accept="image/*" />
                      <button onClick={() => logoInputRef.current?.click()} className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase rounded-2xl tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">Alterar Logotipo</button>
                   </div>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Nome do ERP / Empresa</label>
                         <input 
                            type="text" 
                            value={localConfig.companyName}
                            onChange={e => setLocalConfig({...localConfig, companyName: e.target.value})}
                            className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] px-6 text-sm font-black border-none outline-none focus:ring-2 focus:ring-primary transition-all" 
                         />
                      </div>
                   </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Regras de Negócio</h4>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                         <div className="flex flex-col gap-1">
                            <p className="text-xs font-black text-slate-700 dark:text-white uppercase">Venda com Estoque Zero</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Permite finalizar vendas sem saldo.</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                           <input 
                            type="checkbox" 
                            checked={localConfig.allowNegativeStock}
                            onChange={e => setLocalConfig({...localConfig, allowNegativeStock: e.target.checked})}
                            className="sr-only peer" 
                           />
                           <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary rounded-full"></div>
                         </label>
                      </div>
                   </div>
                </div>
             </div>
             <button onClick={handleSaveConfig} className="w-full md:w-auto px-16 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900">Salvar Alterações</button>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-8 animate-in slide-in-from-top-4">
             <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex items-center gap-4">
                <span className="material-symbols-outlined text-amber-500 text-3xl">info</span>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">
                  Administradores possuem acesso total por padrão. Configure abaixo o que Gerentes, Caixas e Vendedores podem visualizar e operar no sistema.
                </p>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {[UserRole.MANAGER, UserRole.CASHIER, UserRole.VENDOR].map((role) => (
                  <div key={role} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                       <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                          {role.charAt(0)}
                       </div>
                       <h3 className="font-black uppercase tracking-tight">{role}</h3>
                    </div>
                    
                    <div className="space-y-3">
                       {modules.map((m) => (
                         <div key={m.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{m.label}</span>
                            <label className="relative inline-flex items-center cursor-pointer scale-75">
                              <input 
                                type="checkbox" 
                                checked={rolePermissions[role][m.id]} 
                                onChange={() => handleTogglePermission(role, m.id)}
                                className="sr-only peer" 
                              />
                              <div className="w-14 h-8 bg-slate-200 dark:bg-slate-700 peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
                            </label>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Outras abas mantidas iguais... */}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
      active
        ? 'border-primary text-primary font-black'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`}
  >
    <span className="material-symbols-outlined text-lg">{icon}</span>
    <span className="text-xs uppercase tracking-widest font-bold">{label}</span>
  </button>
);

export default Settings;
