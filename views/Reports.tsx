
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, UserRole, User, ServiceOrderStatus } from '../types';
import { useLocation } from 'react-router-dom';

const Reports: React.FC = () => {
  const { transactions, users, currentUser, establishments, serviceOrders, products } = useApp();
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

  // --- LÓGICAS ESPECÍFICAS PARA CADA RELATÓRIO ---

  // 1. Evolução Diária / Ticket Período
  const dailyData = useMemo(() => {
    const map: Record<string, { label: string, total: number, count: number }> = {};
    periodSales.forEach(s => {
      if (!map[s.date]) map[s.date] = { label: s.date, total: 0, count: 0 };
      map[s.date].total += s.value;
      map[s.date].count += 1;
    });
    return Object.values(map).sort((a, b) => b.label.localeCompare(a.label));
  }, [periodSales]);

  // 2. Vendas por Ano
  const yearlyData = useMemo(() => {
    const map: Record<string, { label: string, total: number, count: number }> = {};
    periodSales.forEach(s => {
      const year = s.date.substring(0, 4);
      if (!map[year]) map[year] = { label: year, total: 0, count: 0 };
      map[year].total += s.value;
      map[year].count += 1;
    });
    return Object.values(map).sort((a, b) => b.label.localeCompare(a.label));
  }, [periodSales]);

  // 3. Ticket Médio por Mês/Ano
  const monthlyData = useMemo(() => {
    const map: Record<string, { label: string, total: number, count: number }> = {};
    periodSales.forEach(s => {
      const monthYear = s.date.substring(0, 7); // YYYY-MM
      if (!map[monthYear]) map[monthYear] = { label: monthYear, total: 0, count: 0 };
      map[monthYear].total += s.value;
      map[monthYear].count += 1;
    });
    return Object.values(map).sort((a, b) => b.label.localeCompare(a.label));
  }, [periodSales]);

  // 4. Vendas por Cliente
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

  // 5. Desempenho Vendedor / Ticket Vendedor
  const vendorStats = useMemo(() => {
    const map: Record<string, { name: string, total: number, count: number, items: number }> = {};
    periodSales.forEach(s => {
      const vid = s.vendorId || 'balcao';
      const vname = users.find(u => u.id === s.vendorId)?.name || 'Balcão / Sistema';
      if (!map[vid]) map[vid] = { name: vname, total: 0, count: 0, items: 0 };
      map[vid].total += s.value;
      map[vid].count += 1;
      s.items?.forEach(i => map[vid].items += i.quantity);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [periodSales, users]);

  // 6. Produtos / Margem Bruta
  const productsStats = useMemo(() => {
    const map: Record<string, { name: string, sku: string, qty: number, total: number, cost: number }> = {};
    periodSales.forEach(s => {
      s.items?.forEach(i => {
        if (!map[i.id]) map[i.id] = { name: i.name, sku: i.sku, qty: 0, total: 0, cost: 0 };
        map[i.id].qty += i.quantity;
        map[i.id].total += (i.quantity * i.salePrice);
        map[i.id].cost += (i.quantity * (i.costPrice || 0));
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [periodSales]);

  // 7. Entrega Futura (Baseado em OS não concluídas)
  const futureDeliveries = useMemo(() => {
    return (serviceOrders || []).filter(os => {
      const belongsToStore = isAdmin || os.store === currentStoreName;
      const isPending = os.status !== ServiceOrderStatus.FINISHED && os.status !== ServiceOrderStatus.CANCELLED;
      return belongsToStore && isPending;
    });
  }, [serviceOrders, isAdmin, currentStoreName]);

  // 8. Vendas por Unidade (Hierárquico)
  const unitSalesStats = useMemo(() => {
    const unitMap: Record<string, { storeName: string; total: number; count: number; vendors: Record<string, { name: string; total: number; count: number }> }> = {};
    periodSales.forEach(s => {
      const storeName = s.store || 'Unidade Indefinida';
      if (!unitMap[storeName]) unitMap[storeName] = { storeName, total: 0, count: 0, vendors: {} };
      unitMap[storeName].total += s.value;
      unitMap[storeName].count += 1;
      const vendorId = s.vendorId || 'sem-vendedor';
      const vendorName = users.find(u => u.id === s.vendorId)?.name || 'Balcão / Sistema';
      if (!unitMap[storeName].vendors[vendorId]) unitMap[storeName].vendors[vendorId] = { name: vendorName, total: 0, count: 0 };
      unitMap[storeName].vendors[vendorId].total += s.value;
      unitMap[storeName].vendors[vendorId].count += 1;
    });
    return Object.values(unitMap).sort((a, b) => b.total - a.total);
  }, [periodSales, users]);

  // KPI Globais
  const totalRevenue = periodSales.reduce((acc, t) => acc + t.value, 0);
  const globalAvgTicket = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  const getReportTitle = (type: string) => {
    const titles: Record<string, string> = {
      evolucao: 'Evolução de Vendas Diária',
      vendas_unidade: 'Vendas por Unidade e Equipe',
      entrega_futura: 'Entrega Futura / OS Pendentes',
      por_ano: 'Consolidado de Vendas por Ano',
      por_cliente: 'Ranking de Compras por Cliente',
      por_vendas: 'Relatório Analítico de Vendas',
      por_vendedor: 'Desempenho da Equipe de Vendas',
      ticket_vendedor: 'Ticket Médio por Vendedor',
      ticket_periodo: 'Ticket Médio por Mês/Ano',
      por_produto: 'Vendas por Produto (Curva ABC)',
      margem_bruta: 'Relatório de Lucratividade / Margem',
      por_servico: 'Relatório de Serviços Realizados'
    };
    return titles[type] || 'Relatório de Gestão';
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 pb-20">
      <style>{`
        @media print {
          @page { margin: 1cm; size: A4; }
          aside, header, nav, .no-print { display: none !important; }
          main, body, #root, .flex-1 { 
            margin: 0 !important; 
            padding: 0 !important; 
            display: block !important; 
            width: 100% !important; 
            background: white !important; 
            color: black !important; 
          }
          #report-print-container { position: relative; width: 100%; }
          .shadow-sm, .shadow-xl, .shadow-2xl, .shadow-lg { box-shadow: none !important; border: 1px solid #eee !important; }
          .rounded-[3rem], .rounded-[2rem], .rounded-3xl { border-radius: 0 !important; }
          .bg-slate-50, .bg-slate-100 { background-color: #f8fafc !important; print-color-adjust: exact; }
          .text-primary { color: #136dec !important; }
          table { width: 100% !important; border-collapse: collapse !important; margin-top: 10px; }
          th, td { border-bottom: 1px solid #eee !important; padding: 12px 8px !important; font-size: 10pt !important; }
          th { background-color: #f1f5f9 !important; font-weight: bold !important; text-transform: uppercase; }
          tr { page-break-inside: avoid !important; }
          .kpi-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; }
        }
      `}</style>

      <div id="report-print-container" className="space-y-8">
        {/* CABEÇALHO */}
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
               <span className="material-symbols-outlined text-sm">print</span> Imprimir Relatório
             </button>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="kpi-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ReportKPICard title="Ticket Médio" value={`R$ ${globalAvgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" color="text-primary" />
          <ReportKPICard title="Faturamento Bruto" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" color="text-emerald-500" />
          <ReportKPICard title="Operações" value={periodSales.length.toString()} icon="shopping_bag" color="text-amber-500" />
          <ReportKPICard title="Clientes Diferentes" value={customerRanking.length.toString()} icon="groups" color="text-blue-500" />
        </div>

        {/* TABELA DE DADOS DINÂMICA */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           
           {/* RELATÓRIO: VENDAS POR UNIDADE */}
           {reportType === 'vendas_unidade' && (
              <div className="p-8 space-y-10">
                {unitSalesStats.map((unit, i) => (
                  <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-6 flex justify-between items-center border-b">
                      <div>
                        <h4 className="text-lg font-black uppercase">{unit.storeName}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{unit.count} Vendas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary">R$ {unit.total.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr><th>Vendedor</th><th className="text-center">Vendas</th><th className="text-right">Total (R$)</th><th className="text-right">Part %</th></tr>
                      </thead>
                      <tbody>
                        {(Object.values(unit.vendors) as any[]).sort((a,b) => b.total - a.total).map((v, idx) => (
                          <tr key={idx} className="font-bold">
                            <td className="uppercase">{v.name}</td>
                            <td className="text-center">{v.count}</td>
                            <td className="text-right font-black">R$ {v.total.toLocaleString('pt-BR')}</td>
                            <td className="text-right text-primary">{((v.total / unit.total) * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
           )}

           {/* RELATÓRIO: EVOLUÇÃO DIÁRIA / POR ANO / TICKET PERIODO */}
           {(reportType === 'evolucao' || reportType === 'por_ano' || reportType === 'ticket_periodo') && (
              <table>
                <thead>
                  <tr>
                    <th>{reportType === 'por_ano' ? 'Ano' : reportType === 'ticket_periodo' ? 'Mês/Ano' : 'Data'}</th>
                    <th className="text-center">Vendas</th>
                    <th className="text-right">Faturamento Bruto</th>
                    <th className="text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportType === 'por_ano' ? yearlyData : reportType === 'ticket_periodo' ? monthlyData : dailyData).map((d, i) => (
                    <tr key={i} className="font-bold">
                      <td className="uppercase">{d.label}</td>
                      <td className="text-center">{d.count}</td>
                      <td className="text-right font-black">R$ {d.total.toLocaleString('pt-BR')}</td>
                      <td className="text-right text-primary">R$ {(d.total / d.count).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           )}

           {/* RELATÓRIO: POR CLIENTE */}
           {reportType === 'por_cliente' && (
              <table>
                <thead>
                  <tr><th>Cliente</th><th className="text-center">Freq.</th><th className="text-right">Última Compra</th><th className="text-right">Total Acumulado</th></tr>
                </thead>
                <tbody>
                  {customerRanking.map((c, i) => (
                    <tr key={i} className="font-bold">
                      <td className="uppercase">{c.name}</td>
                      <td className="text-center">{c.count}x</td>
                      <td className="text-right text-slate-400">{c.lastSale}</td>
                      <td className="text-right text-primary font-black">R$ {c.total.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           )}

           {/* RELATÓRIO: POR VENDEDOR / TICKET VENDEDOR */}
           {(reportType === 'por_vendedor' || reportType === 'ticket_vendedor') && (
              <table>
                <thead>
                  <tr><th>Vendedor</th><th className="text-center">Vendas</th><th className="text-center">Itens (IPV)</th><th className="text-right">Ticket Médio</th><th className="text-right">Total Bruto</th></tr>
                </thead>
                <tbody>
                  {vendorStats.map((v, i) => (
                    <tr key={i} className="font-bold">
                      <td className="uppercase">{v.name}</td>
                      <td className="text-center">{v.count}</td>
                      <td className="text-center">{(v.items / v.count).toFixed(2)}</td>
                      <td className="text-right text-amber-500 font-black">R$ {(v.total / v.count).toLocaleString('pt-BR')}</td>
                      <td className="text-right text-primary font-black">R$ {v.total.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           )}

           {/* RELATÓRIO: POR PRODUTO / MARGEM BRUTA */}
           {(reportType === 'por_produto' || reportType === 'margem_bruta') && (
              <table>
                <thead>
                  <tr>
                    <th>Produto / SKU</th>
                    <th className="text-center">Qtd.</th>
                    <th className="text-right">Total Venda</th>
                    {reportType === 'margem_bruta' && <th className="text-right">Lucro Bruto (Est.)</th>}
                    {reportType === 'margem_bruta' && <th className="text-right">Margem %</th>}
                  </tr>
                </thead>
                <tbody>
                  {productsStats.map((p, i) => (
                    <tr key={i} className="font-bold">
                      <td className="uppercase">
                        <p>{p.name}</p>
                        <p className="text-[8px] text-slate-400 font-mono">{p.sku}</p>
                      </td>
                      <td className="text-center">{p.qty}</td>
                      <td className="text-right">R$ {p.total.toLocaleString('pt-BR')}</td>
                      {reportType === 'margem_bruta' && <td className="text-right text-emerald-500 font-black">R$ {(p.total - p.cost).toLocaleString('pt-BR')}</td>}
                      {reportType === 'margem_bruta' && <td className="text-right text-primary font-black">{p.total > 0 ? (((p.total - p.cost) / p.total) * 100).toFixed(1) : 0}%</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
           )}

           {/* RELATÓRIO: POR VENDAS ANALÍTICO */}
           {reportType === 'por_vendas' && (
              <table>
                <thead>
                  <tr><th>ID Venda</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th className="text-right">Valor Total</th></tr>
                </thead>
                <tbody>
                  {periodSales.map((s, i) => (
                    <tr key={i} className="text-[11px]">
                      <td className="font-mono text-primary font-black">{s.id}</td>
                      <td className="text-slate-500">{s.date}</td>
                      <td className="uppercase font-bold">{s.client || 'Consumidor'}</td>
                      <td className="uppercase font-bold">{s.method}</td>
                      <td className="text-right font-black">R$ {s.value.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           )}

           {/* RELATÓRIO: ENTREGA FUTURA */}
           {reportType === 'entrega_futura' && (
              <table>
                <thead>
                  <tr><th>ID OS</th><th>Abertura</th><th>Cliente</th><th>Status</th><th className="text-right">Valor Estimado</th></tr>
                </thead>
                <tbody>
                  {futureDeliveries.map((os, i) => (
                    <tr key={i} className="font-bold">
                      <td className="font-mono text-primary font-black">{os.id}</td>
                      <td className="text-slate-400">{os.date}</td>
                      <td className="uppercase">{os.customerName}</td>
                      <td><span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[9px]">{os.status}</span></td>
                      <td className="text-right text-primary font-black">R$ {os.totalValue.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           )}

           {/* RELATÓRIO: POR SERVIÇO */}
           {reportType === 'por_servico' && (
              <table>
                <thead>
                  <tr><th>Mão de Obra</th><th className="text-center">Execuções</th><th className="text-right">Total Faturado</th></tr>
                </thead>
                <tbody>
                  {productsStats.filter(p => {
                    const original = products.find(x => x.id === p.sku || x.name === p.name);
                    return original?.isService || p.sku.startsWith('SRV');
                  }).map((p, i) => (
                    <tr key={i} className="font-bold">
                      <td className="uppercase">{p.name}</td>
                      <td className="text-center">{p.qty}</td>
                      <td className="text-right text-amber-500 font-black">R$ {p.total.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           )}

           {periodSales.length === 0 && reportType !== 'entrega_futura' && (
              <div className="py-32 text-center">
                 <span className="material-symbols-outlined text-8xl text-slate-100 dark:text-slate-800">query_stats</span>
                 <p className="uppercase font-black text-xs text-slate-300 tracking-[0.4em] mt-4">Nenhum dado localizado para o período e filtros atuais</p>
              </div>
           )}
        </div>

        {/* RODAPÉ DE IMPRESSÃO */}
        <div className="hidden print:block border-t border-slate-900 pt-8 mt-10 text-[8px] uppercase font-black opacity-30 text-center">
           Relatório gerado em {new Date().toLocaleString('pt-BR')} • Tem Acessorios ERP • Página de Gestão de Resultados
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
