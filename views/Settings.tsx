
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
    name: '', email: '', password: '', role: UserRole.VENDOR, storeId: currentUser?.storeId || '', active: true, commissionActive: false, commissionRate: 0
  });
  
  const [storeForm, setStoreForm] = useState<Partial<Establishment>>({
    name: '', cnpj: '', location: '', hasStockAccess: true, active: true
  });

  useEffect(() => {
    setLocalConfig(systemConfig);
  }, [systemConfig]);

  const filteredUsers = users.filter(u => isAdmin || u.storeId === currentUser?.storeId);
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
    setUserForm({ name: '', email: '', password: '', role: UserRole.VENDOR, storeId: currentUser?.storeId || '', active: true, commissionActive: false, commissionRate: 0 });
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
                 <button onClick={() => { setUserForm({ name: '', email: '', password: '', role: UserRole.VENDOR, storeId: currentUser?.storeId || '', active: true, commissionActive: false, commissionRate: 0 }); setShowUserModal(true); }} className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                    <span className="material-symbols-outlined">person_add</span> Novo Acesso
                 </button>
              </div>
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                       <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargo / Comissão</th>
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
                                <div className="flex flex-col gap-1">
                                   <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase w-fit">{u.role}</span>
                                   {u.commissionActive && (
                                     <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Comissão: {u.commissionRate}%</span>
                                   )}
                                </div>
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

        {/* Demais abas existentes... */}
      </div>

      {/* MODAL USUARIO ATUALIZADO COM COMISSÃO */}
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
                    <input required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">E-mail Corporativo</label>
                    <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Cargo / Nível</label>
                       <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary">
                          {Object.values(UserRole).filter(r => isAdmin || r !== UserRole.ADMIN).map(role => <option key={role} value={role}>{role}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Senha</label>
                       <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary" placeholder="••••••" />
                    </div>
                 </div>

                 {/* SEÇÃO DE COMISSÃO */}
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-emerald-500">payments</span>
                          <span className="text-xs font-black uppercase tracking-widest">Pagar Comissão?</span>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={userForm.commissionActive}
                            onChange={e => setUserForm({...userForm, commissionActive: e.target.checked})}
                            className="sr-only peer" 
                          />
                          <div className="w-12 h-7 bg-slate-300 peer-checked:bg-emerald-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                       </label>
                    </div>
                    {userForm.commissionActive && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-4">Porcentagem da Comissão (%)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={userForm.commissionRate}
                          onChange={e => setUserForm({...userForm, commissionRate: parseFloat(e.target.value)})}
                          className="w-full h-14 bg-white dark:bg-slate-900 rounded-xl px-6 text-lg font-black text-emerald-500 border-none outline-none focus:ring-2 focus:ring-emerald-500" 
                        />
                      </div>
                    )}
                 </div>

                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl mt-4">Confirmar Registro</button>
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
