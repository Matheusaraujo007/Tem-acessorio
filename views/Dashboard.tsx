
import React, { useMemo, useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserRole, Transaction } from '../types';

const Dashboard: React.FC = () => {
  const { transactions, products, currentUser, establishments, users, refreshData } = useApp();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      refreshData();
      setLastUpdate(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);
  const currentStoreName = currentStore?.name || '';
  const today = new Date().toISOString().split('T')[0];

  // Filtro de Transações do Dia
  const dailyTransactions = useMemo(() => {
    return (transactions || []).filter(t => 
      t.date === today && 
      t.type === 'INCOME' && 
      t.category === 'Venda' &&
      (isAdmin || t.store === currentStoreName)
    );
  }, [transactions, isAdmin, currentStoreName, today]);

  // Cálculos do Resumo Diário
  const dailyMetrics = useMemo(() => {
    const totalSales = dailyTransactions.reduce((acc, t) => acc + t.value, 0);
    const qtySales = dailyTransactions.length;
    let qtyProducts = 0;
    
    dailyTransactions.forEach(t => {
      t.items?.forEach(item => qtyProducts += item.quantity);
    });

    const avgTicket = qtySales > 0 ? totalSales / qtySales : 0;
    const prodsPerSale = qtySales > 0 ? qtyProducts / qtySales : 0;

    return { totalSales, qtySales, qtyProducts, avgTicket, prodsPerSale };
  }, [dailyTransactions]);

  // Emojis para Ticket Médio
  const getTicketEmoji = (val: number) => {
    if (val === 0) return '⚪';
    if (val < 50) return '🔴';
    if (val < 150) return '🟡';
    return '🟢';
  };

  // Agrupamento de Produtos Vendidos (Tabela Inferior Esquerda)
  const soldProductsList = useMemo(() => {
    const map: Record<string, { code: string, name: string, qty: number, total: number, category: string }> = {};
    
    dailyTransactions.forEach(t => {
      t.items?.forEach(item => {
        if (!map[item.id]) {
          map[item.id] = { code: item.sku, name: item.name, qty: 0, total: 0, category: item.category };
        }
        map[item.id].qty += item.quantity;
        map[item.id].total += (item.quantity * item.salePrice);
      });
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [dailyTransactions]);

  // Desempenho de Vendedores (Tabela Inferior Direita)
  const vendorPerformance = useMemo(() => {
    const perf: Record<string, { name: string, qtySales: number, qtyProds: number, total: number }> = {};
    
    dailyTransactions.forEach(t => {
      const vendor = users.find(u => u.id === t.vendorId);
      const vName = vendor?.name || 'Balcão/Geral';
      const vKey = t.vendorId || 'none';

      if (!perf[vKey]) {
        perf[vKey] = { name: vName, qtySales: 0, qtyProds: 0, total: 0 };
      }
      
      perf[vKey].qtySales += 1;
      perf[vKey].total += t.value;
      t.items?.forEach(item => perf[vKey].qtyProds += item.quantity);
    });

    return Object.values(perf).map(v => ({
      ...v,
      ticket: v.qtySales > 0 ? v.total / v.qtySales : 0,
      prodAvg: v.qtySales > 0 ? v.qtyProds / v.qtySales : 0
    })).sort((a, b) => b.total - a.total);
  }, [dailyTransactions, users]);

  // Gráfico por Hora (Simulado com base nas transações se tivessem timestamp, ou usando o ID se for timestamp)
  const hourlyData = useMemo(() => {
    // Como nossas transações guardam apenas a data 'YYYY-MM-DD', vamos simular a distribuição
    // Em um cenário real, usaríamos o campo de hora da transação.
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    return hours.map(h => {
      // Mock para visualização similar à imagem
      const val = dailyMetrics.totalSales > 0 ? (Math.random() * (dailyMetrics.totalSales / 2)) : 0;
      return { hour: h, value: val };
    });
  }, [dailyMetrics.totalSales]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-700 bg-[#f4f7f9] dark:bg-background-dark min-h-screen">
      
      {/* SEÇÃO SUPERIOR: RESUMO E GRÁFICO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RESUMO DIÁRIO (Esquerda) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Resumo de vendas diário</h4>
              <div className="flex gap-1">
                 <button className="px-3 py-1 bg-primary text-white text-[9px] font-black rounded-lg uppercase">Hoje</button>
                 <button className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 text-[9px] font-black rounded-lg uppercase">Ontem</button>
              </div>
           </div>
           <div className="p-6 space-y-8 flex-1">
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase">Total de vendas</p>
                 <h2 className="text-3xl font-black text-rose-600 tabular-nums">R$ {dailyMetrics.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Qtd. vendas</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{dailyMetrics.qtySales}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Qtd. produtos</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{dailyMetrics.qtyProducts.toLocaleString('pt-BR')}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Ticket médio</p>
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-black text-rose-600">R$ {dailyMetrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       <span>{getTicketEmoji(dailyMetrics.avgTicket)}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Produtos por venda</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">{dailyMetrics.prodsPerSale.toFixed(3)}</p>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                 <p className="text-[9px] font-bold text-slate-400 uppercase">Informações de: {lastUpdate.toLocaleDateString()} {lastUpdate.toLocaleTimeString()}</p>
                 <p className="text-[8px] text-primary font-black mt-1 animate-pulse">ATUALIZANDO EM TEMPO REAL (10s)</p>
              </div>
           </div>
        </div>

        {/* GRÁFICO DE VENDAS POR HORA (Direita) */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Vendas por hora</h4>
              <div className="flex gap-2">
                 <span className="material-symbols-outlined text-slate-300 text-lg cursor-pointer">ios_share</span>
                 <span className="material-symbols-outlined text-slate-300 text-lg cursor-pointer">fullscreen</span>
              </div>
           </div>
           <div className="p-6 flex-1">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                      formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Vendas']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#e11d48">
                      {hourlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 9 ? '#e11d48' : '#fecaca'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: TABELAS DE PRODUTOS E VENDEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PRODUTOS VENDIDOS (Esquerda) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Produtos vendidos</h4>
              <div className="flex gap-2">
                 <span className="material-symbols-outlined text-slate-300 text-sm">ios_share</span>
                 <span className="material-symbols-outlined text-slate-300 text-sm">grid_view</span>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black uppercase text-slate-400 border-b">
                       <th className="px-4 py-3">Código</th>
                       <th className="px-4 py-3">Produto</th>
                       <th className="px-4 py-3">UN</th>
                       <th className="px-4 py-3">Grupo</th>
                       <th className="px-4 py-3 text-center">Estoque Atual</th>
                       <th className="px-4 py-3 text-center">Qtd. Vend.</th>
                       <th className="px-4 py-3 text-right">Valor Total</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {soldProductsList.length > 0 ? soldProductsList.map((item, idx) => {
                       const prodDetail = products.find(p => p.sku === item.code);
                       const stock = prodDetail?.stock ?? 0;
                       return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                           <td className="px-4 py-3 text-[10px] font-mono text-slate-500">{item.code}</td>
                           <td className="px-4 py-3 text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 truncate max-w-[180px]">{item.name}</td>
                           <td className="px-4 py-3 text-[10px] font-bold text-slate-400">UN</td>
                           <td className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">{item.category}</td>
                           <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                 {stock < 0 && <span className="material-symbols-outlined text-amber-500 text-xs">error</span>}
                                 <span className={`text-[10px] font-black ${stock < 0 ? 'text-rose-500' : 'text-slate-500'}`}>{stock.toLocaleString('pt-BR', {minimumFractionDigits: 3})}</span>
                              </div>
                           </td>
                           <td className="px-4 py-3 text-center text-[10px] font-black text-slate-700 dark:text-slate-300">{item.qty.toLocaleString('pt-BR', {minimumFractionDigits: 3})}</td>
                           <td className="px-4 py-3 text-right text-[10px] font-black text-slate-900 dark:text-white">R$ {item.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        </tr>
                       )
                    }) : (
                      <tr><td colSpan={7} className="py-20 text-center opacity-20 uppercase font-black text-[10px]">Sem movimentações hoje</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* DESEMPENHO DE VENDEDORES (Direita) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Desempenho de vendedores</h4>
              <div className="flex gap-2">
                 <span className="material-symbols-outlined text-slate-300 text-sm">ios_share</span>
                 <span className="material-symbols-outlined text-slate-300 text-sm">grid_view</span>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black uppercase text-slate-400 border-b">
                       <th className="px-4 py-3">Vendedor</th>
                       <th className="px-4 py-3 text-center">Qtd. Vend.</th>
                       <th className="px-4 py-3 text-center">Prod/Vend</th>
                       <th className="px-4 py-3 text-right">Valor Total</th>
                       <th className="px-4 py-3 text-right">Ticket Méd.</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {vendorPerformance.length > 0 ? vendorPerformance.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                         <td className="px-4 py-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{v.name}</td>
                         <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500">{v.qtySales}</td>
                         <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500">{v.prodAvg.toFixed(2)}</td>
                         <td className="px-4 py-3 text-right text-[10px] font-black text-slate-700 dark:text-slate-200">R$ {v.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                         <td className="px-4 py-3 text-right text-[10px] font-black text-rose-600">R$ {v.ticket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="py-20 text-center opacity-20 uppercase font-black text-[10px]">Nenhuma venda atribuída</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

      </div>

      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark ::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>
    </div>
  );
};

export default Dashboard;
