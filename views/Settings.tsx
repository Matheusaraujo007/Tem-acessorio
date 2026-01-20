
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, Establishment } from '../types';
import { useApp } from '../AppContext';

const Settings: React.FC = () => {
  const { currentUser, systemConfig, updateConfig, users, addUser, deleteUser, transferUser, establishments, addEstablishment, deleteEstablishment, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'general' | 'db'>('users');
  const [isInitializing, setIsInitializing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAuthorized = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  // States para Config Geral
  const [localConfig, setLocalConfig] = useState(systemConfig);

  useEffect(() => {
    setLocalConfig(systemConfig);
  }, [systemConfig]);

  // States para Usuários
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '', email: '', password: '', role: UserRole.VENDOR, storeId: 'matriz', active: true
  });

  if (!isAuthorized) return <div className="p-20 text-center uppercase font-black">Acesso Restrito</div>;

  const handleSaveConfig = async () => {
    await updateConfig(localConfig);
    alert("Identidade visual e regras atualizadas!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalConfig({ ...localConfig, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      ...userForm as User,
      id: userForm.id || `user-${Date.now()}`,
      password: userForm.password || '123456'
    };
    await addUser(newUser);
    setShowUserModal(false);
    setUserForm({ name: '', email: '', password: '', role: UserRole.VENDOR, storeId: 'matriz', active: true });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Configurações</h1>
        <p className="text-slate-500 text-sm font-medium">Controle mestre da marca {systemConfig.companyName}.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="auto_awesome" label="Identidade Dinâmica" />
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="group" label="Colaboradores" />
        <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon="apartment" label="Filiais" />
        <TabButton active={activeTab === 'db'} onClick={() => setActiveTab('db')} icon="database" label="Infra Neon" />
      </div>

      <div className="mt-6">
        {activeTab === 'general' && (
          <div className="max-w-4xl space-y-8 animate-in slide-in-from-top-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Identidade do Sistema</h4>
                   
                   <div className="flex flex-col items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200">
                      <div className="size-24 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center overflow-hidden border border-slate-100">
                         {localConfig.logoUrl ? <img src={localConfig.logoUrl} className="size-full object-contain" /> : <span className="material-symbols-outlined text-4xl text-slate-300">image</span>}
                      </div>
                      <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                      <button onClick={() => logoInputRef.current?.click()} className="px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase rounded-xl tracking-widest shadow-lg shadow-primary/20">Alterar Minha Logo</button>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">A logo será atualizada no Sidebar e na Tela de Login.</p>
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Nome Comercial (Título)</label>
                         <input 
                            type="text" 
                            value={localConfig.companyName}
                            onChange={e => setLocalConfig({...localConfig, companyName: e.target.value})}
                            className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 text-sm font-black border-none outline-none focus:ring-2 focus:ring-primary" 
                         />
                      </div>
                   </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Políticas de Venda</h4>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                         <p className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-tight">Estoque Negativo</p>
                         <input 
                          type="checkbox" 
                          checked={localConfig.allowNegativeStock}
                          onChange={e => setLocalConfig({...localConfig, allowNegativeStock: e.target.checked})}
                          className="size-6 text-primary rounded-lg border-none" 
                        />
                      </div>
                   </div>
                </div>
             </div>
             
             <button onClick={handleSaveConfig} className="px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Salvar Tudo e Sincronizar Canais</button>
          </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-black uppercase">Equipe de Colaboradores</h3>
                 <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-sm">person_add</span> Novo Registro
                 </button>
              </div>
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                       <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Nome / E-mail</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Acesso</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {users.map(u => (
                          <tr key={u.id}>
                             <td className="px-8 py-5">
                                <p className="text-sm font-black uppercase">{u.name}</p>
                                <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                             </td>
                             <td className="px-8 py-5">
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase">{u.role}</span>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <button onClick={() => deleteUser(u.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl"><span className="material-symbols-outlined">delete</span></button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
        
        {/* Outras abas (Filiais, DB) permanecem com o estilo das anteriores... */}
      </div>

      {/* MODAL NOVO USUÁRIO COM SENHA EDITÁVEL */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-primary text-white">
                 <h3 className="text-2xl font-black uppercase">Criar Acesso</h3>
                 <button onClick={() => setShowUserModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <form onSubmit={handleSaveUser} className="p-10 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                    <input required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full h-14 bg-slate-50 rounded-2xl px-5 text-sm font-bold border-none" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail de Login</label>
                    <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full h-14 bg-slate-50 rounded-2xl px-5 text-sm font-bold border-none" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</label>
                       <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full h-14 bg-slate-50 rounded-2xl px-4 text-sm font-bold border-none">
                          <option value={UserRole.VENDOR}>Vendedor</option>
                          <option value={UserRole.CASHIER}>Caixa</option>
                          <option value={UserRole.MANAGER}>Gerente</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha de Acesso</label>
                       <input 
                        type="text" 
                        required 
                        value={userForm.password} 
                        onChange={e => setUserForm({...userForm, password: e.target.value})} 
                        className="w-full h-14 bg-amber-50 rounded-2xl px-5 text-sm font-black border-none text-primary" 
                        placeholder="Mínimo 6 chars"
                       />
                    </div>
                 </div>
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl">Cadastrar e Liberar Login</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-8 py-5 border-b-4 transition-all whitespace-nowrap ${active ? 'border-primary text-primary font-black' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
    <span className="material-symbols-outlined">{icon}</span>
    <span className="text-[10px] uppercase tracking-widest font-black">{label}</span>
  </button>
);

export default Settings;
