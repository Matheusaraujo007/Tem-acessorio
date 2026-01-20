
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { ServiceOrder, ServiceOrderStatus, UserRole, Product } from '../types';
import { useLocation } from 'react-router-dom';

const ServiceOrders: React.FC = () => {
  const { serviceOrders, updateServiceOrder, currentUser, products, addProduct, deleteProduct, establishments } = useApp();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const initialTab = query.get('tab') || 'list';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filterStatus, setFilterStatus] = useState<string>('TODAS');
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  
  // Estados para Gestão do Catálogo de Serviços
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState<Partial<Product>>({
    name: '', sku: '', category: 'Serviços', salePrice: 0, costPrice: 0, isService: true, stock: 999999
  });

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  // Filtra apenas o que é serviço no catálogo de produtos
  const servicesCatalog = useMemo(() => products.filter(p => p.isService), [products]);

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

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const serviceData: Product = {
      ...serviceForm as Product,
      id: serviceForm.id || `srv-${Date.now()}`,
      sku: serviceForm.sku || `SRV-${Date.now()}`,
      image: 'https://picsum.photos/seed/service/400/400',
      stock: 999999, // Serviços são infinitos
      isService: true
    };
    await addProduct(serviceData);
    setShowServiceModal(false);
    setServiceForm({ name: '', sku: '', category: 'Serviços', salePrice: 0, costPrice: 0, isService: true, stock: 999999 });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Gestão de Serviços</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Ordens de serviço e catálogo de mão de obra</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
           <TabNav active={activeTab === 'list'} onClick={() => setActiveTab('list')} label="Visualizar Ordens" />
           <TabNav active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="Catálogo de Serviços" />
           <TabNav active={activeTab === 'create'} onClick={() => setActiveTab('create')} label="Nova OS (PDV)" />
        </div>
      </div>

      {activeTab === 'list' && (
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
              {filteredOS.length > 0 ? filteredOS.map(os => (
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
              )) : (
                <div className="col-span-full py-20 text-center opacity-20 uppercase font-black text-xs tracking-widest">Nenhuma Ordem de Serviço encontrada</div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <div className="flex justify-between items-center px-4">
              <h3 className="text-xl font-black uppercase tracking-tight">Catálogo de Mão de Obra</h3>
              <button onClick={() => setShowServiceModal(true)} className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-all">
                <span className="material-symbols-outlined text-sm align-middle mr-2">add</span> Cadastrar Novo Serviço
              </button>
           </div>

           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Serviço</th>
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Ref / Código</th>
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Valor Mão de Obra</th>
                       <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {servicesCatalog.length > 0 ? servicesCatalog.map(srv => (
                      <tr key={srv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                         <td className="px-10 py-6">
                            <p className="text-sm font-black uppercase">{srv.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{srv.category}</p>
                         </td>
                         <td className="px-10 py-6">
                            <span className="text-[10px] font-mono text-slate-400 uppercase font-black">{srv.sku}</span>
                         </td>
                         <td className="px-10 py-6 text-right">
                            <p className="text-lg font-black text-amber-500 tabular-nums">R$ {srv.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         </td>
                         <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2">
                               <button onClick={() => { setServiceForm(srv); setShowServiceModal(true); }} className="size-10 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-all flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-lg">edit</span></button>
                               <button onClick={() => { if(confirm('Excluir este serviço?')) deleteProduct(srv.id)}} className="size-10 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center"><span className="material-symbols-outlined text-lg">delete</span></button>
                            </div>
                         </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="py-20 text-center opacity-20 uppercase font-black text-xs tracking-widest">Nenhum serviço cadastrado ainda</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] text-center border border-slate-200 dark:border-slate-800 space-y-8">
           <div className="size-24 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-5xl">point_of_sale</span></div>
           <h2 className="text-2xl font-black uppercase">Deseja criar uma nova ordem?</h2>
           <p className="text-slate-500 max-w-sm mx-auto font-bold text-sm uppercase">Para criar uma OS, utilize o Frente de Caixa (PDV), selecione o serviço cadastrado e as peças, e clique em 'GERAR OS'.</p>
           <button onClick={() => window.location.hash = '#/pdv'} className="px-12 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">Ir para o PDV agora</button>
        </div>
      )}

      {/* MODAL CADASTRO SERVIÇO */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-500 text-white">
                 <h3 className="text-2xl font-black uppercase">Cadastrar Serviço</h3>
                 <button onClick={() => setShowServiceModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <form onSubmit={handleSaveService} className="p-10 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Nome do Serviço (ex: Conserto de Tela)</label>
                    <input required value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500 uppercase" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Ref / Código</label>
                       <input value={serviceForm.sku} onChange={e => setServiceForm({...serviceForm, sku: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500" placeholder="Automático" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Categoria</label>
                       <input value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500 uppercase" />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Valor da Mão de Obra (R$)</label>
                    <input type="number" step="0.01" required value={serviceForm.salePrice} onChange={e => setServiceForm({...serviceForm, salePrice: parseFloat(e.target.value)})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-lg font-black text-amber-500 tabular-nums border-none outline-none focus:ring-2 focus:ring-amber-500" />
                 </div>
                 <button type="submit" className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">Salvar Serviço no Catálogo</button>
              </form>
           </div>
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
                               <div className={`size-10 rounded-lg flex items-center justify-center ${item.isService ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                  <span className="material-symbols-outlined text-sm">{item.isService ? 'build' : 'shopping_bag'}</span>
                               </div>
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

const TabNav: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick} 
    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
      active ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {label}
  </button>
);

export default ServiceOrders;
