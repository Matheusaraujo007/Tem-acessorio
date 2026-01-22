
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, UserRole, User } from '../types';
import { useLocation } from 'react-router-dom';

const Reports: React.FC = () => {
  const { transactions, users, currentUser, establishments } = useApp();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const reportType = query.get('type') || 'evolucao';

  // Datas iniciais: últimos 30 dias
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);
  const currentStoreName = currentStore?.name || '';

  // Transações filtradas pelo intervalo de datas e unidade
  const periodSales = useMemo(() => {
    return (transactions || []).filter(t => {
      const belongsToStore = isAdmin || t.store === currentStoreName;
      const isCorrectType = t.type === 'INCOME' && (t.category === 'Venda' || t.category === 'Serviço');
      const inRange = t.date >= startDate && t.date <= endDate;
      return belongsToStore && isCorrectType && inRange;
    });
  }, [transactions, startDate, endDate, isAdmin, currentStoreName]);

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

  // 3. Por Vendedor
  const vendorStats = useMemo(() => {
    const stats: Record<string, { user: User; totalSales: number; count: number; itemsCount: number }> = {};
    users.filter(u => u.role === UserRole.VENDOR || u.role === UserRole.ADMIN || u.role === UserRole.MANAGER).forEach(u => {
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

  // 5. Vendas por Unidade (Hierárquico)
  const unitSalesStats = useMemo(() => {
    const unitMap: Record<string, { storeName: string; total: number; count: number; vendors: Record<string, { name: string; total: number; count: number }> }> = {};
    
    periodSales.forEach(s => {
      const storeName = s.store || 'Unidade Indefinida';
      if (!unitMap[storeName]) {
        unitMap[storeName] = { storeName, total: 0, count: 0, vendors: {} };
      }
      unitMap[storeName].total += s.value;
      unitMap[storeName].count += 1;

      const vendorId = s.vendorId || 'sem-vendedor';
      const vendorName = users.find(u => u.id === s.vendorId)?.name || 'Balcão / Sistema';
      
      if (!unitMap[storeName].vendors[vendorId]) {
        unitMap[storeName].vendors[vendorId] = { name: vendorName, total: 0, count: 0 };
      }
      unitMap[storeName].vendors[vendorId].total += s.value;
      unitMap[storeName].vendors[vendorId].count += 1;
    });

    return Object.values(unitMap).sort((a, b) => b.total - a.total);
  }, [periodSales, users]);

  // KPI Globais
  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAverageTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  const getReportTitle = (type: string) => {
    const titles: Record<string, string> = {
      evolucao: 'Evolução de Vendas Diária',
      vendas_unidade: 'Relatório de Vendas por Unidade',
      entrega_futura: 'Entrega Futura (Agendamentos)',
      por_ano: 'Vendas Consolidadas por Ano',
      por_cliente: 'Ranking de Compras por Cliente',
      por_vendas: 'Relatório Analítico de Vendas',
      por_vendedor: 'Desempenho da Equipe de Vendas',
      ticket_vendedor: 'Ticket Médio Detalhado por Vendedor',
      por_produto: 'Vendas por Produto (Curva ABC)',
      margem_bruta: 'Relatório de Lucratividade / Margem',
      por_servico: 'Relatório de Serviços e Mão de Obra'
    };
    return titles[type] || 'Relatório de Gestão';
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 pb-20 overflow-hidden">
      <style>{`
        @media print {
          /* Esconde tudo o que não é o conteúdo do relatório */
          aside, header, nav, .no-print, button, select, input[type="date"] {
            display: none !important;
          }
          /* Expande o conteúdo principal para ocupar toda a página */
          main, body, #root, .flex-1 {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
          }
          /* Estiliza o container do relatório para impressão */
          #report-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          /* Remove efeitos de UI que não saem bem no papel */
          .shadow-sm, .shadow-xl, .shadow-2xl, .shadow-lg {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
          .rounded-[3rem], .rounded-[2rem], .rounded-3xl {
            border-radius: 4px !important;
          }
          /* Força as cores de fundo em navegadores modernos */
          .bg-slate-50, .bg-slate-100 {
            background-color: #f8fafc !important;
            print-color-adjust: exact;
          }
          .text-primary {
            color: #136dec !important;
          }
          table { 
            width: 100% !important; 
            border-collapse: collapse !important;
          }
          th, td {
            border-bottom: 1px solid #eee !important;
          }
        }
      `}</style>

      <div id="report-print-area" className="space-y-8">
        {/* CABEÇALHO DO RELATÓRIO */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">{getReportTitle(reportType)}</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">
              <span>Período: {startDate} até {endDate}</span>
              <span className="hidden md:inline">•</span>
              <span>Filtro: {isAdmin ? 'ADMINISTRATIVO GLOBAL' : currentStoreName}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 no-print bg-white dark:bg-slate-800 p-2 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
             <div className="flex items-center gap-2 px-3">
                <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0 p-1" />
             </div>
             <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
             <div className="flex items-center gap-2 px-3">
                <span className="material-symbols-outlined text-slate-400 text-sm">event</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0 p-1" />
             </div>
             <button onClick={() => window.print()} className="ml-2 px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20">
               <span className="material-symbols-outlined text-sm">print</span> Imprimir Conteúdo
             </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ReportKPICard title="Ticket Médio" value={`R$ ${globalAverageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
          <ReportKPICard title="Faturamento Total" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-emerald-500" />
          <ReportKPICard title="Operações" value={periodSales.length.toString()} icon="shopping_bag" color="text-amber-500" />
          <ReportKPICard title="Itens Vendidos" value={periodSales.reduce((acc, s) => acc + (s.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0).toString()} icon="inventory" color="text-blue-500" />
        </div>

        {/* CONTAINER DOS DADOS */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           {reportType === 'vendas_unidade' && (
              <div className="p-8 space-y-10">
                {unitSalesStats.length > 0 ? unitSalesStats.map((unit, i) => (
                  <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-6 flex justify-between items-center border-b">
                      <div>
                        <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white">{unit.storeName}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit.count} Operações</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Faturamento Unidade</p>
                        <p className="text-2xl font-black text-primary tabular-nums">R$ {unit.total.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-white dark:bg-slate-900 border-b">
                        <tr className="text-[9px] font-black uppercase text-slate-400">
                          <th className="px-8 py-4">Vendedor</th>
                          <th className="px-8 py-4 text-center">Vendas</th>
                          <th className="px-8 py-4 text-right">Total Bruto (R$)</th>
                          <th className="px-8 py-4 text-right">Part. %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {(Object.values(unit.vendors) as any[]).sort((a, b) => b.total - a.total).map((v, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all font-bold">
                            <td className="px-8 py-4 uppercase text-sm text-slate-700 dark:text-slate-300">{v.name}</td>
                            <td className="px-8 py-4 text-center tabular-nums text-slate-500">{v.count}</td>
                            <td className="px-8 py-4 text-right tabular-nums font-black">R$ {v.total.toLocaleString('pt-BR')}</td>
                            <td className="px-8 py-4 text-right text-xs text-primary tabular-nums">
                              {unit.total > 0 ? ((v.total / unit.total) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )) : (
                  <div className="py-20 text-center uppercase font-black text-slate-300 text-xs">Sem dados para este intervalo</div>
                )}
              </div>
           )}

           {reportType === 'evolucao' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">Data</th>
                    <th className="px-10 py-6 text-center">Operações</th>
                    <th className="px-10 py-6 text-right">Total Faturado</th>
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

           {reportType === 'por_vendedor' && (
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                       <th className="px-10 py-6">Vendedor</th>
                       <th className="px-10 py-6 text-center">Vendas</th>
                       <th className="px-10 py-6 text-right">Ticket Médio</th>
                       <th className="px-10 py-6 text-right">Total Faturado</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {vendorStats.map(s => (
                      <tr key={s.user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all font-bold">
                         <td className="px-10 py-6 font-black uppercase text-sm">{s.user.name}</td>
                         <td className="px-10 py-6 text-center tabular-nums">{s.count}</td>
                         <td className="px-10 py-6 text-right font-black text-amber-500 tabular-nums">R$ {s.avgTicket.toLocaleString('pt-BR')}</td>
                         <td className="px-10 py-6 text-right font-black text-primary text-lg tabular-nums">R$ {s.totalSales.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           )}

           {periodSales.length === 0 && (
              <div className="py-32 text-center">
                 <span className="material-symbols-outlined text-8xl text-slate-100 dark:text-slate-800">query_stats</span>
                 <p className="uppercase font-black text-xs text-slate-300 tracking-[0.4em] mt-4">Nenhuma venda registrada no período selecionado</p>
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
