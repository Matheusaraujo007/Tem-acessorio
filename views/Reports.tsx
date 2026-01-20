
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, Product, Customer, UserRole, User } from '../types';

const Reports: React.FC = () => {
  const { transactions, customers, users, currentUser, establishments } = useApp();
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<'sales' | 'commissions'>('sales');

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

  const commissionData = useMemo(() => {
    const totals: Record<string, { user: User; totalSales: number; commission: number }> = {};
    
    // Inicializa quem ganha comissão
    users.filter(u => u.commissionActive).forEach(u => {
      totals[u.id] = { user: u, totalSales: 0, commission: 0 };
    });

    periodSales.forEach(sale => {
      if (sale.vendorId && totals[sale.vendorId]) {
        const rate = totals[sale.vendorId].user.commissionRate || 0;
        totals[sale.vendorId].totalSales += sale.value;
        totals[sale.vendorId].commission += (sale.value * (rate / 100));
      }
    });

    return Object.values(totals).sort((a, b) => b.commission - a.commission);
  }, [periodSales, users]);

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

  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAverageTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Relatórios e Performance</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-tight">
            {isAdmin ? 'Visão Consolidada Global' : `Filtro Unidade: ${currentStoreName}`}
          </p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <button onClick={() => setActiveTab('sales')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'sales' ? 'bg-primary text-white shadow-lg' : 'text-slate-400'}`}>Vendas</button>
           <button onClick={() => setActiveTab('commissions')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'commissions' ? 'bg-primary text-white shadow-lg' : 'text-slate-400'}`}>Comissões</button>
           <div className="w-px h-6 bg-slate-200 mx-2 self-center"></div>
           {[7, 30, 90].map(d => (
             <button key={d} onClick={() => setPeriod(d)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${period === d ? 'text-slate-900 dark:text-white underline underline-offset-4' : 'text-slate-400 hover:text-slate-600'}`}>{d} DIAS</button>
           ))}
        </div>
      </div>

      {activeTab === 'sales' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ReportKPICard title="Ticket Médio" value={`R$ ${globalAverageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
            <ReportKPICard title="Vendas Período" value={periodSales.length.toString()} icon="shopping_bag" color="text-rose-500" />
            <ReportKPICard title="Faturamento Bruto" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-amber-500" />
            <ReportKPICard title="Itens Vendidos" value={periodSales.reduce((acc, t) => acc + (t.items?.reduce((a,i) => a+i.quantity, 0) || 0), 0).toString()} icon="inventory" color="text-primary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black uppercase flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-amber-500">trophy</span> Produtos Mais Vendidos</h3>
              <div className="space-y-4">
                  {mostSoldItems.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl">
                      <img src={item.product.image} className="size-14 rounded-xl object-cover shadow-md" />
                      <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase truncate">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.product.category}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-black text-primary">{item.qty} un.</p>
                          <p className="text-[9px] text-slate-400 font-mono">R$ {item.revenue.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            {/* Outros componentes de vendas aqui... */}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <div className="bg-emerald-500/10 border-2 border-dashed border-emerald-500/20 p-8 rounded-[2.5rem] flex items-center gap-6">
              <div className="size-16 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">payments</span></div>
              <div>
                 <h4 className="text-lg font-black text-emerald-800 dark:text-emerald-400 uppercase leading-none">Gestão de Comissões</h4>
                 <p className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase mt-1">Valores calculados com base nas vendas do período selecionado ({period} dias).</p>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</th>
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Volume de Vendas</th>
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Taxa (%)</th>
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Comissão a Pagar</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {commissionData.length > 0 ? commissionData.map(data => (
                      <tr key={data.user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                         <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                               <div className="size-10 rounded-xl bg-slate-200 border-2 border-white shadow-sm" style={{backgroundImage: `url(${data.user.avatar || 'https://picsum.photos/seed/'+data.user.id+'/100/100'})`, backgroundSize: 'cover'}}></div>
                               <div>
                                  <p className="text-sm font-black uppercase">{data.user.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{data.user.role}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-10 py-6 text-center text-sm font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                            R$ {data.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </td>
                         <td className="px-10 py-6 text-center">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-black">{data.user.commissionRate}%</span>
                         </td>
                         <td className="px-10 py-6 text-right">
                            <p className="text-xl font-black text-emerald-500 tabular-nums">R$ {data.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="py-20 text-center opacity-20 uppercase font-black text-xs tracking-widest">Nenhuma comissão configurada ou vendas registradas</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
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
