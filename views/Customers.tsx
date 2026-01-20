
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Customer } from '../types';

const Customers: React.FC = () => {
  const { customers, addCustomer } = useApp();
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(filter.toLowerCase()) || 
      c.email.toLowerCase().includes(filter.toLowerCase()) ||
      c.phone.includes(filter)
    );
  }, [customers, filter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      ...newCustomer,
      id: `c-${Date.now()}`
    });
    setShowModal(false);
    setNewCustomer({ name: '', email: '', phone: '', birthDate: '' });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Base de Clientes</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie o relacionamento e fidelização do seu público.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">person_add</span>
          CADASTRAR NOVO
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Clientes</p>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">{customers.length}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aniversariantes do Mês</p>
          <h4 className="text-3xl font-black text-emerald-500">
            {customers.filter(c => c.birthDate.split('-')[1] === (new Date().getMonth() + 1).toString().padStart(2, '0')).length}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Novos (30 dias)</p>
          <h4 className="text-3xl font-black text-primary">--</h4>
        </div>
      </div>

      {/* Busca e Tabela */}
      <div className="space-y-4">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Pesquisar por nome, e-mail ou telefone..."
            className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">WhatsApp / Celular</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data de Nascimento</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                    {c.phone}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase">
                      {new Date(c.birthDate).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-primary text-white">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">person_add</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">Novo Cliente</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="size-12 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Nome Completo</label>
                <input required autoFocus value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">WhatsApp</label>
                  <input required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold outline-none" placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Aniversário</label>
                  <input required type="date" value={newCustomer.birthDate} onChange={e => setNewCustomer({...newCustomer, birthDate: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">E-mail</label>
                <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold outline-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-colors uppercase text-xs tracking-widest">Descartar</button>
                <button type="submit" className="flex-[2] h-16 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all uppercase text-xs tracking-widest">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
