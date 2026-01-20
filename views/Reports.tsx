
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, Product, Customer, UserRole } from '../types';

const Reports: React.FC = () => {
  const { transactions, customers, users, currentUser, establishments } = useApp();
  const [period, setPeriod] = useState(30);

  const today = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(today.getDate() - period);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // RESTRIÇÃO POR UNIDADE: Filtra as transações pela loja do usuário (se não for Admin Global)
  const periodSales = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      const isCorrectPeriod = t.type === 'INCOME' && t.category === 'Venda' && tDate >= cutoffDate;
      const isCorrectStore = isAdmin || t.vendorId ? users.find(u => u.id === t.vendorId)?.storeId === currentUser?.storeId : true;
      // Para vendas vindas do PDV, verificamos se a store da transação bate com a store do usuário
      // Nota: No AppContext a transação já é gravada com a store do currentUser.
      const belongsToStore = isAdmin || t.store === establishments.find(e => e.id === currentUser?.storeId)?.name;
      
      return isCorrectPeriod && belongsToStore;
    });
  }, [transactions, period, currentUser, isAdmin, establishments, users]);

  const mostSoldItems = useMemo(() => {
    const counts: Record<string, { product: Product; qty: number; revenue: number }> = {};
    periodSales.forEach(t => {
      t.items?.forEach(item => {
        if (!counts[item.id]) counts[item.id] = { product: item, qty: 0, revenue: 0 };
        counts[item.id].qty += item.quantity;
        counts[item.id].revenue += item.quantity * item.salePrice;
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [periodSales]);

  const customersInPeriod = useMemo(() => {
    const clientIds = new Set(periodSales.filter(t => t.clientId).map(t => t.clientId));
    return customers.filter(c => clientIds.has(c.id));
  }, [periodSales, customers]);

  const vendorPerformance = useMemo(() => {
    const stats: Record<string, { name: string; avatar?: string; totalValue: number; count: number }> = {};
    
    // Mostra apenas vendedores da mesma unidade
    const relevantUsers = users.filter(u => 
      u.role === UserRole.VENDOR && (isAdmin || u.storeId === currentUser?.storeId)
    );

    relevantUsers.forEach(u => {
      stats[u.id] = { name: u.name, avatar: u.avatar, totalValue: 0, count: 0 };
    });

    periodSales.forEach(t => {
      if (t.vendorId && stats[t.vendorId]) {
        stats[t.vendorId].totalValue += t.value;
        stats[t.vendorId].count += 1;
      }
    });

    return Object.values(stats).map(s => ({
      ...s,
      average: s.count > 0 ? s.totalValue / s.count : 0
    })).sort((a, b) => b.totalValue - a.totalValue);
  }, [periodSales, users, currentUser, isAdmin]);

  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAverageTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Inteligência de Vendas</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold">
            {isAdmin ? 'Visão Consolidada Global' : `Unidade: ${establishments.find(e => e.id === currentUser?.storeId)?.name || 'Local'}`}
          </p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
           {[7, 30, 90].map(d => (
             <button key={d} onClick={() => setPeriod(d)} className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${period === d ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{d} DIAS</button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportKPICard title="Ticket Médio Unidade" value={`R$ ${globalAverageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
        <ReportKPICard title="Clientes Atendidos" value={customersInPeriod.length.toString()} icon="person_check" color="text-emerald-500" />
        <ReportKPICard title="Vendas Período" value={periodSales.length.toString()} icon="shopping_bag" color="text-rose-500" />
        <ReportKPICard title="Faturamento Unidade" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3"><span className="material-symbols-outlined text-amber-500">trophy</span> Produtos Estrela</h3>
           </div>
           <div className="space-y-4">
              {mostSoldItems.map((item, idx) => (
                <div key={item.product.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl group">
                   <div className="size-14 rounded-xl overflow-hidden shadow-md"><img src={item.product.image} className="w-full h-full object-cover" /></div>
                   <div className="flex-1">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.product.category}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-black text-primary">{item.qty} un.</p>
                      <p className="text-[9px] text-slate-400 font-mono">R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3"><span className="material-symbols-outlined text-primary">badge</span> Ranking Vendedores</h3>
           </div>
           <div className="space-y-6">
              {vendorPerformance.map(vendor => (
                <div key={vendor.name} className="space-y-2">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="size-10 rounded-full bg-slate-200 border border-white" style={{ backgroundImage: `url(${vendor.avatar})`, backgroundSize: 'cover' }}></div>
                         <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{vendor.name}</span>
                      </div>
                      <div className="text-right"><span className="text-xs font-black text-primary tabular-nums">R$ {vendor.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                   </div>
                   <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.min((vendor.totalValue / (totalRevenue || 1)) * 100, 100)}%` }}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const ReportKPICard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary/50 transition-all">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${color}`}><span className="material-symbols-outlined text-3xl">{icon}</span></div>
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h4 className="text-2xl font-black tabular-nums">{value}</h4>
  </div>
);

export default Reports;
