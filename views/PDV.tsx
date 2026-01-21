
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { CartItem, Product, Customer, UserRole, User, ServiceOrder, ServiceOrderStatus, Establishment, TransactionStatus, Transaction } from '../types';

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTerminalMenu, setShowTerminalMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [successType, setSuccessType] = useState<'SALE' | 'OS' | 'RETURN' | 'CANCEL'>('SALE');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // Novos campos
  const [shippingValue, setShippingValue] = useState(0);
  const [osDescription, setOsDescription] = useState('');
  const [osTechnician, setOsTechnician] = useState('');

  // Estados Troca/Devolução/Cancelamento
  const [returnSearchCustomer, setReturnSearchCustomer] = useState('');
  const [cancelSearchId, setCancelSearchId] = useState('');
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
      const saleId = `SALE-${Date.now()}`;
      const vendor = vendors.find(v => v.id === selectedVendorId);
      const customer = customers.find(c => c.id === selectedCustomerId);
      
      setLastSaleData({
        id: saleId,
        items: [...cart],
        subtotal,
        shipping: shippingValue,
        total: totalGeral,
        payment: paymentMethod,
        date: new Date().toLocaleString('pt-BR'),
        vendor: vendor?.name || 'Não inf.',
        customer: customer?.name || 'Consumidor Final'
      });

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

  const printReceipt = () => {
    window.print();
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
       const product = products.find(p => p.id === item.id);
       if (product) {
         await addProduct({ ...product, stock: product.stock + 1 });
       }
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

  // Lógica de Cancelamento de Venda
  const handleCancelSale = async (sale: Transaction) => {
    if (confirm(`DESEJA REALMENTE CANCELAR A VENDA ${sale.id}?\n\nOs itens retornarão ao estoque e o valor de R$ ${sale.value.toLocaleString('pt-BR')} será estornado do caixa como uma despesa de cancelamento.`)) {
      try {
        // Estornar Estoque
        if (sale.items) {
          for (const item of sale.items) {
            const product = products.find(p => p.id === item.id);
            if (product && !product.isService) {
              await addProduct({ ...product, stock: product.stock + item.quantity });
            }
          }
        }

        // Criar transação de estorno (Saída)
        await addTransaction({
          id: `CANCEL-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          description: `Estorno de Cancelamento (Ref: ${sale.id})`,
          store: currentStore.name,
          category: 'Cancelamento',
          status: TransactionStatus.PAID,
          value: sale.value,
          type: 'EXPENSE',
          client: sale.client,
          clientId: sale.clientId,
          vendorId: sale.vendorId
        });

        setSuccessType('CANCEL');
        setShowCancelModal(false);
        setCancelSearchId('');
        setShowSuccessModal(true);
      } catch (error) {
        alert("Erro ao processar cancelamento.");
      }
    }
  };

  const todaySales = useMemo(() => {
    return transactions.filter(t => 
      t.type === 'INCOME' && 
      t.category === 'Venda' && 
      (t.id.toLowerCase().includes(cancelSearchId.toLowerCase()) || (t.client && t.client.toLowerCase().includes(cancelSearchId.toLowerCase())))
    ).slice(0, 20);
  }, [transactions, cancelSearchId]);

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
      {/* COMPONENTE DE IMPRESSÃO (ESCONDIDO NA TELA) */}
      <div id="receipt-print" className="hidden print:block p-4 text-slate-900 bg-white w-[80mm] font-mono text-[10px]">
         <div className="text-center mb-4">
            <h2 className="text-sm font-bold uppercase">{currentStore.name}</h2>
            <p>{currentStore.location}</p>
            <p>CNPJ: {currentStore.cnpj}</p>
            <div className="border-b border-dashed border-slate-300 my-2"></div>
            <h3 className="font-bold uppercase">Recibo de Venda</h3>
            <p>#{lastSaleData?.id}</p>
         </div>
         <div className="space-y-1">
            <p>DATA: {lastSaleData?.date}</p>
            <p>VEND: {lastSaleData?.vendor}</p>
            <p>CLI: {lastSaleData?.customer}</p>
            <div className="border-b border-dashed border-slate-300 my-2"></div>
            <div className="flex justify-between font-bold">
               <span>DESCRIÇÃO</span>
               <span>TOTAL</span>
            </div>
            {lastSaleData?.items.map((item: any, i: number) => (
               <div key={i} className="flex justify-between">
                  <span>{item.quantity}x {item.name.substring(0, 15)}</span>
                  <span>R$ {(item.quantity * item.salePrice).toFixed(2)}</span>
               </div>
            ))}
            <div className="border-b border-dashed border-slate-300 my-2"></div>
            <div className="flex justify-between"><span>SUBTOTAL:</span><span>R$ {lastSaleData?.subtotal.toFixed(2)}</span></div>
            {lastSaleData?.shipping > 0 && <div className="flex justify-between"><span>FRETE:</span><span>R$ {lastSaleData?.shipping.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-sm"><span>TOTAL GERAL:</span><span>R$ {lastSaleData?.total.toFixed(2)}</span></div>
            <p className="mt-2 uppercase">PAGAMENTO: {lastSaleData?.payment}</p>
            <div className="border-b border-dashed border-slate-300 my-2"></div>
            <p className="text-center mt-4">OBRIGADO PELA PREFERÊNCIA!</p>
            <p className="text-center text-[8px] opacity-50">Retail Cloud ERP - Recibo não fiscal</p>
         </div>
      </div>

      {/* HEADER PDV */}
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 relative" ref={menuRef}>
             <div onClick={() => setShowTerminalMenu(!showTerminalMenu)} className="size-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg overflow-hidden cursor-pointer group relative hover:scale-105 transition-all">
                {currentStore.logoUrl ? <img src={currentStore.logoUrl} className="size-full object-cover" alt="Terminal Logo" /> : <span className="material-symbols-outlined">point_of_sale</span>}
             </div>
             {showTerminalMenu && (
               <div className="absolute top-14 left-0 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-3 z-[100] animate-in slide-in-from-top-2 duration-200">
                  <button onClick={() => logoInputRef.current?.click()} className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left uppercase">
                    <span className="material-symbols-outlined text-lg text-primary">add_a_photo</span> Alterar Logotipo
                  </button>
                  <button onClick={() => { setShowPasswordModal(true); setShowTerminalMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left uppercase">
                    <span className="material-symbols-outlined text-lg text-amber-500">lock_reset</span> Alterar Minha Senha
                  </button>
               </div>
             )}
             <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleTerminalLogoChange} />
             <div>
                <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none">{currentStore.name}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Frente de Caixa</p>
             </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-2"></div>
          <div className="flex gap-2">
             {categories.map(cat => (
               <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${category === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{cat}</button>
             ))}
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setShowCancelModal(true)} className="px-6 py-2.5 bg-rose-500/10 text-rose-500 rounded-xl font-black text-xs hover:bg-rose-500 hover:text-white transition-all uppercase flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">cancel</span> Cancelamento
           </button>
           <button onClick={() => setShowReturnsModal(true)} className="px-6 py-2.5 bg-amber-500/10 text-amber-600 rounded-xl font-black text-xs hover:bg-amber-500 hover:text-white transition-all uppercase flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">history</span> Trocas
           </button>
           <button onClick={() => setShowStockInquiry(true)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs hover:bg-primary hover:text-white transition-all uppercase flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">inventory_2</span> Estoque
           </button>
           <button onClick={() => window.history.back()} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all uppercase tracking-widest">Sair</button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden print:hidden">
        {/* LADO ESQUERDO: LISTA DE PRODUTOS */}
        <section className="flex-1 flex flex-col">
          <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="relative">
               <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
               <input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar produto..." className="w-full h-16 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-16 pr-6 text-xl font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 content-start custom-scrollbar">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-3 rounded-3xl border-2 border-transparent hover:border-primary transition-all cursor-pointer shadow-sm group relative flex flex-col h-fit">
                <div className="absolute top-4 left-4 z-10"><span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm ${p.isService ? 'bg-amber-500 text-white' : 'bg-slate-900/60 text-white backdrop-blur-md'}`}>{p.isService ? 'Serviço' : p.category}</span></div>
                <div className={`aspect-square w-full rounded-2xl mb-3 overflow-hidden flex items-center justify-center shrink-0 ${p.isService ? 'bg-amber-500/5' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {p.isService ? <span className="material-symbols-outlined text-4xl text-amber-500/50">build</span> : <img src={p.image} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />}
                </div>
                <div className="flex flex-col flex-1 px-1">
                   <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 line-clamp-2 min-h-[32px] leading-tight mb-1">{p.name}</h4>
                   <div className="mt-auto flex justify-between items-end">
                      <div className="flex flex-col"><span className="text-[14px] font-black text-primary leading-none">R$ {p.salePrice.toLocaleString('pt-BR')}</span></div>
                      {!p.isService && <div className="text-right"><p className={`text-xs font-black leading-none ${p.stock <= 5 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>{p.stock} <span className="text-[8px]">un</span></p></div>}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LADO DIREITO: CARRINHO */}
        <aside className="w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl shrink-0">
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
                      <button onClick={() => setShowCustomerModal(true)} className="text-[9px] font-black text-primary uppercase hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">person_add</span> Novo</button>
                   </div>
                   <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 text-[10px] font-black uppercase">
                      <option value="">Consumidor Final</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-20"><span className="material-symbols-outlined text-7xl">shopping_cart</span><p className="text-xs font-black uppercase mt-4">Vazio</p></div> : cart.map(item => (
               <div key={item.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl group border border-transparent hover:border-primary/20 transition-all">
                  <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${item.isService ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    {item.image && !item.isService ? (
                      <img src={item.image} className="size-full object-cover" alt={item.name} />
                    ) : item.isService ? (
                       <span className="material-symbols-outlined">build</span>
                    ) : (
                       <span className="material-symbols-outlined">shopping_bag</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-black uppercase truncate leading-none">{item.name}</p>
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
          <div className="p-8 border-t-2 border-slate-100 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.05)] shrink-0">
             <div className="space-y-2">
                <div className="flex justify-between text-slate-500"><span className="text-[10px] font-black uppercase">Subtotal</span><span className="text-sm font-black tabular-nums">R$ {subtotal.toLocaleString('pt-BR')}</span></div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                   <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-slate-400">local_shipping</span><span className="text-[10px] font-black uppercase text-slate-400">Frete</span></div>
                   <input type="number" value={shippingValue} onChange={e => setShippingValue(parseFloat(e.target.value) || 0)} className="bg-transparent border-none text-right text-xs font-black text-slate-900 dark:text-white w-24 p-0 focus:ring-0" placeholder="0,00" />
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800"><span className="text-xs font-black uppercase opacity-50">Total</span><span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">R$ {totalGeral.toLocaleString('pt-BR')}</span></div>
             </div>
             <div className="grid grid-cols-2 gap-4 pt-2">
                <button disabled={cart.length === 0} onClick={() => { if(!selectedCustomerId) { alert('Selecione um cliente!'); return; } setShowOSModal(true); }} className="py-5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><span className="material-symbols-outlined text-lg">build</span> Gerar OS</button>
                <button disabled={cart.length === 0} onClick={() => setShowCheckout(true)} className="py-5 bg-primary hover:bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><span className="material-symbols-outlined text-lg">payments</span> Vender</button>
             </div>
          </div>
        </aside>
      </main>

      {/* MODAL SUCESSO E IMPRESSÃO */}
      {showSuccessModal && (
        <div className={`fixed inset-0 z-[500] flex items-center justify-center animate-in fade-in duration-300 ${successType === 'OS' ? 'bg-amber-500' : successType === 'RETURN' ? 'bg-amber-600' : successType === 'CANCEL' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
           <div className="text-center text-white space-y-8 animate-in zoom-in-50 duration-500 print:hidden">
              <span className="material-symbols-outlined text-[160px] animate-bounce">
                {successType === 'OS' ? 'build' : successType === 'RETURN' ? 'assignment_return' : successType === 'CANCEL' ? 'cancel' : 'check_circle'}
              </span>
              <div className="space-y-2">
                 <h2 className="text-5xl font-black uppercase tracking-tighter">{successType === 'OS' ? 'Ordem Gerada!' : successType === 'RETURN' ? 'Devolução Concluída!' : successType === 'CANCEL' ? 'Venda Cancelada!' : 'Venda Concluída!'}</h2>
                 <p className="text-xl font-bold uppercase opacity-60">Operação processada com sucesso no sistema.</p>
              </div>
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                 {successType === 'SALE' && (
                    <button onClick={printReceipt} className="w-full py-5 bg-white text-emerald-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3">
                       <span className="material-symbols-outlined">print</span> IMPRIMIR RECIBO DO CLIENTE
                    </button>
                 )}
                 <button onClick={() => setShowSuccessModal(false)} className="w-full py-5 bg-black/20 text-white border border-white/20 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black/30 transition-all">
                   Continuar Operando
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CANCELAMENTO */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[650px] animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-rose-500 text-white flex justify-between items-center shrink-0">
                 <h3 className="text-2xl font-black uppercase">Cancelamento de Vendas</h3>
                 <button onClick={() => setShowCancelModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                 <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input autoFocus placeholder="Busque por ID da venda ou Nome do Cliente..." value={cancelSearchId} onChange={e => setCancelSearchId(e.target.value)} className="w-full h-14 bg-white dark:bg-slate-900 border-none rounded-2xl pl-12 pr-6 text-sm font-bold shadow-sm" />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                 {todaySales.length > 0 ? todaySales.map(sale => (
                    <div key={sale.id} className="bg-white dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-rose-500/50 transition-all">
                       <div>
                          <p className="text-xs font-black text-rose-500 uppercase">{sale.id}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{sale.date} • {sale.client || 'Consumidor Final'}</p>
                          <div className="mt-2 flex gap-1">
                             {sale.items?.slice(0, 3).map((item, i) => (
                               <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md text-[8px] font-black uppercase text-slate-400">{item.name.substring(0, 10)}</span>
                             ))}
                             {(sale.items?.length || 0) > 3 && <span className="text-[8px] font-black text-slate-400">...</span>}
                          </div>
                       </div>
                       <div className="text-right flex items-center gap-6">
                          <div>
                             <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">R$ {sale.value.toLocaleString('pt-BR')}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase">{sale.method}</p>
                          </div>
                          <button onClick={() => handleCancelSale(sale)} className="px-6 py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all">Cancelar Venda</button>
                       </div>
                    </div>
                 )) : <div className="text-center py-20 opacity-20 uppercase font-black text-xs tracking-widest">Nenhuma venda encontrada para o termo "{cancelSearchId}"</div>}
              </div>
           </div>
        </div>
      )}

      {/* MODAL CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <div><h3 className="text-2xl font-black uppercase tracking-tight">Pagamento</h3><p className="text-[10px] font-black text-slate-400 uppercase mt-1">Selecione o método</p></div>
                 <button onClick={() => setShowCheckout(false)} className="size-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-2 gap-4">
                    {['Dinheiro', 'Pix', 'Debito', 'Credito'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-primary/50'}`}>
                        <span className="material-symbols-outlined text-3xl">{m === 'Dinheiro' ? 'payments' : m === 'Pix' ? 'qr_code_2' : 'credit_card'}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                      </button>
                    ))}
                 </div>
                 <div className="text-center bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800"><p className="text-5xl font-black text-primary tabular-nums">R$ {totalGeral.toLocaleString('pt-BR')}</p></div>
                 <button onClick={handleFinalizeSale} className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2.5rem] font-black text-sm uppercase shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4">CONCLUIR VENDA</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL TROCAS */}
      {showReturnsModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[650px]">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center shrink-0">
                 <h3 className="text-2xl font-black uppercase">Trocas e Devoluções</h3>
                 <button onClick={() => setShowReturnsModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                 <input placeholder="Busque o cliente pelo nome..." value={returnSearchCustomer} onChange={e => setReturnSearchCustomer(e.target.value)} className="w-full h-14 bg-white dark:bg-slate-900 border-none rounded-2xl pl-12 pr-6 text-sm font-bold" />
                 {returnSearchCustomer && !selectedReturnCustomer && (
                    <div className="absolute top-44 left-8 right-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                       {customers.filter(c => c.name.toLowerCase().includes(returnSearchCustomer.toLowerCase())).map(c => (
                         <button key={c.id} onClick={() => { setSelectedReturnCustomer(c); setReturnSearchCustomer(c.name); }} className="w-full px-6 py-4 text-left text-xs font-black uppercase hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b last:border-none">{c.name}</button>
                       ))}
                    </div>
                 )}
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                 {selectedReturnCustomer ? customerSales.map(sale => (
                    <div key={sale.id} className="bg-white dark:bg-slate-800/30 p-6 rounded-[2rem] border shadow-sm">
                       <h4 className="text-sm font-black text-primary uppercase mb-4">{sale.id} • {sale.date}</h4>
                       <div className="space-y-2">
                          {sale.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                               <p className="text-xs font-black uppercase">{item.name}</p>
                               <button onClick={() => handleProcessReturn(sale, item)} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase">Devolver</button>
                            </div>
                          ))}
                       </div>
                    </div>
                 )) : <div className="text-center py-20 opacity-20 uppercase font-black">Selecione um cliente</div>}
              </div>
           </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 bg-primary text-white flex justify-between items-center"><h3 className="text-2xl font-black uppercase">Cadastro Rápido</h3><button onClick={() => setShowCustomerModal(false)}><span className="material-symbols-outlined">close</span></button></div>
              <div className="flex bg-slate-50 dark:bg-slate-800 p-1">
                 <button onClick={() => setCustomerModalTab('basic')} className={`flex-1 py-3 text-[10px] font-black uppercase ${customerModalTab === 'basic' ? 'bg-white dark:bg-slate-900 text-primary' : 'text-slate-400'}`}>Básico</button>
                 <button onClick={() => setCustomerModalTab('address')} className={`flex-1 py-3 text-[10px] font-black uppercase ${customerModalTab === 'address' ? 'bg-white dark:bg-slate-900 text-primary' : 'text-slate-400'}`}>Endereço</button>
              </div>
              <form onSubmit={handleQuickCustomerAdd} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                 {customerModalTab === 'basic' ? (
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">Nome</label><input required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" /></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">CPF/CNPJ</label><input value={customerForm.cpfCnpj} onChange={e => setCustomerForm({...customerForm, cpfCnpj: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" /></div>
                         <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">WhatsApp</label><input required value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" /></div>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">CEP</label><input value={customerForm.zipCode} onChange={e => setCustomerForm({...customerForm, zipCode: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" /></div>
                         <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">Cidade</label><input value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" /></div>
                      </div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2">Endereço</label><input value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-sm font-bold border-none" /></div>
                   </div>
                 )}
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-xs uppercase shadow-xl mt-4">SALVAR</button>
              </form>
           </div>
        </div>
      )}

      {showStockInquiry && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 bg-primary text-white flex justify-between items-center"><h3 className="text-2xl font-black uppercase">Consulta Estoque</h3><button onClick={() => setShowStockInquiry(false)} className="size-10 hover:bg-white/20 rounded-xl"><span className="material-symbols-outlined">close</span></button></div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800 shrink-0"><input autoFocus placeholder="Digite o nome..." className="w-full h-14 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 text-sm font-bold shadow-sm" onChange={e => setSearch(e.target.value)} /></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                 {products.filter(p => !p.isService && (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search))).map(p => (
                   <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border">
                      <div className="flex items-center gap-4"><img src={p.image} className="size-12 rounded-xl object-cover" alt={p.name} /><div><p className="text-xs font-black uppercase truncate">{p.name}</p><p className="text-[9px] font-mono text-slate-400 uppercase">{p.sku}</p></div></div>
                      <div className="text-right"><p className={`text-xl font-black ${p.stock <= 5 ? 'text-rose-500' : 'text-primary'}`}>{p.stock} un</p></div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; } @media print { body * { visibility: hidden; } #receipt-print, #receipt-print * { visibility: visible; } #receipt-print { position: absolute; left: 0; top: 0; } }`}</style>
    </div>
  );
};

export default PDV;
