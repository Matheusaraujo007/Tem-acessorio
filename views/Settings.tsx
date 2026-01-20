
import React, { useState } from 'react';
import { UserRole, User, Establishment } from '../types';
import { useApp } from '../AppContext';

const Settings: React.FC = () => {
  const { currentUser, users, addUser, deleteUser, transferUser, establishments, addEstablishment, deleteEstablishment, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'general' | 'db'>('users');
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Verificação de segurança na View
  const isAuthorized = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  // States para Usuários
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newStoreId, setNewStoreId] = useState('');
  
  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '',
    email: '',
    role: UserRole.VENDOR,
    storeId: '',
    active: true
  });

  // States para Lojas
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeForm, setStoreForm] = useState<Partial<Establishment>>({
    name: '',
    cnpj: '',
    location: '',
    hasStockAccess: true,
    active: true
  });

  if (!isAuthorized) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-background-dark animate-in fade-in duration-500">
         <div className="size-24 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl">lock_person</span>
         </div>
         <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Acesso Restrito</h2>
         <p className="text-slate-500 mt-2 max-w-sm font-medium">Apenas administradores e gerentes podem acessar as configurações globais do sistema.</p>
         <button onClick={() => window.history.back()} className="mt-8 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">Voltar ao Início</button>
      </div>
    );
  }

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

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      ...userForm as User,
      id: userForm.id || `user-${Date.now()}`,
      storeId: userForm.storeId || (establishments[0]?.id || 'matriz')
    };
    await addUser(newUser);
    setShowUserModal(false);
    setUserForm({ name: '', email: '', role: UserRole.VENDOR, storeId: '', active: true });
  };

  const handleTransfer = async () => {
    if (selectedUserId && newStoreId) {
      await transferUser(selectedUserId, newStoreId);
      setShowTransferModal(false);
      setSelectedUserId(null);
      setNewStoreId('');
      alert("Funcionário transferido com sucesso para a nova unidade!");
    }
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

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-600 dark:bg-purple-500/10';
      case UserRole.MANAGER: return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10';
      case UserRole.CASHIER: return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10';
      default: return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10';
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Central de Administração</h1>
        <p className="text-slate-500 text-sm">Controle mestre de estabelecimentos, equipe e regras corporativas.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="group" label="Colaboradores" />
        <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon="apartment" label="Filiais e Unidades" />
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="settings_suggest" label="Regras Globais" />
        <TabButton active={activeTab === 'db'} onClick={() => setActiveTab('db')} icon="database" label="Infra Neon" />
      </div>

      <div className="mt-6">
        {/* ABA USUÁRIOS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Equipe Cadastrada</h3>
              <button 
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Novo Colaborador
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja Atual</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Transferência</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {users.map(u => (
                      <tr key={u.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-primary border border-slate-200 dark:border-slate-700 uppercase">
                              {u.avatar ? <img src={u.avatar} className="size-full rounded-full object-cover" /> : u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{u.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <span className="material-symbols-outlined text-slate-300 text-sm">location_on</span>
                             <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">
                                {establishments.find(e => e.id === u.storeId)?.name || 'LOJA MATRIZ'}
                             </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getRoleBadge(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button 
                            onClick={() => { setSelectedUserId(u.id); setShowTransferModal(true); }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all"
                          >
                             Mudar Loja
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ABA ESTABELECIMENTOS */}
        {activeTab === 'stores' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Gestão de Filiais</h3>
                 <button 
                  onClick={() => setShowStoreModal(true)}
                  className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-slate-700 transition-all"
                 >
                    <span className="material-symbols-outlined text-sm">add_business</span>
                    Nova Unidade
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {establishments.map(est => (
                    <div key={est.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm">
                       <div className="flex justify-between items-start mb-6">
                          <div className="size-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                             <span className="material-symbols-outlined text-3xl">store</span>
                          </div>
                          <div className="flex gap-2">
                             <button className="size-10 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-lg">edit</span></button>
                             <button onClick={() => deleteEstablishment(est.id)} className="size-10 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-lg">delete</span></button>
                          </div>
                       </div>
                       <div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">{est.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{est.cnpj || 'CONTA EMPRESARIAL'}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* ABA GERAL */}
        {activeTab === 'general' && (
          <div className="max-w-4xl space-y-8 animate-in slide-in-from-top-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Identidade da Rede</h4>
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-500 uppercase px-2">Nome Comercial do Sistema</label>
                         <input type="text" defaultValue="ERP Retail - Tem Acessório" className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 text-sm font-bold border-none" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-500 uppercase px-2">Regime Tributário Padrão</label>
                         <select className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 text-sm font-bold border-none">
                            <option>Simples Nacional</option>
                            <option>Lucro Presumido</option>
                            <option>Lucro Real</option>
                         </select>
                      </div>
                   </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Políticas de Venda</h4>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                         <div>
                            <p className="text-xs font-black text-slate-700 dark:text-white uppercase">Venda com Estoque Negativo</p>
                            <p className="text-[10px] text-slate-400">Permitir fechar venda sem saldo</p>
                         </div>
                         <input type="checkbox" className="size-6 rounded-lg text-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                         <div>
                            <p className="text-xs font-black text-slate-700 dark:text-white uppercase">Edição de Preço no PDV</p>
                            <p className="text-[10px] text-slate-400">Vendedores podem dar desconto manual</p>
                         </div>
                         <input type="checkbox" defaultChecked className="size-6 rounded-lg text-primary" />
                      </div>
                   </div>
                </div>
             </div>
             
             <button className="px-12 py-5 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 hover:bg-blue-600 transition-all">Salvar Alterações Globais</button>
          </div>
        )}

        {/* ABA DB */}
        {activeTab === 'db' && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 space-y-8 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="size-20 bg-blue-500/10 text-blue-500 rounded-[2rem] flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl">database</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Infra Neon Cloud</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Sincronização global da infraestrutura do ERP.</p>
              </div>
            </div>
            <button 
              disabled={isInitializing}
              onClick={handleInitDB}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isInitializing ? "CONFIGURANDO..." : "SINCRONIZAR INFRAESTRUTURA"}
              <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL TRANSFERÊNCIA DE LOJA */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center space-y-6">
              <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                 <span className="material-symbols-outlined text-4xl">move_up</span>
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Transferir Colaborador</h3>
                 <p className="text-xs text-slate-500 mt-1">Escolha o novo destino para este funcionário.</p>
              </div>
              <select 
                value={newStoreId}
                onChange={e => setNewStoreId(e.target.value)}
                className="w-full h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 text-sm font-black border-none outline-none focus:ring-2 focus:ring-primary"
              >
                 <option value="">SELECIONE A NOVA LOJA</option>
                 {establishments.map(est => (
                    <option key={est.id} value={est.id}>{est.name}</option>
                 ))}
                 <option value="matriz">LOJA MATRIZ</option>
              </select>
              <div className="flex gap-3 pt-4">
                 <button onClick={() => setShowTransferModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Cancelar</button>
                 <button onClick={handleTransfer} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-primary/20">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CADASTRO USUÁRIO (Já atualizado para exigir loja) */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-primary text-white">
                 <div className="flex items-center gap-4">
                    <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">badge</span>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight uppercase">Novo Funcionário</h3>
                 </div>
                 <button onClick={() => setShowUserModal(false)} className="size-12 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              <form onSubmit={handleSaveUser} className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Nome Completo</label>
                    <input autoFocus required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Unidade / Estabelecimento</label>
                    <select required value={userForm.storeId} onChange={e => setUserForm({...userForm, storeId: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                       <option value="">SELECIONE A LOJA</option>
                       {establishments.map(est => (
                          <option key={est.id} value={est.id}>{est.name}</option>
                       ))}
                       <option value="matriz">LOJA MATRIZ</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">E-mail Corporativo</label>
                    <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Cargo / Acesso</label>
                       <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                          <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
                          <option value={UserRole.MANAGER}>GERENTE</option>
                          <option value={UserRole.CASHIER}>CAIXA</option>
                          <option value={UserRole.VENDOR}>VENDEDOR</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Senha Padrão</label>
                       <input type="text" disabled value="123456" className="w-full h-14 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl px-6 text-sm font-bold text-slate-400 outline-none" />
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-colors uppercase text-xs tracking-widest">Descartar</button>
                    <button type="submit" className="flex-[2] h-16 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all uppercase text-xs tracking-widest">Salvar e Liberar Acesso</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* MODAL CADASTRO ESTABELECIMENTO */}
      {showStoreModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-800 text-white">
                  <div className="flex items-center gap-4">
                     <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">add_business</span>
                     </div>
                     <h3 className="text-2xl font-black tracking-tight uppercase">Nova Unidade</h3>
                  </div>
                  <button onClick={() => setShowStoreModal(false)} className="size-12 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-colors">
                     <span className="material-symbols-outlined">close</span>
                  </button>
               </div>
               <form onSubmit={handleSaveStore} className="p-10 space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Nome da Loja / Filial</label>
                     <input autoFocus required value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" placeholder="Ex: Matriz São Paulo" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">CNPJ</label>
                        <input value={storeForm.cnpj} onChange={e => setStoreForm({...storeForm, cnpj: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold outline-none" placeholder="00.000.000/0000-00" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Localidade</label>
                        <input value={storeForm.location} onChange={e => setStoreForm({...storeForm, location: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold outline-none" placeholder="Cidade - UF" />
                     </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">inventory</span>
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">Habilitar Estoque Próprio</span>
                     </div>
                     <input type="checkbox" checked={storeForm.hasStockAccess} onChange={e => setStoreForm({...storeForm, hasStockAccess: e.target.checked})} className="size-6 text-primary rounded-lg border-none focus:ring-0 cursor-pointer" />
                  </div>
                  <div className="flex gap-4 pt-4">
                     <button type="button" onClick={() => setShowStoreModal(false)} className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-colors uppercase text-xs tracking-widest">Descartar</button>
                     <button type="submit" className="flex-[2] h-16 bg-slate-800 text-white font-black rounded-3xl shadow-xl hover:bg-slate-900 transition-all uppercase text-xs tracking-widest">Salvar Unidade</button>
                  </div>
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
    className={`flex items-center gap-3 px-8 py-5 border-b-4 transition-all whitespace-nowrap ${
      active ? 'border-primary text-primary font-black scale-105' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
    }`}
  >
    <span className="material-symbols-outlined text-xl">{icon}</span>
    <span className="text-xs uppercase tracking-widest font-black">{label}</span>
  </button>
);

export default Settings;
