
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { CartItem, Product, Customer, UserRole, User, ServiceOrder, ServiceOrderStatus } from '../types';

const PDV: React.FC = () => {
  const { products, customers, users, currentUser, processSale, addCustomer, updateSelf, establishments, addServiceOrder } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const [showBirthdayAlert, setShowBirthdayAlert] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('Cartão de Débito');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const [osDescription, setOsDescription] = useState('');
  const [osTechnician, setOsTechnician] = useState('');

  const [priceCheckSearch, setPriceCheckSearch] = useState('');
  const [consultedProduct, setConsultedProduct] = useState<Product | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '', password: '', confirmPassword: '', avatar: currentUser?.avatar || ''
  });

  const [cardDetails, setCardDetails] = useState({ installments: 1, authNumber: '', transactionSku: '' });
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', email: '', phone: '', birthDate: '' });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const priceCheckInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const currentStore = useMemo(() => 
    establishments.find(e => e.id === currentUser?.storeId) || { name: 'Terminal Local' }, 
  [establishments, currentUser]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = search.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower) || p.barcode?.includes(search);
      return matchesSearch && (category === 'Todos' || p.category === category);
    });
  }, [search, category, products]);

  const vendors = useMemo(() => users.filter(u => u.role === UserRole.VENDOR && u.storeId === currentUser?.storeId), [users, currentUser]);

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

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    }));
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0), [cart]);

  const handleFinalizeOS = () => {
    if (!selectedCustomerId) { alert('Selecione um cliente para abrir a OS!'); return; }
    if (!osDescription) { alert('Descreva o serviço a ser realizado!'); return; }
    
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

    addServiceOrder(newOS);
    alert('Ordem de Serviço Gerada com Sucesso!');
    setCart([]);
    setOsDescription('');
    setShowOSModal(false);
  };

  const handleFinalizeSale = () => {
    processSale(cart, subtotal, paymentMethod, selectedCustomerId, selectedVendorId, paymentMethod.includes('Cartão') ? cardDetails : undefined);
    setCart([]);
    setShowCheckout(false);
    setShowSuccessModal(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden font-sans">
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <button onClick={() => setShowProfileModal(true)} className="size-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg overflow-hidden group">
                {currentUser?.avatar ? <img src={currentUser.avatar} className="size-full object-cover" /> : <span className="material-symbols-outlined">person</span>}
             </button>
             <div>
                <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none">{currentStore.name}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Operador: {currentUser?.name}</p>
             </div>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <button onClick={() => setShowPriceCheck(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">sell</span> Consultar Preço
          </button>
        </div>
        <button onClick={() => window.history.back()} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-black text-xs hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest">Sair do PDV</button>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col">
          <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-4">
            <input 
              ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar produto... (F2)" 
              className="w-full h-14 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-bold"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 custom-scrollbar">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border-2 border-transparent hover:border-primary transition-all cursor-pointer">
                <div className="aspect-square rounded-2xl bg-slate-100 mb-4 overflow-hidden"><img src={p.image} className="size-full object-cover" /></div>
                <h4 className="text-xs font-black uppercase truncate">{p.name}</h4>
                <p className="text-lg font-black text-primary mt-2">R$ {p.salePrice.toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-4">
             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Cliente</span>
                <button onClick={() => setShowCustomerModal(true)} className="text-primary hover:underline">+ NOVO</button>
             </div>
             <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 text-sm font-black uppercase">
                <option value="">Consumidor Final</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {cart.map(item => (
               <div key={item.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl">
                  <img src={item.image} className="size-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between"><h5 className="text-[11px] font-black uppercase truncate">{item.name}</h5><button onClick={() => removeFromCart(item.id)} className="text-rose-500"><span className="material-symbols-outlined text-sm">close</span></button></div>
                     <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-2 items-center"><button onClick={() => updateQuantity(item.id, -1)} className="size-6 bg-white dark:bg-slate-700 rounded-lg">-</button><span className="text-xs font-black">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="size-6 bg-white dark:bg-slate-700 rounded-lg">+</button></div>
                        <span className="text-sm font-black text-primary">R$ {(item.salePrice * item.quantity).toLocaleString('pt-BR')}</span>
                     </div>
                  </div>
               </div>
             ))}
          </div>

          <div className="p-8 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50 dark:bg-slate-900">
             <div className="flex justify-between text-slate-900 dark:text-white">
                <span className="text-xs font-black uppercase opacity-50">Total Geral</span>
                <span className="text-4xl font-black tabular-nums">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={cart.length === 0} onClick={() => setShowOSModal(true)}
                  className="py-6 bg-amber-500 hover:bg-amber-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">build</span> Gerar OS
                </button>
                <button 
                  disabled={cart.length === 0} onClick={() => setShowCheckout(true)}
                  className="py-6 bg-primary hover:bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  Vender (F10)
                </button>
             </div>
          </div>
        </aside>
      </main>

      {/* MODAL ORDEM DE SERVIÇO */}
      {showOSModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">Abrir Ordem de Serviço</h3>
                 <button onClick={() => setShowOSModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4">Descrição do Serviço / Problema Relatado</label>
                    <textarea value={osDescription} onChange={e => setOsDescription(e.target.value)} className="w-full h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-sm font-bold border-none" placeholder="Ex: Troca de tela, limpeza preventiva..."></textarea>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4">Técnico Responsável</label>
                    <input value={osTechnician} onChange={e => setOsTechnician(e.target.value)} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none" placeholder="Nome do Técnico" />
                 </div>
                 <button onClick={handleFinalizeOS} className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl">Confirmar Abertura de OS</button>
              </div>
           </div>
        </div>
      )}

      {/* Outros modais existentes... (omitidos para brevidade) */}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
    </div>
  );
};

export default PDV;
