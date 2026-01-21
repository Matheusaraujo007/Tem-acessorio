
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, Product, Customer, UserRole, User } from '../types';

const Reports: React.FC = () => {
  const { transactions, customers, users, currentUser, establishments } = useApp();
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<'sales' | 'commissions' | 'customers'>('sales');

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);
  const currentStoreName = currentStore?.name || '';

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d;
  }, [period]);

  const periodSales = useMemo(() => {
    return (transactions || []).filter(t => {
      const tDate = new Date(t.date);
      const isCorrectPeriod = t.type === 'INCOME' && t.category === 'Venda' && tDate >= cutoffDate;
      const belongsToStore = isAdmin || t.store === currentStoreName;
      return isCorrectPeriod && belongsToStore;
    });
  }, [transactions, cutoffDate, isAdmin, currentStoreName]);

  const vendorStats = useMemo(() => {
    const stats: Record<string, { user: User; totalSales: number; count: number }> = {};
    
    users.filter(u => u.role === UserRole.VENDOR || u.role === UserRole.ADMIN).forEach(u => {
      stats[u.id] = { user: u, totalSales: 0, count: 0 };
    });

    periodSales.forEach(sale => {
      if (sale.vendorId && stats[sale.vendorId]) {
        stats[sale.vendorId].totalSales += sale.value;
        stats[sale.vendorId].count += 1;
      }
    });

    return Object.values(stats)
      .filter(s => s.count > 0)
      .map(s => ({
        ...s,
        avgTicket: s.totalSales / s.count
      }))
      .sort((a, b) => b.avgTicket - a.avgTicket);
  }, [periodSales, users]);

  const inactiveCustomers = useMemo(() => {
    const activeCustomerIds = new Set(periodSales.map(s => s.clientId).filter(id => id));
    return customers.filter(c => !activeCustomerIds.has(c.id));
  }, [periodSales, customers]);

  const commissionData = useMemo(() => {
    const totals: Record<string, { user: User; totalSales: number; commission: number }> = {};
    users.filter(u => u.commissionActive).forEach(u => {
      totals[u.id] = { user: u, totalSales: 0, commission: 0 };
    });
    periodSales.forEach(sale => {
      if (sale.vendorId && totals[sale.vendorId]) {
        const rate = totals[sale.vendorId].user.commissionRate || 0;
        const baseValue = sale.value - (sale.shippingValue || 0);
        totals[sale.vendorId].totalSales += baseValue;
        totals[sale.vendorId].commission += (baseValue * (rate / 100));
      }
    });
    return Object.values(totals).sort((a, b) => b.commission - a.commission);
  }, [periodSales, users]);

  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAverageTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Relatórios Avançados</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-tight">Filtro Unidade: {isAdmin ? 'Global' : currentStoreName}</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
           <TabBtn active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} label="Vendas" />
           <TabBtn active={activeTab === 'commissions'} onClick={() => setActiveTab('commissions')} label="Comissões" />
           <TabBtn active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} label="Clientes Inativos" />
           <div className="w-px h-6 bg-slate-200 mx-2 self-center"></div>
           {[7, 30, 90].map(d => (
             <button key={d} onClick={() => setPeriod(d)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${period === d ? 'text-primary underline underline-offset-4' : 'text-slate-400'}`}>{d} DIAS</button>
           ))}
        </div>
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ReportKPICard title="Ticket Médio Geral" value={`R$ ${globalAverageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
            <ReportKPICard title="Faturamento Bruto" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-emerald-500" />
            <ReportKPICard title="Qtd Vendas" value={periodSales.length.toString()} icon="shopping_bag" color="text-amber-500" />
            <ReportKPICard title="Itens Vendidos" value={periodSales.reduce((acc, t) => acc + (t.items?.reduce((a,i) => a+i.quantity, 0) || 0), 0).toString()} icon="inventory" color="text-blue-500" />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border shadow-sm overflow-hidden">
             <div className="p-8 border-b bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tighter">Performance de Ticket Médio por Vendedor</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Baseado em {period} dias</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b">
                         <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Vendedor</th>
                         <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-center">Total Vendido</th>
                         <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-center">Qtd Vendas</th>
                         <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Ticket Médio</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {vendorStats.map(s => (
                        <tr key={s.user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                           <td className="px-10 py-6 font-black uppercase text-sm text-slate-700 dark:text-slate-300">{s.user.name}</td>
                           <td className="px-10 py-6 text-center tabular-nums text-slate-500">R$ {s.totalSales.toLocaleString('pt-BR')}</td>
                           <td className="px-10 py-6 text-center font-bold">{s.count}</td>
                           <td className="px-10 py-6 text-right font-black text-primary text-lg tabular-nums">R$ {s.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border shadow-sm overflow-hidden animate-in slide-in-from-right-4">
           <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                 <tr>
                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Colaborador</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-center">Taxa (%)</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Comissão Acumulada</th>
                 </tr>
              </thead>
              <tbody className="divide-y">
                 {commissionData.map(data => (
                   <tr key={data.user.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-10 py-6 font-black uppercase text-sm">{data.user.name}</td>
                      <td className="px-10 py-6 text-center"><span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-black">{data.user.commissionRate}%</span></td>
                      <td className="px-10 py-6 text-right font-black text-emerald-500 text-xl tabular-nums">R$ {data.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           <div className="bg-rose-500/10 border-2 border-dashed border-rose-500/20 p-8 rounded-[2.5rem] flex items-center gap-6">
              <div className="size-16 bg-rose-500 text-white rounded-3xl flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">person_off</span></div>
              <div>
                 <h4 className="text-lg font-black text-rose-800 dark:text-rose-400 uppercase leading-none">Ação de Reativação</h4>
                 <p className="text-xs font-bold text-rose-700/60 dark:text-rose-400/60 uppercase mt-1">Estes clientes estão cadastrados mas não compraram nos últimos {period} dias.</p>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50 dark:bg-slate-800/80 border-b">
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Cliente</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Contato</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Cidade</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {inactiveCustomers.length > 0 ? inactiveCustomers.map(c => (
                         <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                            <td className="px-10 py-6 font-black uppercase text-sm">{c.name}</td>
                            <td className="px-10 py-6 text-xs font-bold text-slate-500">{c.phone}</td>
                            <td className="px-10 py-6 text-xs uppercase font-bold text-slate-400">{c.city || 'N/I'}</td>
                            <td className="px-10 py-6 text-right">
                               <a href={`https://wa.me/55${c.phone.replace(/\D/g,'')}`} target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20">
                                  <span className="material-symbols-outlined text-sm">chat</span> Chamar no Zap
                               </a>
                            </td>
                         </tr>
                       )) : (
                         <tr><td colSpan={4} className="py-20 text-center opacity-20 uppercase font-black text-xs tracking-widest">Todos os clientes compraram no período!</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
);

const ReportKPICard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border shadow-sm group hover:border-primary/50 transition-all">
    <div className="flex justify-between items-start mb-6"><div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${color}`}><span className="material-symbols-outlined text-3xl">{icon}</span></div></div>
    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{title}</p>
    <h4 className="text-2xl font-black tabular-nums">{value}</h4>
  </div>
);

export default Reports;
