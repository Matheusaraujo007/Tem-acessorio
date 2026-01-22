
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Transaction, Product, Customer, UserRole, User } from '../types';
import { useLocation } from 'react-router-dom';

const Reports: React.FC = () => {
  const { transactions, customers, users, currentUser, establishments, products } = useApp();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const reportType = query.get('type') || 'evolucao';

  const [period, setPeriod] = useState(30);

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
      const isCorrectPeriod = t.type === 'INCOME' && (t.category === 'Venda' || t.category === 'Serviço') && tDate >= cutoffDate;
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
    return Object.values(stats).filter(s => s.count > 0).map(s => ({ ...s, avgTicket: s.totalSales / s.count })).sort((a, b) => b.avgTicket - a.avgTicket);
  }, [periodSales, users]);

  const productsStats = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number; cost: number; margin: number }> = {};
    periodSales.forEach(t => {
      t.items?.forEach(item => {
        if (!map[item.id]) map[item.id] = { name: item.name, qty: 0, total: 0, cost: item.costPrice || 0, margin: 0 };
        map[item.id].qty += item.quantity;
        map[item.id].total += (item.quantity * item.salePrice);
      });
    });
    return Object.values(map).map(p => ({ ...p, margin: p.total - (p.qty * p.cost) })).sort((a, b) => b.total - a.total);
  }, [periodSales]);

  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAverageTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  const getReportTitle = (type: string) => {
    const titles: Record<string, string> = {
      evolucao: 'Evolução de Vendas',
      entrega_futura: 'Entrega Futura',
      por_ano: 'Vendas por Ano',
      por_cliente: 'Ranking por Cliente',
      por_vendas: 'Relatório de Vendas Detalhado',
      por_vendedor: 'Desempenho por Vendedor',
      ticket_vendedor: 'Ticket Médio por Vendedor',
      ticket_periodo: 'Ticket Médio Mensal',
      por_produto: 'Vendas por Produto',
      margem_bruta: 'Lucratividade e Margem Bruta',
      por_servico: 'Relatório de Serviços / Mão de Obra'
    };
    return titles[type] || 'Relatório de Vendas';
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{getReportTitle(reportType)}</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-tight">Filtro Unidade: {isAdmin ? 'Global' : currentStoreName}</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
           {[7, 30, 90, 365].map(d => (
             <button key={d} onClick={() => setPeriod(d)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === d ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{d === 365 ? '1 ANO' : `${d} DIAS`}</button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportKPICard title="Ticket Médio Geral" value={`R$ ${globalAverageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
        <ReportKPICard title="Faturamento Período" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-emerald-500" />
        <ReportKPICard title="Total de Operações" value={periodSales.length.toString()} icon="shopping_bag" color="text-amber-500" />
        <ReportKPICard title="Margem Contribuição" value={`R$ ${(totalRevenue * 0.35).toLocaleString('pt-BR')}`} icon="pie_chart" color="text-blue-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
         <div className="p-8 border-b bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tighter">Dados Analíticos do Relatório</h3>
            <div className="flex gap-2">
               <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-[10px] font-black uppercase rounded-lg">Exportar PDF</button>
               <button className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg">Excel</button>
            </div>
         </div>
         
         <div className="overflow-x-auto">
            {reportType === 'por_produto' || reportType === 'margem_bruta' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b">
                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Produto</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-center">Qtd</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Venda Total</th>
                    {reportType === 'margem_bruta' && <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Margem Bruta (R$)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productsStats.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-10 py-6 font-black uppercase text-sm">{p.name}</td>
                      <td className="px-10 py-6 text-center font-bold tabular-nums">{p.qty}</td>
                      <td className="px-10 py-6 text-right font-black tabular-nums text-primary">R$ {p.total.toLocaleString('pt-BR')}</td>
                      {reportType === 'margem_bruta' && <td className="px-10 py-6 text-right font-black tabular-nums text-emerald-500">R$ {p.margin.toLocaleString('pt-BR')}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'ticket_vendedor' || reportType === 'por_vendedor' ? (
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
                         <td className="px-10 py-6 font-black uppercase text-sm">{s.user.name}</td>
                         <td className="px-10 py-6 text-center tabular-nums text-slate-500">R$ {s.totalSales.toLocaleString('pt-BR')}</td>
                         <td className="px-10 py-6 text-center font-bold">{s.count}</td>
                         <td className="px-10 py-6 text-right font-black text-primary text-lg tabular-nums">R$ {s.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            ) : (
              <div className="py-20 text-center space-y-4">
                 <span className="material-symbols-outlined text-6xl text-slate-200">analytics</span>
                 <p className="uppercase font-black text-xs text-slate-400 tracking-[0.3em]">Gerando demonstrativo detalhado para {getReportTitle(reportType)}...</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const ReportKPICard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary/50 transition-all">
    <div className="flex justify-between items-start mb-6"><div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${color}`}><span className="material-symbols-outlined text-3xl">{icon}</span></div></div>
    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{title}</p>
    <h4 className="text-2xl font-black tabular-nums">{value}</h4>
  </div>
);

export default Reports;
