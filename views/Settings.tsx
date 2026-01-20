
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, Establishment, RolePermissions } from '../types';
import { useApp } from '../AppContext';

const Settings: React.FC = () => {
  const { 
    currentUser, systemConfig, updateConfig, 
    users, addUser, deleteUser, 
    establishments, addEstablishment, deleteEstablishment, 
    rolePermissions, updateRolePermissions 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'general' | 'permissions' | 'db'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '', email: '', password: '', role: UserRole.VENDOR, storeId: currentUser?.storeId || '', active: true
  });
  
  const [storeForm, setStoreForm] = useState<Partial<Establishment>>({
    name: '', cnpj: '', location: '', hasStockAccess: true, active: true
  });

  useEffect(() => {
    setLocalConfig(systemConfig);
  }, [systemConfig]);

  // Filtro de Usuários: Se não for ADMIN, vê apenas quem é da sua unidade
  const filteredUsers = users.filter(u => isAdmin || u.storeId === currentUser?.storeId);
  
  // Filtro de Lojas: Se não for ADMIN, vê apenas a sua própria unidade
  const filteredStores = establishments.filter(e => isAdmin || e.id === currentUser?.storeId);

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
    if (!current) return;
    const updated = { ...current, [module]: !current[module] };
    updateRolePermissions(role, updated);
  };

  const handleEditUser = (u: User) => {
    setUserForm(u);
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.storeId) {
      alert("Selecione uma unidade para este colaborador.");
      return;
    }
    const newUser: User = {
      ...userForm as User,
      id: userForm.id || `user-${Date.now()}`,
      password: userForm.password || '123456',
      active: userForm.active !== undefined ? userForm.active : true
    };
    await addUser(newUser);
    setShowUserModal(false);
    setUserForm({ name: '', email: '', password: '', role: UserRole.VENDOR, storeId: currentUser?.storeId || '', active: true });
  };

  const handleEditStore = (e: Establishment) => {
    setStoreForm(e);
    setShowStoreModal(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const newStore: Establishment = {
      ...storeForm as Establishment,
      id: storeForm.id || `est-${Date.now()}`
    };
    await addEstablishment(newStore);
    setShowStoreModal(false);
    setStoreForm({ name: '', cnpj: '', location: '', hasStockAccess: true, active: true });
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
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gestão Administrativa</h1>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-tight">Configure a equipe e visual da unidade logada.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="palette" label="Identidade" />
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="badge" label="Colaboradores" />
        <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon="store" label="Unidades" />
        {isAdmin && <TabButton active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} icon="shield_person" label="Permissões" />}
        {isAdmin && <TabButton active={activeTab === 'db'} onClick={() => setActiveTab('db')} icon="settings_ethernet" label="Infraestrutura" />}
      </div>

      <div className="mt-6">
        {activeTab === 'general' && (
          <div className="max-w-5xl space-y-8 animate-in slide-in-from-top-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Visual da Marca</h4>
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
                         <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Nome da Empresa</label>
                         <input 
                            type="text" 
                            disabled={!isAdmin}
                            value={localConfig.companyName}
                            onChange={e => setLocalConfig({...localConfig, companyName: e.target.value})}
                            className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] px-6 text-sm font-black border-none outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
                         />
                      </div>
                   </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Regras Operacionais</h4>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                         <div className="flex flex-col gap-1">
                            <p className="text-xs font-black text-slate-700 dark:text-white uppercase">Venda com Estoque Zero</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Permite vendas sem saldo.</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                           <input 
                            type="checkbox" 
                            disabled={!isAdmin}
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
             {isAdmin && (
               <button onClick={handleSaveConfig} className={`w-full md:w-auto px-16 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all ${isSaving ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}>
                 {isSaving ? 'Configuração Salva!' : 'Salvar Identidade Global'}
               </button>
             )}
          </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">
                    Equipe {isAdmin ? 'Global' : 'da Unidade'}
                 </h3>
                 <button onClick={() => { setUserForm({ name: '', email: '', password: '', role: UserRole.VENDOR, storeId: currentUser?.storeId || '', active: true }); setShowUserModal(true); }} className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                    <span className="material-symbols-outlined">person_add</span> Novo Acesso
                 </button>
              </div>
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                       <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargo</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {filteredUsers.map(u => (
                          <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                   <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover shadow-inner" style={{backgroundImage: `url(${u.avatar || 'https://picsum.photos/seed/'+u.id+'/100/100'})`}}></div>
                                   <div>
                                      <p className="text-sm font-black uppercase">{u.name}</p>
                                      <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase">{u.role}</span>
                             </td>
                             <td className="px-10 py-6">
                                <p className="text-xs font-bold text-slate-500 uppercase">
                                   {establishments.find(e => e.id === u.storeId)?.name || 'LOCAL'}
                                </p>
                             </td>
                             <td className="px-10 py-6 text-right">
                                <div className="flex justify-end gap-2">
                                   <button onClick={() => handleEditUser(u)} className="size-10 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-all flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">edit</span></button>
                                   {isAdmin && <button onClick={() => {if(confirm('Excluir este usuário?')) deleteUser(u.id)}} className="size-10 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center"><span className="material-symbols-outlined">delete</span></button>}
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'stores' && (
           <div className="space-y-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">
                    {isAdmin ? 'Gerenciar Unidades' : 'Minha Unidade'}
                 </h3>
                 {isAdmin && <button onClick={() => { setStoreForm({ name: '', cnpj: '', location: '', hasStockAccess: true, active: true }); setShowStoreModal(true); }} className="flex items-center gap-3 bg-emerald-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">
                    <span className="material-symbols-outlined">add_business</span> Nova Filial
                 </button>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredStores.map(e => (
                    <div key={e.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary transition-all relative">
                       <div className="flex justify-between items-start mb-6">
                          <div className="size-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                             <span className="material-symbols-outlined text-3xl">store</span>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                               <button onClick={() => handleEditStore(e)} className="size-10 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-all flex items-center justify-center"><span className="material-symbols-outlined">edit</span></button>
                               <button onClick={() => {if(confirm('Excluir esta unidade?')) deleteEstablishment(e.id)}} className="size-10 bg-rose-500/5 text-rose-300 hover:text-rose-500 rounded-xl transition-all flex items-center justify-center"><span className="material-symbols-outlined">delete</span></button>
                            </div>
                          )}
                       </div>
                       <h4 className="text-lg font-black uppercase mb-1">{e.name}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{e.cnpj || 'Sem CNPJ'}</p>
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {e.location || 'Localização não definida'}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {isAdmin && activeTab === 'permissions' && (
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
                                checked={rolePermissions[role] ? rolePermissions[role][m.id] : false} 
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

        {isAdmin && activeTab === 'db' && (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-200 dark:border-slate-800 text-center space-y-6 animate-in slide-in-from-top-4">
             <div className="size-24 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-5xl">cloud_sync</span>
             </div>
             <h3 className="text-2xl font-black uppercase tracking-tight">Infraestrutura Neon Serverless</h3>
             <p className="max-w-md mx-auto text-slate-500 font-bold text-sm uppercase leading-relaxed">Conectado ao banco de dados relacional Neon.</p>
             <button onClick={() => window.location.reload()} className="px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">Sincronizar Agora</button>
          </div>
        )}
      </div>

      {/* MODAL USUARIO */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-primary text-white">
                 <h3 className="text-2xl font-black uppercase tracking-tight">{userForm.id ? 'Editar Acesso' : 'Novo Acesso'}</h3>
                 <button onClick={() => setShowUserModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <form onSubmit={handleSaveUser} className="p-10 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Nome Completo</label>
                    <input required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">E-mail Corporativo</label>
                    <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Unidade de Atuação</label>
                    <select required disabled={!isAdmin} value={userForm.storeId} onChange={e => setUserForm({...userForm, storeId: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
                       {!isAdmin && <option value={currentUser?.storeId}>{establishments.find(e => e.id === currentUser?.storeId)?.name}</option>}
                       {isAdmin && (
                         <>
                           <option value="">SELECIONE UMA UNIDADE</option>
                           {establishments.map(est => (
                             <option key={est.id} value={est.id}>{est.name}</option>
                           ))}
                         </>
                       )}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Cargo / Nível</label>
                       <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary">
                          {Object.values(UserRole).filter(r => isAdmin || r !== UserRole.ADMIN).map(role => <option key={role} value={role}>{role}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Senha</label>
                       <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary" placeholder="••••••" />
                    </div>
                 </div>

                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl mt-4">Confirmar Registro</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL FILIAL */}
      {showStoreModal && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-500 text-white">
                 <h3 className="text-2xl font-black uppercase tracking-tight">{storeForm.id ? 'Editar Filial' : 'Nova Unidade'}</h3>
                 <button onClick={() => setShowStoreModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <form onSubmit={handleSaveStore} className="p-10 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Nome da Unidade</label>
                    <input required value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">CNPJ</label>
                       <input value={storeForm.cnpj} onChange={e => setStoreForm({...storeForm, cnpj: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500" placeholder="00.000.000/0001-00" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Localização</label>
                       <input value={storeForm.location} onChange={e => setStoreForm({...storeForm, location: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Cidade - UF" />
                    </div>
                 </div>
                 <button type="submit" className="w-full h-16 bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl mt-4">Salvar Unidade</button>
              </form>
           </div>
        </div>
      )}
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
