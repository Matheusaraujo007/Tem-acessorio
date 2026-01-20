
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { ServiceOrder, ServiceOrderStatus, UserRole } from '../types';
import { useLocation } from 'react-router-dom';

const ServiceOrders: React.FC = () => {
  const { serviceOrders, updateServiceOrder, currentUser, customers, establishments } = useApp();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const initialTab = query.get('tab') === 'create' ? 'create' : 'list';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filterStatus, setFilterStatus] = useState<string>('TODAS');
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  const filteredOS = useMemo(() => {
    return serviceOrders.filter(os => {
      const matchesStore = isAdmin || os.store === currentStore?.name;
      const matchesStatus = filterStatus === 'TODAS' || os.status === filterStatus;
      return matchesStore && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [serviceOrders, filterStatus, isAdmin, currentStore]);

  const handleUpdateStatus = (os: ServiceOrder, newStatus: ServiceOrderStatus) => {
    updateServiceOrder({ ...os, status: newStatus });
    if (selectedOS?.id === os.id) setSelectedOS({ ...os, status: newStatus });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Gestão de Serviços</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Ordens de serviço e manutenção da unidade</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <button onClick={() => setActiveTab('list')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Visualizar Ordens</button>
           <button onClick={() => setActiveTab('create')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Nova Requisição</button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-6">
           <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
              {['TODAS', ...Object.values(ServiceOrderStatus)].map(s => (
                <button 
                  key={s} onClick={() => setFilterStatus(s)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase border-2 transition-all whitespace-nowrap ${filterStatus === s ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 text-slate-400'}`}
                >
                  {s}
                </button>
              ))}
           </div>

           <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredOS.map(os => (
                <div key={os.id} onClick={() => setSelectedOS(os)} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary transition-all cursor-pointer relative overflow-hidden">
                   <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase text-white ${os.status === ServiceOrderStatus.OPEN ? 'bg-amber-500' : os.status === ServiceOrderStatus.IN_PROGRESS ? 'bg-primary' : os.status === ServiceOrderStatus.FINISHED ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {os.status}
                   </div>
                   <div className="flex justify-between items-start mb-6">
                      <div>
                         <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none">{os.id}</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{os.date} • {os.store}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-black text-slate-400 uppercase">Total Estimado</p>
                         <p className="text-2xl font-black text-primary tabular-nums">R$ {os.totalValue.toLocaleString('pt-BR')}</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                         <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{os.customerName}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Serviço Solicitado</p>
                         <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase line-clamp-2">{os.description}</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] text-center border border-slate-200 dark:border-slate-800 space-y-8">
           <div className="size-24 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-5xl">point_of_sale</span></div>
           <h2 className="text-2xl font-black uppercase">Deseja criar uma nova ordem?</h2>
           <p className="text-slate-500 max-w-sm mx-auto font-bold text-sm uppercase">Para criar uma OS, utilize o Frente de Caixa (PDV), adicione os produtos/peças ao carrinho e clique no botão 'GERAR OS'.</p>
           <button onClick={() => window.location.hash = '#/pdv'} className="px-12 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">Ir para o PDV agora</button>
        </div>
      )}

      {/* MODAL DETALHADO DA OS */}
      {selectedOS && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[700px]">
              <div className="w-full md:w-[350px] bg-slate-50 dark:bg-slate-800/50 p-10 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                 <div className="space-y-8">
                    <button onClick={() => setSelectedOS(null)} className="text-slate-400 hover:text-rose-500 flex items-center gap-2 text-[10px] font-black uppercase"><span className="material-symbols-outlined text-lg">arrow_back</span> Voltar</button>
                    <div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Situação Atual</h4>
                       <div className={`px-6 py-3 rounded-2xl text-xs font-black uppercase text-white text-center shadow-lg ${selectedOS.status === ServiceOrderStatus.OPEN ? 'bg-amber-500 shadow-amber-500/20' : selectedOS.status === ServiceOrderStatus.IN_PROGRESS ? 'bg-primary shadow-primary/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}>
                          {selectedOS.status}
                       </div>
                    </div>
                    <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-slate-700">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alterar Status</p>
                       <div className="grid grid-cols-1 gap-2">
                          {Object.values(ServiceOrderStatus).map(s => (
                             <button key={s} onClick={() => handleUpdateStatus(selectedOS, s)} className="w-full py-3 bg-white dark:bg-slate-900 rounded-xl text-[9px] font-black uppercase border-2 border-transparent hover:border-primary transition-all shadow-sm">Mudar para {s}</button>
                          ))}
                       </div>
                    </div>
                 </div>
                 <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">print</span> Imprimir OS</button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                 <div className="flex justify-between items-start">
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase leading-none">{selectedOS.id}</h2>
                       <p className="text-xs font-bold text-slate-400 uppercase mt-2">Abertura em {selectedOS.date}</p>
                    </div>
                    <div className="text-right">
                       <h3 className="text-4xl font-black text-primary tabular-nums">R$ {selectedOS.totalValue.toLocaleString('pt-BR')}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Consolidado</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                       <p className="text-lg font-black text-slate-800 dark:text-white uppercase">{selectedOS.customerName}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnico Responsável</p>
                       <p className="text-lg font-black text-slate-800 dark:text-white uppercase">{selectedOS.technicianName || 'Não definido'}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Diagnóstico / Descrição</p>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase leading-relaxed">
                       {selectedOS.description}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Itens / Peças Utilizadas</p>
                    <div className="space-y-3">
                       {selectedOS.items.map(item => (
                         <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                            <div className="flex items-center gap-3">
                               <img src={item.image} className="size-10 rounded-lg object-cover" />
                               <div>
                                  <p className="text-xs font-black uppercase">{item.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold">{item.quantity}x • R$ {item.salePrice.toLocaleString('pt-BR')}</p>
                               </div>
                            </div>
                            <span className="text-sm font-black text-primary tabular-nums">R$ {(item.quantity * item.salePrice).toLocaleString('pt-BR')}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
