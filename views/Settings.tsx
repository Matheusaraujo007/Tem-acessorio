
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, Establishment } from '../types';
import { useApp } from '../AppContext';

const Settings: React.FC = () => {
  const { 
    currentUser, systemConfig, updateConfig, 
    users, addUser, deleteUser, 
    establishments, addEstablishment, deleteEstablishment, 
    refreshData 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'general' | 'db'>('general');
  const [setupLoading, setSetupLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // States locais para formulários
  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  
  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '', email: '', password: '', role: UserRole.VENDOR, storeId: 'matriz', active: true
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
      alert("Erro ao salvar.");
      setIsSaving(false);
    }
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

  const handleInitDB = async () => {
    if (!confirm("Isso irá resetar/atualizar as tabelas do banco de dados Neon. Deseja continuar?")) return;
    setSetupLoading(true);
    try {
      const res = await fetch('/api/init-db');
      if (res.ok) {
        alert("Banco de dados sincronizado com sucesso!");
        await refreshData();
      }
    } catch (err) {
      alert("Erro ao conectar com a API Neon.");
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gestão do Sistema</h1>
        <p className="text-slate-500 text-sm font-medium">Configure a identidade visual, equipe e infraestrutura do {systemConfig.companyName}.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="palette" label="Identidade" />
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="badge" label="Colaboradores" />
        <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon="store" label="Filiais" />
        <TabButton active={activeTab === 'db'} onClick={() => setActiveTab('db')} icon="settings_ethernet" label="Infraestrutura" />
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
                      <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                      <button onClick={() => logoInputRef.current?.click()} className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase rounded-2xl tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">Alterar Logotipo</button>
                      <p className="text-[9px] text-slate-400 font-bold uppercase text-center leading-relaxed">Formatos: PNG, JPG ou SVG. <br/> Resolução recomendada: 512x512px.</p>
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

                      <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regime Tributário</p>
                         <select 
                            value={localConfig.taxRegime} 
                            onChange={e => setLocalConfig({...localConfig, taxRegime: e.target.value})}
                            className="w-full h-12 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="Simples Nacional">Simples Nacional</option>
                            <option value="Lucro Presumido">Lucro Presumido</option>
                            <option value="Lucro Real">Lucro Real</option>
                         </select>
                      </div>
                   </div>
                </div>
             </div>
             
             <button 
                onClick={handleSaveConfig} 
                disabled={isSaving}
                className={`w-full md:w-auto px-16 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 ${isSaving ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02]'}`}
              >
                <span className="material-symbols-outlined">{isSaving ? 'done' : 'save'}</span>
                {isSaving ? 'Configurações Atualizadas!' : 'Salvar Alterações de Identidade'}
             </button>
          </div>
        )}

        {/* Outras abas permanecem iguais */}
        {activeTab === 'users' && (
           <div className="space-y-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Equipe Cadastrada</h3>
                 <button onClick={() => setShowUserModal(true)} className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                    <span className="material-symbols-outlined">person_add</span> Novo Usuário
                 </button>
              </div>
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                       <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Acesso / Cargo</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {users.map(u => (
                          <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                   <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover" style={{backgroundImage: `url(${u.avatar || 'https://picsum.photos/seed/'+u.id+'/100/100'})`}}></div>
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
                                <p className="text-xs font-bold text-slate-500 uppercase">{u.storeId}</p>
                             </td>
                             <td className="px-10 py-6 text-right">
                                <button onClick={() => deleteUser(u.id)} className="size-10 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><span className="material-symbols-outlined">delete</span></button>
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
                 <h3 className="text-xl font-black uppercase tracking-tight">Unidades de Negócio</h3>
                 <button onClick={() => setShowStoreModal(true)} className="flex items-center gap-3 bg-emerald-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">
                    <span className="material-symbols-outlined">add_business</span> Nova Filial
                 </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {establishments.map(e => (
                    <div key={e.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary transition-all">
                       <div className="flex justify-between items-start mb-6">
                          <div className="size-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                             <span className="material-symbols-outlined text-3xl">store</span>
                          </div>
                          <button onClick={() => deleteEstablishment(e.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined">delete</span></button>
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

        {activeTab === 'db' && (
           <div className="max-w-3xl space-y-8 animate-in slide-in-from-top-4">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                 <div className="flex items-center gap-6">
                    <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-[1.5rem] flex items-center justify-center">
                       <span className="material-symbols-outlined text-5xl">database</span>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tight">Infraestrutura Neon</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronização Serverless do Banco de Dados</p>
                    </div>
                 </div>

                 <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-6">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                       O sistema utiliza o Neon para persistência de dados. Use o botão abaixo para garantir que todas as tabelas e o administrador mestre estejam configurados corretamente.
                    </p>
                    <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                       <span className="size-3 bg-emerald-500 rounded-full animate-pulse"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest">Status da Conexão: ONLINE</span>
                    </div>
                 </div>

                 <button 
                  onClick={handleInitDB}
                  disabled={setupLoading}
                  className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                 >
                    {setupLoading ? (
                      <span className="material-symbols-outlined animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-outlined">refresh</span>
                    )}
                    {setupLoading ? 'Sincronizando Tabelas...' : 'Forçar Sincronização do Banco'}
                 </button>
              </div>
           </div>
        )}
      </div>

      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-primary text-white">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Novo Acesso</h3>
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
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Cargo / Nível</label>
                       <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary">
                          <option value={UserRole.VENDOR}>Vendedor</option>
                          <option value={UserRole.CASHIER}>Caixa</option>
                          <option value={UserRole.MANAGER}>Gerente</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Senha</label>
                       <input 
                        type="text" 
                        required 
                        value={userForm.password} 
                        onChange={e => setUserForm({...userForm, password: e.target.value})} 
                        className="w-full h-16 bg-amber-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-black border-none text-primary" 
                        placeholder="admin123"
                       />
                    </div>
                 </div>
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">Liberar Acesso Instantâneo</button>
              </form>
           </div>
        </div>
      )}

      {showStoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-500 text-white">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Nova Unidade</h3>
                 <button onClick={() => setShowStoreModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <form onSubmit={handleSaveStore} className="p-10 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Nome da Filial</label>
                    <input required value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Matriz São Paulo" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">CNPJ (Opcional)</label>
                    <input value={storeForm.cnpj} onChange={e => setStoreForm({...storeForm, cnpj: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500" placeholder="00.000.000/0000-00" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Localização / Cidade</label>
                    <input required value={storeForm.location} onChange={e => setStoreForm({...storeForm, location: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500" placeholder="São Paulo - SP" />
                 </div>
                 <button type="submit" className="w-full h-16 bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all">Cadastrar Filial</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-8 py-6 border-b-4 transition-all whitespace-nowrap ${active ? 'border-primary text-primary font-black scale-105' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
    <span className="material-symbols-outlined">{icon}</span>
    <span className="text-[10px] uppercase tracking-widest font-black">{label}</span>
  </button>
);

export default Settings;
