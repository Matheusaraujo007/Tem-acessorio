
import React, { useState } from 'react';
import { MOCK_USERS, MOCK_ESTABLISHMENTS } from '../constants';
import { UserRole, User, Establishment } from '../types';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'general'>('users');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [stores, setStores] = useState<Establishment[]>(MOCK_ESTABLISHMENTS);

  // Estados para Modais
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Estado para Configurações Gerais
  const [generalForm, setGeneralForm] = useState({
    companyName: 'ERP Retail Solutions',
    adminEmail: 'admin@erp-retail.com',
    currency: 'BRL (R$)',
    timezone: 'Brasília (UTC-3)'
  });

  // Estados para Formulários de Unidade e Usuário
  const [storeForm, setStoreForm] = useState<Partial<Establishment>>({
    name: '',
    cnpj: '',
    location: '',
    hasStockAccess: true,
    active: true
  });

  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '',
    email: '',
    role: UserRole.VENDOR,
    storeId: '',
    active: true
  });

  // --- Lógica de Configurações Gerais ---
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação de salvamento
    alert('Configurações gerais atualizadas com sucesso!');
  };

  // --- Lógica de Usuários ---

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUserForm({ name: '', email: '', role: UserRole.VENDOR, storeId: '', active: true });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      active: user.active
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = (id: string) => {
    const confirmDelete = window.confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.');
    if (confirmDelete) {
      setUsers(currentUsers => currentUsers.filter(u => u.id !== id));
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...userForm as User } : u));
    } else {
      const user: User = {
        ...userForm as User,
        id: `u-${Date.now()}`,
        avatar: `https://picsum.photos/seed/${Date.now()}/100/100`
      };
      setUsers(prev => [...prev, user]);
    }
    setShowUserModal(false);
  };

  // --- Lógica de Estabelecimentos ---

  const toggleStoreStock = (id: string) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, hasStockAccess: !s.hasStockAccess } : s));
  };

  const toggleStoreStatus = (id: string) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const handleOpenEditStore = (store: Establishment) => {
    setEditingStoreId(store.id);
    setStoreForm({
      name: store.name,
      cnpj: store.cnpj,
      location: store.location,
      hasStockAccess: store.hasStockAccess,
      active: store.active
    });
    setShowStoreModal(true);
  };

  const handleOpenCreateStore = () => {
    setEditingStoreId(null);
    setStoreForm({
      name: '',
      cnpj: '',
      location: '',
      hasStockAccess: true,
      active: true
    });
    setShowStoreModal(true);
  };

  const handleDeleteStore = (id: string) => {
    const confirmDelete = window.confirm('Tem certeza que deseja remover esta unidade? Usuários vinculados a ela ficarão sem loja atribuída.');
    if (confirmDelete) {
      setStores(currentStores => currentStores.filter(s => s.id !== id));
      setUsers(currentUsers => currentUsers.map(u => u.storeId === id ? { ...u, storeId: '' } : u));
    }
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStoreId) {
      setStores(prev => prev.map(s => s.id === editingStoreId ? { ...s, ...storeForm as Establishment } : s));
    } else {
      const store: Establishment = {
        ...storeForm as Establishment,
        id: `est-${Date.now()}`,
      };
      setStores(prev => [...prev, store]);
    }
    setShowStoreModal(false);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Configurações do Sistema</h1>
        <p className="text-slate-500 text-sm">Administração de usuários, permissões e unidades de negócio.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="group" label="Usuários e Vendedores" />
        <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon="apartment" label="Estabelecimentos" />
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon="settings_suggest" label="Geral" />
      </div>

      <div className="mt-6">
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Gerenciar Acessos</h3>
              <button 
                onClick={handleOpenCreateUser}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined">person_add</span>
                Novo Usuário
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usuário</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nível</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Loja</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar} className="size-9 rounded-full bg-slate-200" alt={user.name} />
                            <div>
                              <p className="text-sm font-bold">{user.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                            user.role === UserRole.ADMIN ? 'bg-purple-500/10 text-purple-500' :
                            user.role === UserRole.MANAGER ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {stores.find(s => s.id === user.storeId)?.name || 'Geral'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => toggleUserStatus(user.id)}
                            className={`size-10 rounded-full inline-flex items-center justify-center transition-all ${
                              user.active ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                            }`}
                            title={user.active ? 'Ativo - Clique para inativar' : 'Inativo - Clique para ativar'}
                          >
                            <span className="material-symbols-outlined">{user.active ? 'check_circle' : 'cancel'}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleOpenEditUser(user)}
                              className="p-2 text-slate-400 hover:text-primary transition-colors"
                              title="Editar usuário"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              title="Excluir usuário"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stores' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Unidades de Negócio</h3>
              <button 
                onClick={handleOpenCreateStore}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined">add_business</span>
                Nova Unidade
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stores.map(store => (
                <div key={store.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col gap-4 shadow-sm hover:border-primary transition-all group relative">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className={`size-12 rounded-lg flex items-center justify-center transition-all ${
                        store.active ? 'bg-slate-100 dark:bg-slate-800 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <span className="material-symbols-outlined text-3xl">store</span>
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg leading-none ${!store.active && 'text-slate-500'}`}>{store.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{store.location}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          store.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {store.active ? 'Ativa' : 'Inativa'}
                        </span>
                        <button 
                          onClick={() => toggleStoreStatus(store.id)}
                          className={`text-[10px] font-bold underline transition-colors ${
                            store.active ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-500 hover:text-emerald-700'
                          }`}
                        >
                          {store.active ? 'Inativar' : 'Ativar Agora'}
                        </button>
                    </div>
                  </div>
                  
                  <div className={`pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 ${!store.active && 'opacity-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Acesso ao Estoque</p>
                        <p className="text-[10px] text-slate-500">Permitir movimentações e visualização de itens.</p>
                      </div>
                      <button 
                        onClick={() => toggleStoreStock(store.id)}
                        disabled={!store.active}
                        className={`w-12 h-6 rounded-full relative transition-all ${
                          store.hasStockAccess ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                        } ${!store.active && 'cursor-not-allowed opacity-50'}`}
                      >
                        <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${store.hasStockAccess ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">CNPJ</p>
                          <p className="text-sm font-mono mt-0.5 truncate">{store.cnpj}</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Colaboradores</p>
                          <p className="text-sm font-bold mt-0.5">{users.filter(u => u.storeId === store.id).length} ativos</p>
                       </div>
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button 
                      onClick={() => handleOpenEditStore(store)}
                      className="flex-1 py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg border border-primary/20 transition-all active:scale-[0.98]"
                    >
                      Configurar Unidade
                    </button>
                    <button 
                      onClick={() => handleDeleteStore(store.id)}
                      className="px-3 py-2 text-sm font-bold text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
                      title="Excluir unidade"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="material-symbols-outlined text-primary">domain</span>
              <h3 className="text-lg font-bold">Dados da Empresa Master</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label="Nome Fantasia" 
                value={generalForm.companyName} 
                onChange={(e) => setGeneralForm({...generalForm, companyName: e.target.value})}
              />
              <InputField 
                label="E-mail Administrativo" 
                value={generalForm.adminEmail} 
                onChange={(e) => setGeneralForm({...generalForm, adminEmail: e.target.value})}
              />
              <InputField 
                label="Moeda do Sistema" 
                value={generalForm.currency} 
                onChange={(e) => setGeneralForm({...generalForm, currency: e.target.value})}
              />
              <InputField 
                label="Fuso Horário" 
                value={generalForm.timezone} 
                onChange={(e) => setGeneralForm({...generalForm, timezone: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                className="px-6 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={() => setGeneralForm({
                  companyName: 'ERP Retail Solutions',
                  adminEmail: 'admin@erp-retail.com',
                  currency: 'BRL (R$)',
                  timezone: 'Brasília (UTC-3)'
                })}
              >
                Resetar
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 rounded-lg text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all active:scale-95"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal Nova/Editar Unidade */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingStoreId ? 'Configurar Unidade' : 'Nova Unidade'}</h3>
              <button onClick={() => setShowStoreModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveStore} className="p-6 space-y-4">
              <InputField 
                label="Nome da Loja" 
                value={storeForm.name || ''} 
                onChange={(e) => setStoreForm({...storeForm, name: e.target.value})}
                required 
              />
              <InputField 
                label="CNPJ" 
                value={storeForm.cnpj || ''} 
                onChange={(e) => setStoreForm({...storeForm, cnpj: e.target.value})}
                required 
              />
              <InputField 
                label="Localização (Cidade/UF)" 
                value={storeForm.location || ''} 
                onChange={(e) => setStoreForm({...storeForm, location: e.target.value})}
                required 
              />
              
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Acesso ao Estoque</p>
                    <p className="text-[10px] text-slate-400">Habilitar controle de inventário</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setStoreForm({...storeForm, hasStockAccess: !storeForm.hasStockAccess})}
                    className={`w-10 h-5 rounded-full relative transition-all ${
                      storeForm.hasStockAccess ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${storeForm.hasStockAccess ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Status da Unidade</p>
                    <p className="text-[10px] text-slate-400">Ativa ou Inativa no sistema</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setStoreForm({...storeForm, active: !storeForm.active})}
                    className={`w-10 h-5 rounded-full relative transition-all ${
                      storeForm.active ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  >
                    <div className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${storeForm.active ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
                >
                  {editingStoreId ? 'Salvar Alterações' : 'Criar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingUserId ? 'Editar Usuário' : 'Novo Usuário / Vendedor'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <InputField 
                label="Nome Completo" 
                value={userForm.name || ''} 
                onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                required 
              />
              <InputField 
                label="E-mail de Acesso" 
                value={userForm.email || ''} 
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                type="email"
                required 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Nível de Acesso</label>
                  <select 
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value as UserRole})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-primary text-slate-900 dark:text-white"
                  >
                    <option value={UserRole.VENDOR}>Vendedor</option>
                    <option value={UserRole.MANAGER}>Gerente</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Vincular Loja</label>
                  <select 
                    value={userForm.storeId}
                    onChange={(e) => setUserForm({...userForm, storeId: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-primary text-slate-900 dark:text-white"
                  >
                    <option value="">Nenhuma (Geral)</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all hover:bg-blue-600"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Salvar Usuário'}
                </button>
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
    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
      active ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
    }`}
  >
    <span className="material-symbols-outlined">{icon}</span>
    <span className="text-sm">{label}</span>
  </button>
);

const InputField: React.FC<{ 
  label: string; 
  value: string; 
  disabled?: boolean; 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
}> = ({ label, value, disabled, onChange, required, type = 'text' }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">{label}</label>
    <input 
      type={type}
      value={value} 
      onChange={onChange}
      disabled={disabled}
      required={required}
      className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-primary disabled:opacity-50 transition-all focus:border-primary outline-none text-slate-900 dark:text-white" 
    />
  </div>
);

export default Settings;
