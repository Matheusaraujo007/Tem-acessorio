
import React, { useMemo } from 'react';
import { useApp } from '../AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const Dashboard: React.FC = () => {
  const { transactions, products } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const salesToday = useMemo(() => {
    return transactions
      .filter(t => t.date === today && t.type === 'INCOME')
      .reduce((acc, t) => acc + t.value, 0);
  }, [transactions, today]);

  const criticalStockCount = useMemo(() => {
    return products.filter(p => p.stock <= 5).length;
  }, [products]);

  const netProfit = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.value, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.value, 0);
    return income - expense;
  }, [transactions]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Performance Operacional</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Dados atualizados em tempo real através da integração PDV/Estoque.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Vendas Hoje" value={`R$ ${salesToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend="Real" icon="monitoring" color="#136dec" />
        <KPICard title="Resultado Período" value={`R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend="Consolidado" icon="account_balance" color="#10b981" />
        <KPICard title="Itens Críticos" value={`${criticalStockCount} produtos`} trend="Alerta de Reposição" icon="inventory_2" color="#f59e0b" />
        <KPICard title="Movimentações" value={`${transactions.length} transações`} trend="Histórico" icon="history" color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h4 className="text-lg font-black">Histórico de Receitas</h4>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Últimos Lançamentos</p>
              </div>
              <span className="material-symbols-outlined text-slate-300">more_horiz</span>
           </div>
           <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transactions.slice(0, 6).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#136dec">
                    {transactions.slice(0, 6).map((_, index) => <Cell key={index} fillOpacity={1 - (index * 0.1)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h4 className="text-lg font-black mb-1">Status do Catálogo</h4>
          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-10">Saúde do Inventário</p>
          
          <div className="flex-1 flex flex-col justify-center gap-6">
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase">
                   <span className="text-emerald-500">Estoque Saudável</span>
                   <span>{products.filter(p => p.stock > 10).length} itens</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full" style={{ width: `${(products.filter(p => p.stock > 10).length / products.length) * 100}%` }}></div>
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase">
                   <span className="text-amber-500">Nível Crítico</span>
                   <span>{products.filter(p => p.stock > 0 && p.stock <= 10).length} itens</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                   <div className="bg-amber-500 h-full" style={{ width: `${(products.filter(p => p.stock > 0 && p.stock <= 10).length / products.length) * 100}%` }}></div>
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase">
                   <span className="text-rose-500">Esgotado</span>
                   <span>{products.filter(p => p.stock === 0).length} itens</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                   <div className="bg-rose-500 h-full" style={{ width: `${(products.filter(p => p.stock === 0).length / products.length) * 100}%` }}></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ title: string; value: string; trend: string; icon: string; color: string }> = ({ title, value, trend, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-all">
    <div className="flex justify-between items-start mb-6">
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">{trend}</span>
    </div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
    <h4 className="text-2xl font-black tabular-nums">{value}</h4>
    <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12 group-hover:opacity-[0.05] transition-opacity">
       <span className="material-symbols-outlined text-8xl" style={{ color: color }}>{icon}</span>
    </div>
  </div>
);

export default Dashboard;
