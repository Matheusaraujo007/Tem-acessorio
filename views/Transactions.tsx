
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, TransactionStatus, Establishment } from '../types';
import { MOCK_ESTABLISHMENTS } from '../constants';

interface TransactionsProps {
  type: 'INCOME' | 'EXPENSE';
}

const Transactions: React.FC<TransactionsProps> = ({ type }) => {
  const { transactions, addTransaction } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<Partial<Transaction>>({
    date: todayStr,
    dueDate: todayStr,
    description: '',
    store: 'Matriz São Paulo',
    category: '',
    status: TransactionStatus.PENDING,
    value: 0,
    method: '',
    client: ''
  });

  const filteredTransactions = transactions.filter(t => t.type === type);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      date: todayStr,
      dueDate: todayStr,
      description: '',
      store: MOCK_ESTABLISHMENTS[0]?.name || 'Geral',
      category: '',
      status: type === 'INCOME' ? TransactionStatus.APPROVED : TransactionStatus.PENDING,
      value: 0,
      method: '',
      client: '',
      type: type
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // No nosso sistema simplificado, o AppContext gerencia o add. 
    // Em um sistema real, teríamos um updateTransaction também.
    addTransaction({
      ...form as Transaction,
      id: editingId || `TRX-${Math.floor(Math.random() * 100000)}`,
      type: type
    });
    setShowModal(false);
  };

  const totalValue = filteredTransactions.reduce((acc, t) => acc + t.value, 0);
  const overdueValue = filteredTransactions
    .filter(t => t.status === TransactionStatus.OVERDUE || (t.status === TransactionStatus.PENDING && t.dueDate && t.dueDate < todayStr))
    .reduce((acc, t) => acc + t.value, 0);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-tight">
            {type === 'INCOME' ? 'Gestão de Entradas' : 'Gestão de Despesas'}
          </h1>
          <p className="text-slate-500 dark:text-[#9da8b9] text-base">
            {type === 'INCOME' ? 'Acompanhe as receitas e aportes do sistema.' : 'Controle pagamentos e custos de estoque.'}
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <span className="material-symbols-outlined">add_circle</span>
          <span>Novo Lançamento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard title="Total Acumulado" value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="#136dec" icon="account_balance_wallet" />
        <SummaryCard title="Vencimentos" value="Ajustado" color="#f59e0b" icon="event_upcoming" />
        <SummaryCard title="Total Pendente" value={`R$ ${overdueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="#f43f5e" icon="error" />
        <SummaryCard title="Saldo Projetado" value="Calculado" color="#10b981" icon="payments" />
      </div>

      <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#1c2027] border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Data</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
                const isLate = t.status === TransactionStatus.PENDING && t.dueDate && t.dueDate < todayStr;
                return (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-5 text-sm text-slate-500">{t.date}</td>
                    <td className={`px-6 py-5 text-sm font-bold ${isLate ? 'text-rose-500' : 'text-slate-500'}`}>
                      {t.dueDate || '--'}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-semibold text-sm">{t.description}</span>
                        <span className="text-slate-400 text-[10px] uppercase">{t.store}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm">{t.category}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                        t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.PAID ? 'bg-emerald-500/10 text-emerald-500' : 
                        t.status === TransactionStatus.PENDING ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {isLate ? 'ATRASADO' : t.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-sm tabular-nums">
                      R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Data Lançamento</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Vencimento</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Descrição</label>
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none font-bold" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value as TransactionStatus})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none">
                    <option value={TransactionStatus.PENDING}>Pendente</option>
                    <option value={TransactionStatus.PAID}>Pago</option>
                    <option value={TransactionStatus.APPROVED}>Aprovado</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl shadow-lg">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: string; color: string; icon: string }> = ({ title, value, color, icon }) => (
  <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col gap-3 shadow-sm transition-all">
    <div className="flex justify-between items-center">
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <span className="material-symbols-outlined" style={{ color: color }}>{icon}</span>
    </div>
    <p className="text-2xl font-black tracking-tight tabular-nums">{value}</p>
  </div>
);

export default Transactions;
