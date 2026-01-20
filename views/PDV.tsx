
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { CartItem, Product, Customer, UserRole, User, ServiceOrder, ServiceOrderStatus } from '../types';

const PDV: React.FC = () => {
  const { products, customers, users, currentUser, processSale, establishments, addServiceOrder } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const [osDescription, setOsDescription] = useState('');
  const [osTechnician, setOsTechnician] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentStore = useMemo(() => 
    establishments.find(e => e.id === currentUser?.storeId) || { name: 'Terminal Local' }, 
  [establishments, currentUser]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = search.toLowerCase();
      return (p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower) || p.barcode?.includes(search)) && (category === 'Todos' || p.category === category);
    });
  }, [search, category, products]);

  const vendors = useMemo(() => users.filter(u => u.role === UserRole.VENDOR || u.role === UserRole.ADMIN), [users]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) { alert('Produto sem estoque!'); return; }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearch('');
    searchInputRef.current?.focus();
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0), [cart]);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    try {
      await processSale(cart, subtotal, paymentMethod, selectedCustomerId, selectedVendorId);
      setCart([]);
      setShowCheckout(false);
      setShowSuccessModal(true);
    } catch (e) {
      alert("Erro ao processar venda.");
    }
  };

  const handleFinalizeOS = async () => {
    if (!selectedCustomerId) { alert('Selecione um cliente para abrir a OS!'); return; }
    if (!osDescription) { alert('Descreva o serviço!'); return; }
    
    const customer = customers.find(c => c.id === selectedCustomerId);
    const newOS: ServiceOrder = {
      id: `OS-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Cliente Avulso',
      description: osDescription,
      status: ServiceOrderStatus.OPEN,
      items: cart,
      totalValue: subtotal,
      technicianName: osTechnician || currentUser?.name,
      store: currentStore.name
    };

    await addServiceOrder(newOS);
    setCart([]);
    setOsDescription('');
    setShowOSModal(false);
    alert('Ordem de Serviço Gerada!');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden font-display">
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="size-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined">person</span>
             </div>
             <div>
                <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none">{currentStore.name}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Operador: {currentUser?.name}</p>
             </div>
          </div>
        </div>
        <button onClick={() => window.history.back()} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest">Sair do PDV</button>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col">
          <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-4">
            <input 
              ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar produto ou bipe o código..." 
              className="w-full h-14 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-bold outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 custom-scrollbar">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border-2 border-transparent hover:border-primary transition-all cursor-pointer shadow-sm group">
                <div className="aspect-square rounded-2xl bg-slate-100 mb-4 overflow-hidden"><img src={p.image} className="size-full object-cover group-hover:scale-110 transition-transform" /></div>
                <h4 className="text-xs font-black uppercase truncate">{p.name}</h4>
                <p className="text-lg font-black text-primary mt-2">R$ {p.salePrice.toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
          <div className="p-6 space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Vendedor</label>
                <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-xs font-black uppercase">
                   <option value="">Selecione um Vendedor</option>
                   {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cliente</label>
                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-xs font-black uppercase">
                   <option value="">Consumidor Final</option>
                   {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-20"><span className="material-symbols-outlined text-6xl">shopping_basket</span><p className="text-xs font-black uppercase mt-2">Carrinho Vazio</p></div>
             ) : cart.map(item => (
               <div key={item.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl animate-in slide-in-from-right-4">
                  <img src={item.image} className="size-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                     <p className="text-[11px] font-black uppercase truncate">{item.name}</p>
                     <div className="flex justify-between items-center mt-2">
                        <span className="text-xs font-black tabular-nums">{item.quantity}x</span>
                        <span className="text-sm font-black text-primary">R$ {(item.salePrice * item.quantity).toLocaleString('pt-BR')}</span>
                     </div>
                  </div>
               </div>
             ))}
          </div>

          <div className="p-8 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50 dark:bg-slate-900">
             <div className="flex justify-between text-slate-900 dark:text-white">
                <span className="text-xs font-black uppercase opacity-50">Subtotal</span>
                <span className="text-4xl font-black tabular-nums">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={cart.length === 0} onClick={() => setShowOSModal(true)}
                  className="py-6 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">build</span> Gerar OS
                </button>
                <button 
                  disabled={cart.length === 0} onClick={() => setShowCheckout(true)}
                  className="py-6 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">payments</span> Vender
                </button>
             </div>
          </div>
        </aside>
      </main>

      {/* MODAL CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">Finalizar Venda</h3>
                 <button onClick={() => setShowCheckout(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    {['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} className={`p-6 rounded-2xl border-2 transition-all text-[10px] font-black uppercase text-center ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>{m}</button>
                    ))}
                 </div>
                 <div className="text-center">
                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Total a Receber</p>
                    <p className="text-5xl font-black text-primary">R$ {subtotal.toLocaleString('pt-BR')}</p>
                 </div>
                 <button onClick={handleFinalizeSale} className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95">Concluir Pagamento</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL ORDEM DE SERVIÇO */}
      {showOSModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">Abrir OS</h3>
                 <button onClick={() => setShowOSModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4">Descrição do Serviço</label>
                    <textarea value={osDescription} onChange={e => setOsDescription(e.target.value)} className="w-full h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500" placeholder="O que precisa ser feito?"></textarea>
                 </div>
                 <button onClick={handleFinalizeOS} className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl">Confirmar OS</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL SUCESSO */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-emerald-500 animate-in fade-in duration-300">
           <div className="text-center text-white space-y-6">
              <span className="material-symbols-outlined text-[120px] animate-bounce">check_circle</span>
              <h2 className="text-4xl font-black uppercase">Venda Finalizada!</h2>
              <button onClick={() => setShowSuccessModal(false)} className="px-12 py-5 bg-white text-emerald-600 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl">Nova Venda</button>
           </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
    </div>
  );
};

export default PDV;
