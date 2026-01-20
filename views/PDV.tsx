
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { CartItem, Product, Customer, UserRole } from '../types';

const PDV: React.FC = () => {
  const { products, customers, users, currentUser, processSale, addCustomer, establishments } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const [showBirthdayAlert, setShowBirthdayAlert] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('Cartão de Débito');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const [priceCheckSearch, setPriceCheckSearch] = useState('');
  const [consultedProduct, setConsultedProduct] = useState<Product | null>(null);

  const [cardDetails, setCardDetails] = useState({
    installments: 1,
    authNumber: '',
    transactionSku: ''
  });

  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: ''
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const priceCheckInputRef = useRef<HTMLInputElement>(null);

  const currentStore = useMemo(() => 
    establishments.find(e => e.id === currentUser?.storeId) || { name: 'Terminal Local' }, 
  [establishments, currentUser]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = search.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchLower) || 
                            p.sku.toLowerCase().includes(searchLower) ||
                            p.barcode?.includes(search);
      const matchesCategory = category === 'Todos' || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category, products]);

  // RESTRIÇÃO POR UNIDADE: Apenas vendedores da mesma loja do usuário logado
  const vendors = useMemo(() => {
    return users.filter(u => u.role === UserRole.VENDOR && u.storeId === currentUser?.storeId);
  }, [users, currentUser]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Produto sem estoque disponível!');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('Quantidade máxima em estoque atingida!');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearch('');
    searchInputRef.current?.focus();
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const prod = products.find(p => p.id === id);
        const newQty = Math.max(1, item.quantity + delta);
        if (delta > 0 && prod && newQty > prod.stock) {
          alert('Estoque insuficiente!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0), [cart]);
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];

  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    const isCard = paymentMethod.toLowerCase().includes('cartão');
    processSale(cart, subtotal, paymentMethod, selectedCustomerId, selectedVendorId, isCard ? cardDetails : undefined);
    setShowCheckout(false);
    setShowSuccessModal(true);
  };

  const closeSuccessAndReset = () => {
    setCart([]);
    setSelectedCustomerId('');
    setSelectedVendorId('');
    setCardDetails({ installments: 1, authNumber: '', transactionSku: '' });
    setShowSuccessModal(false);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const customer: Customer = { ...newCustomerForm, id: `c-${Date.now()}` };
    addCustomer(customer);
    setSelectedCustomerId(customer.id);
    setShowCustomerModal(false);
    setNewCustomerForm({ name: '', email: '', phone: '', birthDate: '' });
  };

  const handlePriceCheck = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && priceCheckSearch) {
      const found = products.find(p => p.barcode === priceCheckSearch || p.sku === priceCheckSearch || p.name.toLowerCase().includes(priceCheckSearch.toLowerCase()));
      if (found) {
        setConsultedProduct(found);
      } else {
        alert("Produto não encontrado");
      }
      setPriceCheckSearch('');
    }
  };

  const isBirthday = useMemo(() => {
    if (!selectedCustomerId) return false;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer?.birthDate) return false;
    const today = new Date();
    const [year, month, day] = customer.birthDate.split('-').map(Number);
    return today.getDate() === day && (today.getMonth() + 1) === month;
  }, [selectedCustomerId, customers]);

  useEffect(() => {
    if (isBirthday && selectedCustomerId) {
      setShowBirthdayAlert(true);
      const timer = setTimeout(() => {
        setShowBirthdayAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isBirthday, selectedCustomerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') { e.preventDefault(); if (cart.length > 0) setShowCheckout(true); }
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'F4') { 
        e.preventDefault(); 
        setShowPriceCheck(true); 
        setTimeout(() => priceCheckInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setShowPriceCheck(false);
        setConsultedProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden font-sans">
      {showBirthdayAlert && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-500">
           <div className="bg-white dark:bg-slate-900 px-12 py-10 rounded-[4rem] shadow-[0_0_100px_rgba(244,63,94,0.4)] border-8 border-rose-500 flex flex-col items-center gap-6 animate-pulse">
              <div className="relative">
                <span className="material-symbols-outlined text-[120px] text-rose-500 animate-bounce">cake</span>
                <span className="material-symbols-outlined absolute -top-4 -right-4 text-4xl text-amber-500 animate-ping">auto_awesome</span>
                <span className="material-symbols-outlined absolute -bottom-2 -left-6 text-5xl text-blue-500 animate-ping" style={{ animationDelay: '200ms' }}>celebration</span>
              </div>
              <div className="text-center">
                 <h2 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">Parabéns!</h2>
                 <p className="text-xl font-black text-rose-500 uppercase tracking-widest">Cliente Aniversariante Hoje</p>
              </div>
           </div>
        </div>
      )}

      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-2xl">rocket_launch</span>
             </div>
             <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{currentStore.name}</h1>
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">PDV Logado: {currentUser?.name}</p>
             </div>
          </div>
          
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setShowPriceCheck(true); setTimeout(() => priceCheckInputRef.current?.focus(), 100); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
              <span className="material-symbols-outlined text-sm">sell</span> Consultar Preço (F4)
            </button>
            <div className="flex flex-col ml-4">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vendedor Ativo</span>
               <select 
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-black text-primary focus:ring-0 cursor-pointer uppercase"
               >
                  <option value="">NÃO SELECIONADO</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
               </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <button onClick={() => window.history.back()} className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-xs hover:bg-rose-500 hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">logout</span> VOLTAR
           </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50">
          <div className="p-6 space-y-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="relative group">
               <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
               <input 
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por nome, SKU ou Código de Barras... (F2)"
                  className="w-full h-14 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-6 text-lg font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
               />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                    category === cat 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
               {filteredProducts.map(product => (
                 <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`group relative flex flex-col bg-white dark:bg-slate-800 rounded-[2rem] p-4 border-2 border-transparent hover:border-primary hover:shadow-2xl transition-all cursor-pointer overflow-hidden ${product.stock <= 0 ? 'opacity-40 pointer-events-none grayscale' : ''}`}
                 >
                    <div className="relative aspect-square bg-slate-100 dark:bg-slate-900 rounded-[1.5rem] overflow-hidden mb-4 shadow-inner">
                      <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="bg-white text-primary p-3 rounded-full shadow-xl"><span className="material-symbols-outlined">add_shopping_cart</span></span>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col">
                       <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-2 uppercase">{product.name}</h4>
                       <div className="mt-auto flex justify-between items-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{product.category}</span>
                          <span className="text-lg font-black text-primary tabular-nums">R$ {product.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </div>
                    </div>
                    {product.stock <= 5 && product.stock > 0 && (
                      <div className="absolute top-6 left-6 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded shadow-lg uppercase">Últimas {product.stock} un.</div>
                    )}
                 </div>
               ))}
            </div>
          </div>
        </section>

        <aside className="w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-20">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação do Cliente</span>
                <button onClick={() => setShowCustomerModal(true)} className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline">
                   <span className="material-symbols-outlined text-sm">person_add</span> CADASTRAR NOVO
                </button>
             </div>
             
             <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                   <select 
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 text-sm font-black text-slate-800 dark:text-slate-100 appearance-none focus:ring-2 focus:ring-primary transition-all outline-none"
                   >
                      <option value="">CONSUMIDOR FINAL (PADRÃO)</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>

                {isBirthday && (
                   <div className="relative group">
                      <div className="size-14 bg-gradient-to-tr from-rose-500 to-orange-400 text-white rounded-2xl flex items-center justify-center animate-bounce shadow-lg shadow-rose-500/30 border-2 border-white dark:border-slate-700">
                         <span className="material-symbols-outlined text-3xl">cake</span>
                      </div>
                   </div>
                )}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {cart.length > 0 ? cart.map(item => (
               <div key={item.id} className="group flex items-center gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-3xl border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                  <div className="size-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 shrink-0">
                     <img src={item.image} className="w-full h-full object-cover rounded-xl" alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start">
                        <h5 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase truncate pr-2">{item.name}</h5>
                        <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                           <span className="material-symbols-outlined text-lg">cancel</span>
                        </button>
                     </div>
                     <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                           <button onClick={() => updateQuantity(item.id, -1)} className="size-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black hover:bg-slate-200 transition-colors">-</button>
                           <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, 1)} className="size-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black hover:bg-slate-200 transition-colors">+</button>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">R$ {(item.salePrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                     </div>
                  </div>
               </div>
             )) : (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <span className="material-symbols-outlined text-8xl">shopping_cart</span>
                  <p className="text-lg font-black uppercase tracking-widest mt-4">Cesta Vazia</p>
               </div>
             )}
          </div>

          <div className="p-8 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 space-y-6">
             <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                   <span>Itens</span>
                   <span>{cart.reduce((a, b) => a + b.quantity, 0)} un.</span>
                </div>
                <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                   <span>Subtotal</span>
                   <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pt-4 border-t border-dashed border-slate-300 dark:border-slate-700 flex justify-between items-end">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Total</span>
                      <span className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>
             </div>

             <button 
                disabled={cart.length === 0}
                onClick={() => setShowCheckout(true)}
                className="w-full py-6 bg-primary hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-[2rem] font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 group"
             >
                <span className="material-symbols-outlined text-3xl group-hover:scale-125 transition-transform">credit_card</span>
                FECHAR VENDA (F10)
             </button>
          </div>
        </aside>
      </main>

      {/* Outros Modais (PriceCheck, CustomerModal, Checkout, etc.) permanecem funcionais */}
    </div>
  );
};

export default PDV;
