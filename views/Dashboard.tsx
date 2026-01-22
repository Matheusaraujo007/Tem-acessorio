
import React, { useMemo, useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserRole, Transaction } from '../types';

const Dashboard: React.FC = () => {
  const { transactions, products, currentUser, establishments, users, refreshData } = useApp();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Auto-refresh a cada 10 segundos chamando a API real
  useEffect(() => {
    const timer = setInterval(() => {
      refreshData().then(() => setLastUpdate(new Date()));
    }, 10000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);
  const currentStoreName = currentStore?.name || '';
  const today = new Date().toISOString().split('T')[0];

  // FILTRO ESTRITAMENTE POR UNIDADE (ou Global para Admin)
  const dailyTransactions = useMemo(() => {
    return (transactions || []).filter(t => 
      t.date === today && 
      t.type === 'INCOME' && 
      (t.category === 'Venda' || t.category === 'Serviço') &&
      (isAdmin || t.store === currentStoreName)
    );
  }, [transactions, isAdmin, currentStoreName, today]);

  // Lógica de Reação/Emoji (Ticket Médio)
  const getReaction = (val: number) => {
    if (val === 0) return { emoji: '⚪', label: 'Sem Vendas' };
    if (val < 50) return { emoji: '😡', label: 'Crítico' };
    if (val < 100) return { emoji: '😟', label: 'Baixo' };
    if (val < 200) return { emoji: '🙂', label: 'Bom' };
    return { emoji: '🤩', label: 'Excelente' };
  };

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

  // Vendas por Hora
  const hourlyData = useMemo(() => {
    const hoursMap: Record<string, number> = {
      '08:00': 0, '09:00': 0, '10:00': 0, '11:00': 0, '12:00': 0, 
      '13:00': 0, '14:00': 0, '15:00': 0, '16:00': 0, '17:00': 0, '18:00': 0
    };

    dailyTransactions.forEach(t => {
      const parts = t.id.split('-');
      if (parts.length > 1) {
        const timestamp = parseInt(parts[1]);
        if (!isNaN(timestamp)) {
          const hour = new Date(timestamp).getHours();
          const hourKey = `${hour.toString().padStart(2, '0')}:00`;
          if (hoursMap[hourKey] !== undefined) {
            hoursMap[hourKey] += t.value;
          }
        }
      }
    });

    return Object.entries(hoursMap).map(([hour, value]) => ({ hour, value }));
  }, [dailyTransactions]);

  // Lista de Produtos Vendidos (Filtrado por Loja)
  const soldProductsList = useMemo(() => {
    const map: Record<string, any> = {};
    
    dailyTransactions.forEach(t => {
      t.items?.forEach(item => {
        if (!map[item.id]) {
          const original = products.find(p => p.id === item.id);
          map[item.id] = { 
            id: item.id, 
            code: item.sku, 
            name: item.name, 
            qty: 0, 
            total: 0, 
            group: item.category, 
            subgroup: item.brand || 'GERAL',
            stock: original?.stock || 0
          };
        }
        map[item.id].qty += item.quantity;
        map[item.id].total += (item.quantity * (item.salePrice || 0));
      });
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [dailyTransactions, products]);

  // Desempenho de Vendedores (Apenas da Unidade se não for Admin)
  const vendorPerformance = useMemo(() => {
    const perf: Record<string, any> = {};
    
    // Filtramos os usuários da mesma unidade primeiro
    const relevantUsers = users.filter(u => isAdmin || u.storeId === currentUser?.storeId);

    dailyTransactions.forEach(t => {
      const vendor = relevantUsers.find(u => u.id === t.vendorId);
      if (!vendor && !isAdmin) return; // Ignora vendas de outras lojas se vazar

      const vName = vendor?.name || 'Balcão/Geral';
      const vKey = t.vendorId || 'none';

      if (!perf[vKey]) {
        perf[vKey] = { name: vName, qtySales: 0, qtyProds: 0, total: 0 };
      }
      
      perf[vKey].qtySales += 1;
      perf[vKey].total += t.value;
      t.items?.forEach(item => perf[vKey].qtyProds += item.quantity);
    });

    return Object.values(perf).map(v => {
      const ticket = v.qtySales > 0 ? v.total / v.qtySales : 0;
      return {
        ...v,
        ticket,
        prodAvg: v.qtySales > 0 ? v.qtyProds / v.qtySales : 0,
        reaction: getReaction(ticket)
      };
    }).sort((a, b) => b.total - a.total);
  }, [dailyTransactions, users, isAdmin, currentUser]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-700 bg-[#f4f7f9] dark:bg-background-dark min-h-screen">
      
      {/* SEÇÃO SUPERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RESUMO DIÁRIO */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
           <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h4 className="text-[10px] font-black uppercase text-slate-500">
                {isAdmin ? 'Resumo Global' : `Unidade: ${currentStoreName}`}
              </h4>
              <div className="flex gap-1">
                 <button className="px-3 py-1 bg-primary text-white text-[9px] font-black rounded-lg uppercase">Hoje</button>
              </div>
           </div>
           
           <div className="p-6 space-y-8 flex-1">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Total de vendas</p>
                    <h2 className="text-3xl font-black text-rose-600 tabular-nums">R$ {dailyMetrics.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                    <div className="text-3xl">{getReaction(dailyMetrics.avgTicket).emoji}</div>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-6">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Qtd. vendas</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{dailyMetrics.qtySales}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Qtd. produtos</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{dailyMetrics.qtyProducts.toLocaleString('pt-BR')}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Ticket médio</p>
                    <p className="text-sm font-black text-rose-600 tabular-nums">R$ {dailyMetrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Ipv Médio</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{dailyMetrics.prodsPerSale.toFixed(2)}</p>
                 </div>
              </div>

              <div className="pt-6 mt-auto border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <p className="text-[9px] font-bold text-slate-400 uppercase">Sinc: {lastUpdate.toLocaleTimeString()}</p>
                 <span className="text-[8px] font-black text-emerald-500 uppercase animate-pulse">● Live Data</span>
              </div>
           </div>
        </div>

        {/* VENDAS POR HORA */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fluxo de Vendas (Hora em Hora)</h4>
              <div className="flex gap-2">
                 <span className="material-symbols-outlined text-slate-300 text-lg">timeline</span>
              </div>
           </div>
           <div className="p-6 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `R$ ${val}`} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#e11d48">
                    {hourlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#136dec' : '#f1f5f9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PRODUTOS VENDIDOS */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-[500px] flex flex-col">
           <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
              <h4 className="text-[10px] font-black uppercase text-slate-500">Ranking de Itens Vendidos</h4>
           </div>
           <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 border-b">
                    <tr className="text-[9px] font-black uppercase text-slate-400">
                       <th className="px-4 py-4">SKU</th>
                       <th className="px-4 py-4">Descrição</th>
                       <th className="px-4 py-4 text-center">Saídas</th>
                       <th className="px-4 py-4 text-right">Total Bruto</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {soldProductsList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[10px]">
                         <td className="px-4 py-4 font-mono text-primary font-bold">{item.code}</td>
                         <td className="px-4 py-4 font-black uppercase text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{item.name}</td>
                         <td className="px-4 py-4 text-center font-black text-slate-700 dark:text-slate-300 tabular-nums">{item.qty}</td>
                         <td className="px-4 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums">R$ {item.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* DESEMPENHO DE VENDEDORES */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-[500px] flex flex-col">
           <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
              <h4 className="text-[10px] font-black uppercase text-slate-500">Performance da Equipe</h4>
           </div>
           <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 border-b">
                    <tr className="text-[8px] font-black uppercase text-slate-400">
                       <th className="px-3 py-4">Vendedor</th>
                       <th className="px-2 py-4 text-center">Clima</th>
                       <th className="px-2 py-4 text-center">Vendas</th>
                       <th className="px-3 py-4 text-right">Total</th>
                       <th className="px-3 py-4 text-right">Ticket</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {vendorPerformance.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[9px]">
                         <td className="px-3 py-4 font-black uppercase text-slate-600 dark:text-slate-300 truncate max-w-[70px]">{v.name}</td>
                         <td className="px-2 py-4 text-center text-lg">{v.reaction.emoji}</td>
                         <td className="px-2 py-4 text-center text-slate-500 font-bold tabular-nums">{v.qtySales}</td>
                         <td className="px-3 py-4 text-right font-black text-slate-700 dark:text-slate-200 tabular-nums">R$ {v.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                         <td className="px-3 py-4 text-right font-black text-rose-600 tabular-nums">R$ {v.ticket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>
    </div>
  );
};

export default Dashboard;
