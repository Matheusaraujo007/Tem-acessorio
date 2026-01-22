
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

  // Transações base filtradas por período e unidade
  const periodSales = useMemo(() => {
    return (transactions || []).filter(t => {
      const tDate = new Date(t.date);
      const isCorrectPeriod = t.type === 'INCOME' && (t.category === 'Venda' || t.category === 'Serviço') && tDate >= cutoffDate;
      const belongsToStore = isAdmin || t.store === currentStoreName;
      return isCorrectPeriod && belongsToStore;
    });
  }, [transactions, cutoffDate, isAdmin, currentStoreName]);

  // LÓGICAS DE PROCESSAMENTO PARA CADA TIPO DE RELATÓRIO
  
  // 1. Evolução Diária
  const evolutionData = useMemo(() => {
    const map: Record<string, { date: string, total: number, count: number }> = {};
    periodSales.forEach(s => {
      if (!map[s.date]) map[s.date] = { date: s.date, total: 0, count: 0 };
      map[s.date].total += s.value;
      map[s.date].count += 1;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [periodSales]);

  // 2. Por Cliente
  const customerRanking = useMemo(() => {
    const map: Record<string, { name: string, total: number, count: number, lastSale: string }> = {};
    periodSales.forEach(s => {
      const cid = s.clientId || 'avulso';
      const cname = s.client || 'Consumidor Final';
      if (!map[cid]) map[cid] = { name: cname, total: 0, count: 0, lastSale: s.date };
      map[cid].total += s.value;
      map[cid].count += 1;
      if (s.date > map[cid].lastSale) map[cid].lastSale = s.date;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [periodSales]);

  // 3. Por Vendedor / Ticket Vendedor
  const vendorStats = useMemo(() => {
    const stats: Record<string, { user: User; totalSales: number; count: number; itemsCount: number }> = {};
    users.filter(u => u.role === UserRole.VENDOR || u.role === UserRole.ADMIN).forEach(u => {
      stats[u.id] = { user: u, totalSales: 0, count: 0, itemsCount: 0 };
    });
    periodSales.forEach(sale => {
      const vid = sale.vendorId || 'none';
      if (stats[vid]) {
        stats[vid].totalSales += sale.value;
        stats[vid].count += 1;
        sale.items?.forEach(i => stats[vid].itemsCount += i.quantity);
      }
    });
    return Object.values(stats)
      .filter(s => s.count > 0)
      .map(s => ({ ...s, avgTicket: s.totalSales / s.count, ipv: s.itemsCount / s.count }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [periodSales, users]);

  // 4. Por Produto / Margem
  const productsStats = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number; cost: number; margin: number, sku: string }> = {};
    periodSales.forEach(t => {
      t.items?.forEach(item => {
        if (!map[item.id]) map[item.id] = { name: item.name, sku: item.sku || 'N/I', qty: 0, total: 0, cost: item.costPrice || 0, margin: 0 };
        map[item.id].qty += item.quantity;
        map[item.id].total += (item.quantity * item.salePrice);
      });
    });
    return Object.values(map).map(p => ({ ...p, margin: p.total - (p.qty * p.cost) })).sort((a, b) => b.total - a.total);
  }, [periodSales]);

  // 5. Por Serviço
  const servicesStats = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    periodSales.forEach(t => {
      t.items?.filter(i => i.isService).forEach(item => {
        if (!map[item.id]) map[item.id] = { name: item.name, qty: 0, total: 0 };
        map[item.id].qty += item.quantity;
        map[item.id].total += (item.quantity * item.salePrice);
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [periodSales]);

  // KPI Globais
  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAverageTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  const getReportTitle = (type: string) => {
    const titles: Record<string, string> = {
      evolucao: 'Evolução de Vendas Diária',
      entrega_futura: 'Entrega Futura (Agendamentos)',
      por_ano: 'Vendas Consolidadas por Ano',
      por_cliente: 'Ranking de Compras por Cliente',
      por_vendas: 'Relatório Analítico de Vendas',
      por_vendedor: 'Desempenho da Equipe de Vendas',
      ticket_vendedor: 'Ticket Médio Detalhado por Vendedor',
      ticket_periodo: 'Ticket Médio por Mês/Ano',
      por_produto: 'Vendas por Produto (Curva ABC)',
      margem_bruta: 'Relatório de Lucratividade / Margem',
      por_servico: 'Relatório de Serviços e Mão de Obra'
    };
    return titles[type] || 'Relatório de Vendas';
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">{getReportTitle(reportType)}</h2>
          <p className="text-slate-500 text-[10px] mt-2 font-black uppercase tracking-[0.2em]">Filtro Unidade: {isAdmin ? 'Global / Todas' : currentStoreName}</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
           {[7, 30, 90, 365].map(d => (
             <button key={d} onClick={() => setPeriod(d)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === d ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{d === 365 ? '1 ANO' : `${d} DIAS`}</button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportKPICard title="Ticket Médio" value={`R$ ${globalAverageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
        <ReportKPICard title="Faturamento Total" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-emerald-500" />
        <ReportKPICard title="Operações" value={periodSales.length.toString()} icon="shopping_bag" color="text-amber-500" />
        <ReportKPICard title="Itens Vendidos" value={periodSales.reduce((acc, s) => acc + (s.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0).toString()} icon="inventory" color="text-blue-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
         <div className="p-8 border-b bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-black uppercase tracking-tighter">Detalhamento dos Dados ({periodSales.length} registros)</h3>
            <div className="flex gap-2">
               <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-2"> <span className="material-symbols-outlined text-sm">print</span> Imprimir PDF</button>
               <button className="px-6 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-2"> <span className="material-symbols-outlined text-sm">download</span> Excel</button>
            </div>
         </div>
         
         <div className="overflow-x-auto">
            {/* RELATÓRIO: EVOLUÇÃO / TICKET PERÍODO */}
            {(reportType === 'evolucao' || reportType === 'ticket_periodo' || reportType === 'por_ano') && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">Data / Período</th>
                    <th className="px-10 py-6 text-center">Operações</th>
                    <th className="px-10 py-6 text-right">Faturamento Bruto</th>
                    <th className="px-10 py-6 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {evolutionData.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all font-bold">
                      <td className="px-10 py-6 uppercase text-sm text-slate-600 dark:text-slate-300">{d.date}</td>
                      <td className="px-10 py-6 text-center tabular-nums">{d.count}</td>
                      <td className="px-10 py-6 text-right font-black text-slate-900 dark:text-white tabular-nums">R$ {d.total.toLocaleString('pt-BR')}</td>
                      <td className="px-10 py-6 text-right font-black text-primary tabular-nums">R$ {(d.total / d.count).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* RELATÓRIO: POR CLIENTE */}
            {reportType === 'por_cliente' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">Cliente</th>
                    <th className="px-10 py-6 text-center">Frequência</th>
                    <th className="px-10 py-6 text-right">Última Compra</th>
                    <th className="px-10 py-6 text-right">Valor Consolidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerRanking.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                      <td className="px-10 py-6 font-black uppercase text-sm">{c.name}</td>
                      <td className="px-10 py-6 text-center font-bold tabular-nums">{c.count}x</td>
                      <td className="px-10 py-6 text-right text-xs text-slate-400 uppercase font-black">{c.lastSale}</td>
                      <td className="px-10 py-6 text-right font-black text-primary text-lg tabular-nums">R$ {c.total.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* RELATÓRIO: VENDEDOR / TICKET VENDEDOR */}
            {(reportType === 'por_vendedor' || reportType === 'ticket_vendedor') && (
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                       <th className="px-10 py-6">Vendedor</th>
                       <th className="px-10 py-6 text-center">Vendas</th>
                       <th className="px-10 py-6 text-center">Itens (IPV)</th>
                       <th className="px-10 py-6 text-right">Ticket Médio</th>
                       <th className="px-10 py-6 text-right">Faturamento</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {vendorStats.map(s => (
                      <tr key={s.user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all font-bold">
                         <td className="px-10 py-6 font-black uppercase text-sm">{s.user.name}</td>
                         <td className="px-10 py-6 text-center tabular-nums">{s.count}</td>
                         <td className="px-10 py-6 text-center tabular-nums">{s.ipv.toFixed(2)}</td>
                         <td className="px-10 py-6 text-right font-black text-amber-500 tabular-nums">R$ {s.avgTicket.toLocaleString('pt-BR')}</td>
                         <td className="px-10 py-6 text-right font-black text-primary text-lg tabular-nums">R$ {s.totalSales.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            )}

            {/* RELATÓRIO: POR PRODUTO / MARGEM BRUTA */}
            {(reportType === 'por_produto' || reportType === 'margem_bruta') && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">Produto / Referência</th>
                    <th className="px-10 py-6 text-center">Qtd Vendida</th>
                    <th className="px-10 py-6 text-right">Venda Total</th>
                    {reportType === 'margem_bruta' && <th className="px-10 py-6 text-right">Margem Bruta (R$)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {productsStats.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                      <td className="px-10 py-6">
                         <p className="text-sm font-black uppercase text-slate-800 dark:text-white leading-tight">{p.name}</p>
                         <p className="text-[9px] font-mono font-black text-primary uppercase">{p.sku}</p>
                      </td>
                      <td className="px-10 py-6 text-center font-black tabular-nums">{p.qty}</td>
                      <td className="px-10 py-6 text-right font-black tabular-nums text-slate-700 dark:text-slate-200">R$ {p.total.toLocaleString('pt-BR')}</td>
                      {reportType === 'margem_bruta' && <td className="px-10 py-6 text-right font-black tabular-nums text-emerald-500">R$ {p.margin.toLocaleString('pt-BR')}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* RELATÓRIO: POR SERVIÇO */}
            {reportType === 'por_servico' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">Mão de Obra</th>
                    <th className="px-10 py-6 text-center">Realizados</th>
                    <th className="px-10 py-6 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {servicesStats.length > 0 ? servicesStats.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all font-bold">
                      <td className="px-10 py-6 uppercase text-sm">{s.name}</td>
                      <td className="px-10 py-6 text-center tabular-nums">{s.qty}</td>
                      <td className="px-10 py-6 text-right font-black text-amber-500 text-lg tabular-nums">R$ {s.total.toLocaleString('pt-BR')}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-20 text-center uppercase font-black text-slate-300 text-xs">Nenhum serviço registrado no período</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* RELATÓRIO: POR VENDAS (ANALÍTICO) */}
            {reportType === 'por_vendas' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">ID Venda</th>
                    <th className="px-10 py-6">Data</th>
                    <th className="px-10 py-6">Cliente</th>
                    <th className="px-10 py-6">Pagamento</th>
                    <th className="px-10 py-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periodSales.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-xs font-bold">
                      <td className="px-10 py-6 font-black text-primary">{s.id}</td>
                      <td className="px-10 py-6 text-slate-400">{s.date}</td>
                      <td className="px-10 py-6 uppercase">{s.client || 'CONSUMIDOR'}</td>
                      <td className="px-10 py-6 uppercase">{s.method || 'N/I'}</td>
                      <td className="px-10 py-6 text-right font-black tabular-nums">R$ {s.value.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {periodSales.length === 0 && (
              <div className="py-32 text-center space-y-4">
                 <span className="material-symbols-outlined text-8xl text-slate-100 dark:text-slate-800">query_stats</span>
                 <p className="uppercase font-black text-xs text-slate-300 tracking-[0.4em]">Base de dados vazia para este filtro</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const ReportKPICard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary/50 transition-all">
    <div className="flex justify-between items-start mb-6"><div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${color} shadow-inner`}><span className="material-symbols-outlined text-3xl">{icon}</span></div></div>
    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{title}</p>
    <h4 className="text-2xl font-black tabular-nums">{value}</h4>
  </div>
);

export default Reports;
