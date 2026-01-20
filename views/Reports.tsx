
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, Product, Customer, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Reports: React.FC = () => {
  const { transactions, customers, users, products } = useApp();
  const [period, setPeriod] = useState(30); // Dias

  const today = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(today.getDate() - period);

  // Filtrar transações de venda no período
  const periodSales = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return t.type === 'INCOME' && t.category === 'Venda' && tDate >= cutoffDate;
    });
  }, [transactions, period]);

  // 1. Itens mais vendidos (Ranking)
  const mostSoldItems = useMemo(() => {
    const counts: Record<string, { product: Product; qty: number; revenue: number }> = {};
    
    periodSales.forEach(t => {
      t.items?.forEach(item => {
        if (!counts[item.id]) {
          counts[item.id] = { product: item, qty: 0, revenue: 0 };
        }
        counts[item.id].qty += item.quantity;
        counts[item.id].revenue += item.quantity * item.salePrice;
      });
    });

    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [periodSales]);

  // 2. Clientes que compraram no período
  const customersInPeriod = useMemo(() => {
    const clientIds = new Set(periodSales.filter(t => t.clientId).map(t => t.clientId));
    return customers.filter(c => clientIds.has(c.id));
  }, [periodSales, customers]);

  // 3. Ticket Médio por Vendedor
  const vendorPerformance = useMemo(() => {
    const stats: Record<string, { name: string; avatar?: string; totalValue: number; count: number }> = {};
    
    // Inicializa com todos os vendedores para mostrar mesmo os que não venderam
    users.filter(u => u.role !== UserRole.ADMIN).forEach(u => {
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
    })).sort((a, b) => b.average - a.average);
  }, [periodSales, users]);

  // 4. Clientes inativos há mais de 2 meses (60 dias)
  const inactiveCustomers = useMemo(() => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    return customers.filter(c => {
      const lastPurchase = transactions
        .filter(t => t.clientId === c.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (!lastPurchase) return true; // Nunca comprou é considerado inativo aqui
      return new Date(lastPurchase.date) < sixtyDaysAgo;
    });
  }, [customers, transactions]);

  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAverageTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Inteligência de Vendas</h2>
          <p className="text-slate-500 text-sm mt-1">Análise detalhada de performance, produtos e retenção de clientes.</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
           {[7, 30, 60, 90].map(d => (
             <button 
               key={d} 
               onClick={() => setPeriod(d)}
               className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${period === d ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
             >
               {d} DIAS
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportKPICard title="Ticket Médio Geral" value={`R$ ${globalAverageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
        <ReportKPICard title="Clientes Ativos" value={customersInPeriod.length.toString()} icon="person_check" color="text-emerald-500" />
        <ReportKPICard title="Clientes Inativos" value={inactiveCustomers.length.toString()} icon="person_off" color="text-rose-500" />
        <ReportKPICard title="Faturamento Total" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RANKING PRODUTOS */}
        <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                 <span className="material-symbols-outlined text-amber-500">trophy</span>
                 Produtos Estrela
              </h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mais vendidos no período</span>
           </div>
           
           <div className="space-y-4">
              {mostSoldItems.length > 0 ? mostSoldItems.map((item, idx) => (
                <div key={item.product.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-slate-200 transition-all group">
                   <div className="relative">
                      <div className="size-16 rounded-2xl overflow-hidden shadow-md">
                         <img src={item.product.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -top-2 -left-2 size-6 bg-slate-900 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                         {idx + 1}
                      </div>
                   </div>
                   <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 dark:text-white uppercase truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.product.category}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-black text-primary">{item.qty} un.</p>
                      <p className="text-[10px] text-slate-400 font-mono">R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                </div>
              )) : (
                <div className="h-60 flex flex-col items-center justify-center text-slate-300 italic uppercase font-black tracking-widest">
                   Sem dados suficientes
                </div>
              )}
           </div>
        </div>

        {/* TICKET MÉDIO VENDEDOR */}
        <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                 <span className="material-symbols-outlined text-primary">badge</span>
                 Performance da Equipe
              </h3>
           </div>
           
           <div className="space-y-6">
              {vendorPerformance.map(vendor => (
                <div key={vendor.name} className="space-y-2">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="size-10 rounded-full bg-slate-200 bg-cover bg-center border border-white" style={{ backgroundImage: `url(${vendor.avatar})` }}></div>
                         <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">{vendor.name}</span>
                      </div>
                      <div className="text-right">
                         <span className="text-xs font-black text-primary tabular-nums">R$ {vendor.average.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[9px] text-slate-400 uppercase ml-1">Ticket Médio</span></span>
                      </div>
                   </div>
                   <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${Math.min((vendor.average / (globalAverageTicket * 1.5)) * 100, 100)}%` }}
                      ></div>
                   </div>
                   <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Volume: {vendor.count} vendas</span>
                      <span>Total: R$ {vendor.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CLIENTES INATIVOS */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                 <span className="material-symbols-outlined text-rose-500">warning</span>
                 Recuperação de Clientes
              </h3>
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Clientes sem compras há mais de 60 dias</p>
           
           <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {inactiveCustomers.length > 0 ? inactiveCustomers.map(c => (
                <div key={c.id} className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center justify-between group hover:bg-rose-500/10 transition-all">
                   <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{c.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{c.phone}</p>
                   </div>
                   <button className="size-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-rose-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">sms</span>
                   </button>
                </div>
              )) : (
                <div className="text-center py-10 opacity-30 uppercase font-black text-xs">Todos os clientes estão ativos!</div>
              )}
           </div>
        </div>

        {/* CLIENTES NO PERÍODO */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                 <span className="material-symbols-outlined text-emerald-500">groups</span>
                 Fidelidade e Ativação
              </h3>
              <span className="text-xs font-black text-slate-400 uppercase">{customersInPeriod.length} Clientes Atendidos</span>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                   <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Cliente</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Última Compra</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Volume Gasto</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                   {customersInPeriod.map(c => {
                     const purchases = transactions.filter(t => t.clientId === c.id);
                     const totalSpent = purchases.reduce((acc, t) => acc + t.value, 0);
                     const lastDate = purchases.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
                     
                     return (
                       <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                          <td className="py-4">
                             <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">{c.name}</p>
                             <p className="text-[10px] text-slate-400">{c.email}</p>
                          </td>
                          <td className="py-4 text-center">
                             <span className="text-xs font-mono font-bold text-slate-500">{lastDate}</span>
                          </td>
                          <td className="py-4 text-right">
                             <span className="text-sm font-black text-emerald-500 tabular-nums">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </td>
                       </tr>
                     );
                   })}
                </tbody>
              </table>
           </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const ReportKPICard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary/50 transition-all">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${color} group-hover:scale-110 transition-transform`}>
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h4 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</h4>
  </div>
);

export default Reports;
