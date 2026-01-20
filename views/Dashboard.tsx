
import React, { useMemo } from 'react';
import { useApp } from '../AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { transactions, products, currentUser, establishments } = useApp();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStoreName = establishments.find(e => e.id === currentUser?.storeId)?.name || 'Principal';

  const today = new Date().toISOString().split('T')[0];
  
  // RESTRIÇÃO POR UNIDADE: Filtra as transações e o estoque por loja
  const salesToday = useMemo(() => {
    return (transactions || [])
      .filter(t => t.date === today && t.type === 'INCOME' && (isAdmin || t.store === currentStoreName))
      .reduce((acc, t) => acc + t.value, 0);
  }, [transactions, today, isAdmin, currentStoreName]);

  const criticalStockCount = useMemo(() => {
    return (products || []).filter(p => p.stock <= 5).length;
  }, [products]);

  const netProfit = useMemo(() => {
    const incomes = (transactions || []).filter(t => t.type === 'INCOME' && (isAdmin || t.store === currentStoreName));
    const expenses = (transactions || []).filter(t => t.type === 'EXPENSE' && (isAdmin || t.store === currentStoreName));
    const income = incomes.reduce((acc, t) => acc + t.value, 0);
    const expense = expenses.reduce((acc, t) => acc + t.value, 0);
    return income - expense;
  }, [transactions, isAdmin, currentStoreName]);

  const chartData = useMemo(() => {
    return [...(transactions || [])]
      .filter(t => t.type === 'INCOME' && (isAdmin || t.store === currentStoreName))
      .slice(0, 6)
      .reverse();
  }, [transactions, isAdmin, currentStoreName]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
          Performance {isAdmin ? 'Global' : `Unidade: ${currentStoreName}`}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-tight">Painel de controle em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Vendas Hoje" value={`R$ ${salesToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend="Unidade" icon="monitoring" color="#136dec" />
        <KPICard title="Resultado" value={`R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend="Consolidado" icon="account_balance" color="#10b981" />
        <KPICard title="Itens Críticos" value={`${criticalStockCount} produtos`} trend="Alerta" icon="inventory_2" color="#f59e0b" />
        <KPICard title="Movimentações" value={`${transactions.filter(t => isAdmin || t.store === currentStoreName).length}`} trend="Unidade" icon="history" color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-lg font-black uppercase">Receitas Recentes</h4>
              <span className="material-symbols-outlined text-slate-300">more_horiz</span>
           </div>
           <div className="h-72 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#136dec">
                      {chartData.map((_, index) => <Cell key={index} fillOpacity={1 - (index * 0.1)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">Aguardando Lançamentos...</div>
              )}
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h4 className="text-lg font-black uppercase mb-10">Saúde do Estoque</h4>
          <div className="flex-1 flex flex-col justify-center gap-6">
             <InventoryBar label="Estoque OK" color="bg-emerald-500" count={products.filter(p => p.stock > 10).length} total={products.length} />
             <InventoryBar label="Nível Baixo" color="bg-amber-500" count={products.filter(p => p.stock > 0 && p.stock <= 10).length} total={products.length} />
             <InventoryBar label="Esgotado" color="bg-rose-500" count={products.filter(p => p.stock === 0).length} total={products.length} />
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ title: string; value: string; trend: string; icon: string; color: string }> = ({ title, value, trend, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-all">
    <div className="flex justify-between items-start mb-6">
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all"><span className="material-symbols-outlined text-2xl">{icon}</span></div>
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">{trend}</span>
    </div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
    <h4 className="text-2xl font-black tabular-nums">{value}</h4>
  </div>
);

const InventoryBar: React.FC<{ label: string; color: string; count: number; total: number }> = ({ label, color, count, total }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs font-bold uppercase"><span>{label}</span><span>{count} itens</span></div>
    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
      <div className={`${color} h-full transition-all duration-1000`} style={{ width: `${(count / Math.max(total, 1)) * 100}%` }}></div>
    </div>
  </div>
);

export default Dashboard;
