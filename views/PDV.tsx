
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { CartItem, Product, Customer, UserRole, User, ServiceOrder, ServiceOrderStatus, Establishment, TransactionStatus } from '../types';

const PDV: React.FC = () => {
  const { products, customers, users, currentUser, processSale, establishments, addServiceOrder, addCustomer, addEstablishment, addUser, transactions, addTransaction, systemConfig, addProduct } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  
  // Modais e Menus
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [showStockInquiry, setShowStockInquiry] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTerminalMenu, setShowTerminalMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [successType, setSuccessType] = useState<'SALE' | 'OS' | 'RETURN'>('SALE');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Novos campos
  const [shippingValue, setShippingValue] = useState(0);
  const [osDescription, setOsDescription] = useState('');
  const [osTechnician, setOsTechnician] = useState('');

  // Estados Troca/Devolução
  const [returnSearchCustomer, setReturnSearchCustomer] = useState('');
  const [selectedReturnCustomer, setSelectedReturnCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);

  // Form de novo cliente (PDV Rápido)
  const initialCustomerForm: Omit<Customer, 'id'> = { 
    name: '', phone: '', email: '', birthDate: new Date().toISOString().split('T')[0],
    cpfCnpj: '', zipCode: '', address: '', number: '', neighborhood: '', city: '', state: ''
  };
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [customerModalTab, setCustomerModalTab] = useState<'basic' | 'address'>('basic');

  // Form de nova senha
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentStore = useMemo(() => 
    establishments.find(e => e.id === currentUser?.storeId) || { id: 'default', name: 'Terminal Local' } as Establishment, 
  [establishments, currentUser]);

  const categories = useMemo(() => {
     return ['Todos', 'Serviços', ...Array.from(new Set(products.filter(p => !p.isService).map(p => p.category)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = search.toLowerCase();
      const matchesSearch = (p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower) || p.barcode?.includes(search));
      let matchesCategory = true;
      if (category === 'Serviços') matchesCategory = !!p.isService;
      else if (category !== 'Todos') matchesCategory = p.category === category && !p.isService;
      return matchesSearch && matchesCategory;
    });
  }, [search, category, products]);

  const vendors = useMemo(() => users.filter(u => u.role === UserRole.VENDOR || u.role === UserRole.ADMIN), [users]);

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTerminalMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addToCart = (product: Product) => {
    if (!product.isService && product.stock <= 0) { alert('Produto sem estoque!'); return; }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearch('');
    searchInputRef.current?.focus();
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0), [cart]);
  const totalGeral = useMemo(() => subtotal + (Number(shippingValue) || 0), [subtotal, shippingValue]);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    try {
      await processSale(cart, totalGeral, paymentMethod, selectedCustomerId, selectedVendorId, shippingValue);
      setCart([]);
      setShippingValue(0);
      setSuccessType('SALE');
      setShowCheckout(false);
      setShowSuccessModal(true);
    } catch (e) {
      alert("Erro ao processar venda.");
    }
  };

  const handleFinalizeOS = async () => {
    if (!selectedCustomerId) { alert('Selecione um cliente para abrir a OS!'); return; }
    if (!osDescription.trim()) { alert('Descreva o defeito ou serviço a ser realizado!'); return; }
    
    const customer = customers.find(c => c.id === selectedCustomerId);
    const newOS: ServiceOrder = {
      id: `OS-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Cliente Avulso',
      description: osDescription,
      status: ServiceOrderStatus.OPEN,
      items: cart,
      totalValue: totalGeral,
      technicianName: osTechnician || currentUser?.name,
      store: currentStore.name
    };

    try {
      await addServiceOrder(newOS);
      setCart([]);
      setOsDescription('');
      setShippingValue(0);
      setSuccessType('OS');
      setShowOSModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      alert("Erro ao gerar Ordem de Serviço.");
    }
  };

  // Lógica de Devolução
  useEffect(() => {
    if (selectedReturnCustomer) {
      const sales = transactions.filter(t => t.clientId === selectedReturnCustomer.id && t.type === 'INCOME' && t.category === 'Venda');
      setCustomerSales(sales);
    } else {
      setCustomerSales([]);
    }
  }, [selectedReturnCustomer, transactions]);

  const handleProcessReturn = async (sale: any, item: CartItem) => {
    const saleDate = new Date(sale.date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - saleDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > systemConfig.returnPeriodDays) {
       alert(`PRAZO DE TROCA ULTRAPASSADO!\n\nEsta compra foi realizada há ${diffDays} dias.\nO limite configurado é de ${systemConfig.returnPeriodDays} dias.`);
       return;
    }

    if (confirm(`Confirmar devolução de 1 unidade de "${item.name}"? O item retornará ao estoque.`)) {
       // 1. Atualizar estoque
       const product = products.find(p => p.id === item.id);
       if (product) {
         await addProduct({ ...product, stock: product.stock + 1 });
       }

       // 2. Gerar transação de saída (estorno)
       await addTransaction({
         id: `RET-${Date.now()}`,
         date: today.toISOString().split('T')[0],
         description: `Devolução: ${item.name} (Ref: ${sale.id})`,
         store: currentStore.name,
         category: 'Devolução',
         status: TransactionStatus.PAID,
         value: item.salePrice,
         type: 'EXPENSE',
         client: selectedReturnCustomer?.name,
         clientId: selectedReturnCustomer?.id
       });

       setSuccessType('RETURN');
       setShowReturnsModal(false);
       setShowSuccessModal(true);
    }
  };

  const handleQuickCustomerAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `c-${Date.now()}`;
    await addCustomer({ ...customerForm, id });
    setSelectedCustomerId(id);
    setShowCustomerModal(false);
    setCustomerForm(initialCustomerForm);
    setCustomerModalTab('basic');
  };

  const handleTerminalLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await addEstablishment({ ...currentStore, logoUrl: base64 });
        setShowTerminalMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPass !== confirmPass) { alert("As senhas não conferem!"); return; }
    if (newPass.length < 4) { alert("A senha deve ter pelo menos 4 caracteres!"); return; }

    try {
      await addUser({ ...currentUser, password: newPass });
      alert("Senha atualizada com sucesso!");
      setShowPasswordModal(false);
      setNewPass('');
      setConfirmPass('');
    } catch (error) {
      alert("Erro ao atualizar senha.");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden font-display">
      {/* HEADER PDV */}
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 relative" ref={menuRef}>
             <div 
               onClick={() => setShowTerminalMenu(!showTerminalMenu)}
               className="size-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg overflow-hidden cursor-pointer group relative hover:scale-105 transition-all"
             >
                {currentStore.logoUrl ? (
                  <img src={currentStore.logoUrl} className="size-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined">point_of_sale</span>
                )}
             </div>

             {/* MENU SUSPENSO DO TERMINAL */}
             {showTerminalMenu && (
               <div className="absolute top-14 left-0 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-3 z-[100] animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opções do Terminal</p>
                  </div>
                  <button 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left uppercase"
                  >
                    <span className="material-symbols-outlined text-lg text-primary">add_a_photo</span>
                    Alterar Logotipo
                  </button>
                  <button 
                    onClick={() => { setShowPasswordModal(true); setShowTerminalMenu(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left uppercase"
                  >
                    <span className="material-symbols-outlined text-lg text-amber-500">lock_reset</span>
                    Alterar Minha Senha
                  </button>
               </div>
             )}

             <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleTerminalLogoChange} />
             <div>
                <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none">{currentStore.name}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Terminal Frente de Caixa</p>
             </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <div className="flex gap-2">
             {categories.map(cat => (
               <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${category === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{cat}</button>
             ))}
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setShowReturnsModal(true)} className="px-6 py-2.5 bg-amber-500/10 text-amber-600 rounded-xl font-black text-xs hover:bg-amber-500 hover:text-white transition-all uppercase flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">history</span> Trocas / Devolução
           </button>
           <button onClick={() => setShowStockInquiry(true)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs hover:bg-primary hover:text-white transition-all uppercase flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">inventory_2</span> Consulta Estoque
           </button>
           <button onClick={() => window.history.back()} className="px-6 py-2.5 bg-rose-500 text-white rounded-xl font-black text-xs hover:bg-rose-600 transition-all uppercase tracking-widest">Sair</button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* LADO ESQUERDO: LISTA DE PRODUTOS */}
        <section className="flex-1 flex flex-col">
          <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
               <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
               <input 
                 ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Bipar Código de Barras ou digitar nome do produto..." 
                 className="w-full h-16 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-16 pr-6 text-xl font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
               />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 custom-scrollbar">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border-2 border-transparent hover:border-primary transition-all cursor-pointer shadow-sm group relative overflow-hidden">
                <div className={`aspect-square rounded-2xl mb-4 overflow-hidden flex items-center justify-center ${p.isService ? 'bg-amber-500/10' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {p.isService ? (
                    <span className="material-symbols-outlined text-6xl text-amber-500">build</span>
                  ) : (
                    <img src={p.image} className="size-full object-cover group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div>
                   <h4 className="text-xs font-black uppercase truncate">{p.name}</h4>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.isService ? 'Mão de Obra' : p.category}</p>
                </div>
                <div className="mt-3 flex justify-between items-end">
                   <p className="text-lg font-black text-primary">R$ {p.salePrice.toLocaleString('pt-BR')}</p>
                   {!p.isService && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${p.stock <= 5 ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{p.stock} un</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LADO DIREITO: CARRINHO E CHECKOUT */}
        <aside className="w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl relative">
          <div className="p-6 space-y-4 border-b border-slate-100 dark:border-slate-800">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Vendedor</label>
                   <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-[10px] font-black uppercase">
                      <option value="">Selecione Vendedor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                   </select>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center px-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                      <button onClick={() => setShowCustomerModal(true)} className="text-[9px] font-black text-primary uppercase hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">person_add</span> Novo
                      </button>
                   </div>
                   <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-[10px] font-black uppercase">
                      <option value="">Consumidor Final</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-20"><span className="material-symbols-outlined text-7xl">shopping_cart</span><p className="text-xs font-black uppercase mt-4">Carrinho Vazio</p></div>
             ) : cart.map(item => (
               <div key={item.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-transparent hover:border-primary/20 transition-all group">
                  <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${item.isService ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                    <span className="material-symbols-outlined">{item.isService ? 'build' : 'shopping_bag'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-black uppercase truncate leading-none">{item.name}</p>
                     <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">UN: R$ {item.salePrice.toLocaleString('pt-BR')}</p>
                     <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-3">
                           <button onClick={() => removeFromCart(item.id)} className="size-6 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-sm">remove</span></button>
                           <span className="text-xs font-black tabular-nums">{item.quantity}</span>
                           <button onClick={() => addToCart(item)} className="size-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">add</span></button>
                        </div>
                        <span className="text-sm font-black text-primary">R$ {(item.salePrice * item.quantity).toLocaleString('pt-BR')}</span>
                     </div>
                  </div>
               </div>
             ))}
          </div>

          <div className="p-8 border-t-2 border-slate-100 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
             <div className="space-y-2">
                <div className="flex justify-between text-slate-500">
                   <span className="text-[10px] font-black uppercase">Subtotal Itens</span>
                   <span className="text-sm font-black tabular-nums">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                   <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-slate-400">local_shipping</span>
                      <span className="text-[10px] font-black uppercase text-slate-400">Taxa de Frete</span>
                   </div>
                   <input 
                     type="number" step="0.01" 
                     value={shippingValue} onChange={e => setShippingValue(parseFloat(e.target.value) || 0)}
                     className="bg-transparent border-none text-right text-xs font-black text-slate-900 dark:text-white w-24 p-0 focus:ring-0" 
                     placeholder="0,00"
                   />
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                   <span className="text-xs font-black uppercase opacity-50">Total Geral</span>
                   <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  disabled={cart.length === 0} onClick={() => { if(!selectedCustomerId) { alert('Selecione um cliente!'); return; } setShowOSModal(true); }}
                  className="py-5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">build</span> Gerar OS
                </button>
                <button 
                  disabled={cart.length === 0} onClick={() => setShowCheckout(true)}
                  className="py-5 bg-primary hover:bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">payments</span> Fechar Venda
                </button>
             </div>
          </div>
        </aside>
      </main>

      {/* MODAL TROCAS E DEVOLUÇÃO */}
      {showReturnsModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[650px]">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-3xl">history</span>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">Trocas e Devoluções</h3>
                      <p className="text-[10px] font-black text-amber-100 uppercase mt-1">Limite atual para troca: {systemConfig.returnPeriodDays} dias</p>
                    </div>
                 </div>
                 <button onClick={() => setShowReturnsModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                 <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">person_search</span>
                    <input 
                      placeholder="Busque o cliente pelo nome..." 
                      value={returnSearchCustomer}
                      onChange={e => setReturnSearchCustomer(e.target.value)}
                      className="w-full h-14 bg-white dark:bg-slate-900 border-none rounded-2xl pl-12 pr-6 text-sm font-bold shadow-sm"
                    />
                    {returnSearchCustomer && !selectedReturnCustomer && (
                       <div className="absolute top-16 left-0 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                          {customers.filter(c => c.name.toLowerCase().includes(returnSearchCustomer.toLowerCase())).map(c => (
                            <button key={c.id} onClick={() => { setSelectedReturnCustomer(c); setReturnSearchCustomer(c.name); }} className="w-full px-6 py-4 text-left text-xs font-black uppercase hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-50 dark:border-slate-700 last:border-none">{c.name}</button>
                          ))}
                       </div>
                    )}
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                 {selectedReturnCustomer ? (
                    customerSales.length > 0 ? (
                      customerSales.map(sale => (
                        <div key={sale.id} className="space-y-3 bg-white dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                           <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-4">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cupom de Venda</p>
                                 <h4 className="text-sm font-black text-primary uppercase">{sale.id} • {sale.date}</h4>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                 <p className="text-sm font-black text-slate-900 dark:text-white">R$ {sale.value.toLocaleString('pt-BR')}</p>
                              </div>
                           </div>
                           <div className="space-y-2 pt-2">
                              {sale.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                   <div className="flex items-center gap-3">
                                      <span className="material-symbols-outlined text-slate-400 text-sm">shopping_bag</span>
                                      <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{item.name}</p>
                                   </div>
                                   <button 
                                     onClick={() => handleProcessReturn(sale, item)}
                                     className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                   >
                                     Devolver Item
                                   </button>
                                </div>
                              ))}
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                         <span className="material-symbols-outlined text-7xl">search_off</span>
                         <p className="text-xs font-black uppercase mt-4 text-center">Nenhuma venda encontrada para este cliente</p>
                      </div>
                    )
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                       <span className="material-symbols-outlined text-7xl">person</span>
                       <p className="text-xs font-black uppercase mt-4 text-center">Selecione um cliente para buscar compras recentes</p>
                    </div>
                 )}
              </div>
              
              {selectedReturnCustomer && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 shrink-0">
                   <button onClick={() => { setSelectedReturnCustomer(null); setReturnSearchCustomer(''); }} className="text-[10px] font-black text-slate-400 uppercase hover:text-rose-500 transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">arrow_back</span> Limpar seleção de cliente
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* MODAL ALTERAR SENHA */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-3xl">lock_reset</span>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Alterar Senha</h3>
                 </div>
                 <button onClick={() => setShowPasswordModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleUpdatePassword} className="p-10 space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nova Senha</label>
                    <input type="password" required autoFocus value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none" placeholder="••••••••" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Confirmar Nova Senha</label>
                    <input type="password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none" placeholder="••••••••" />
                 </div>
                 <button type="submit" className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20">Atualizar Senha Agora</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL CADASTRO RÁPIDO CLIENTE */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-primary text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-3xl">person_add</span>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Cadastro Rápido</h3>
                 </div>
                 <button onClick={() => setShowCustomerModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              
              <div className="flex bg-slate-50 dark:bg-slate-800 p-1">
                 <button onClick={() => setCustomerModalTab('basic')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${customerModalTab === 'basic' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-400'}`}>Básico</button>
                 <button onClick={() => setCustomerModalTab('address')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${customerModalTab === 'address' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-400'}`}>Endereço</button>
              </div>

              <form onSubmit={handleQuickCustomerAdd} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                 {customerModalTab === 'basic' ? (
                   <div className="space-y-4 animate-in slide-in-from-left-4 duration-200">
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Nome / Razão Social</label>
                         <input autoFocus required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">CPF/CNPJ</label>
                            <input value={customerForm.cpfCnpj} onChange={e => setCustomerForm({...customerForm, cpfCnpj: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">WhatsApp</label>
                            <input required value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                         </div>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">E-mail</label>
                         <input type="email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">CEP</label>
                            <input value={customerForm.zipCode} onChange={e => setCustomerForm({...customerForm, zipCode: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Número</label>
                            <input value={customerForm.number} onChange={e => setCustomerForm({...customerForm, number: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                         </div>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Endereço</label>
                         <input value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Cidade</label>
                            <input value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Estado (UF)</label>
                            <input value={customerForm.state} onChange={e => setCustomerForm({...customerForm, state: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" />
                         </div>
                      </div>
                   </div>
                 )}
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 mt-4 active:scale-95 transition-all">
                    FINALIZAR CADASTRO
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL CONSULTA DE ESTOQUE */}
      {showStockInquiry && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-primary text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Consulta Rápida de Estoque</h3>
                 </div>
                 <button onClick={() => setShowStockInquiry(false)} className="size-10 hover:bg-white/20 rounded-xl"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                 <input 
                   autoFocus
                   placeholder="Digite o nome ou bipe o código..." 
                   className="w-full h-14 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 text-sm font-bold shadow-sm"
                   onChange={e => setSearch(e.target.value)}
                 />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                 {products.filter(p => !p.isService && (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search))).map(p => (
                   <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                         <img src={p.image} className="size-12 rounded-xl object-cover" />
                         <div>
                            <p className="text-xs font-black uppercase truncate">{p.name}</p>
                            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{p.sku} | {p.location || 'Sem loc.'}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={`text-xl font-black tabular-nums ${p.stock <= 5 ? 'text-rose-500' : 'text-primary'}`}>{p.stock} <span className="text-[10px]">un</span></p>
                         <p className="text-[9px] font-black text-slate-400 uppercase">Disponível</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* MODAL CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Finalizar Pagamento</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Selecione o método de recebimento</p>
                 </div>
                 <button onClick={() => setShowCheckout(false)} className="size-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-2 gap-4">
                    {['Dinheiro', 'Pix', 'Debito', 'Credito'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-primary/50'}`}>
                        <span className="material-symbols-outlined text-3xl">
                           {m === 'Dinheiro' ? 'payments' : m === 'Pix' ? 'qr_code_2' : 'credit_card'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                      </button>
                    ))}
                 </div>
                 <div className="text-center bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Consolidado com Frete</p>
                    <p className="text-5xl font-black text-primary tabular-nums">R$ {totalGeral.toLocaleString('pt-BR')}</p>
                 </div>
                 <button onClick={handleFinalizeSale} className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4">
                    <span className="material-symbols-outlined text-2xl">check_circle</span> CONCLUIR E EMITIR RECIBO
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL ORDEM DE SERVIÇO */}
      {showOSModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Gerar Ordem de Serviço</h3>
                    <p className="text-[10px] font-black text-amber-100 uppercase mt-1">Protocolo de entrada de assistência</p>
                 </div>
                 <button onClick={() => setShowOSModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Diagnóstico Técnico / Defeito</label>
                    <textarea 
                      required
                      value={osDescription} 
                      onChange={e => setOsDescription(e.target.value)} 
                      className="w-full h-40 bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-amber-500/10 uppercase" 
                      placeholder="Ex: Celular não liga, tela quebrada após queda..."
                    ></textarea>
                 </div>
                 <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-dashed border-amber-200 dark:border-amber-800/50 flex justify-between items-center">
                    <span className="text-xs font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest">Total da OS</span>
                    <span className="text-2xl font-black text-amber-600 tabular-nums">R$ {totalGeral.toLocaleString('pt-BR')}</span>
                 </div>
                 <button onClick={handleFinalizeOS} className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">Confirmar Abertura</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL SUCESSO */}
      {showSuccessModal && (
        <div className={`fixed inset-0 z-[500] flex items-center justify-center animate-in fade-in duration-300 ${successType === 'OS' ? 'bg-amber-500' : successType === 'RETURN' ? 'bg-amber-600' : 'bg-emerald-500'}`}>
           <div className="text-center text-white space-y-8 animate-in zoom-in-50 duration-500">
              <span className="material-symbols-outlined text-[160px] animate-bounce">
                {successType === 'OS' ? 'build' : successType === 'RETURN' ? 'assignment_return' : 'check_circle'}
              </span>
              <div className="space-y-2">
                 <h2 className="text-5xl font-black uppercase tracking-tighter">
                   {successType === 'OS' ? 'Ordem Gerada!' : successType === 'RETURN' ? 'Devolução Concluída!' : 'Venda Concluída!'}
                 </h2>
                 <p className="text-xl font-bold uppercase opacity-60">Operação processada com sucesso no sistema.</p>
              </div>
              <button onClick={() => setShowSuccessModal(false)} className="px-16 py-6 bg-white text-slate-900 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95">
                Continuar Operando
              </button>
           </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
    </div>
  );
};

export default PDV;
