
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { CartItem, Product, Customer, UserRole, User, ServiceOrder, ServiceOrderStatus, Establishment, TransactionStatus, Transaction } from '../types';

const PDV: React.FC = () => {
  const { products, customers, users, currentUser, processSale, establishments, addServiceOrder, addCustomer, addEstablishment, addUser, transactions, addTransaction, systemConfig, addProduct } = useApp();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  
  // Modais e Menus
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [showPriceInquiry, setShowPriceInquiry] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTerminalMenu, setShowTerminalMenu] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  
  const [successType, setSuccessType] = useState<'SALE' | 'OS' | 'RETURN' | 'CANCEL'>('SALE');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Campos Cartão
  const [cardInstallments, setCardInstallments] = useState(1);
  const [cardAuthNumber, setCardAuthNumber] = useState('');
  const [cardNsu, setCardNsu] = useState('');

  // Senha do Usuário
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Campos OS
  const [osDescription, setOsDescription] = useState('');
  const [osTechnician, setOsTechnician] = useState('');

  // Financeiro
  const [shippingValue, setShippingValue] = useState(0);

  // Estados Troca/Devolução/Cancelamento
  const [priceInquirySearch, setPriceInquirySearch] = useState('');
  const [returnSearchCustomer, setReturnSearchCustomer] = useState('');
  const [cancelSearchId, setCancelSearchId] = useState('');
  const [selectedReturnCustomer, setSelectedReturnCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Transaction[]>([]);

  // Form de novo cliente (PDV Rápido)
  const initialCustomerForm: Omit<Customer, 'id'> = { 
    name: '', phone: '', email: '', birthDate: new Date().toISOString().split('T')[0],
    cpfCnpj: '', zipCode: '', address: '', number: '', neighborhood: '', city: '', state: ''
  };
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [customerModalTab, setCustomerModalTab] = useState<'basic' | 'address'>('basic');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

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

  const vendors = useMemo(() => {
    return users.filter(u => {
      const isCorrectRole = (u.role === UserRole.VENDOR || u.role === UserRole.ADMIN || u.role === UserRole.MANAGER);
      const isVisibleForUser = isAdmin || u.storeId === currentUser?.storeId;
      return isCorrectRole && isVisibleForUser;
    });
  }, [users, currentUser, isAdmin]);

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
    if (cart.length === 0 || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const saleId = `SALE-${Date.now()}`;
      const vendor = vendors.find(v => v.id === selectedVendorId);
      const customer = customers.find(c => c.id === selectedCustomerId);
      
      const cardDetails = (paymentMethod === 'Credito' || paymentMethod === 'Debito') ? {
        installments: cardInstallments,
        authNumber: cardAuthNumber,
        transactionSku: cardNsu
      } : {};

      setLastSaleData({
        id: saleId,
        items: [...cart],
        subtotal,
        shipping: shippingValue,
        total: totalGeral,
        payment: paymentMethod,
        date: new Date().toLocaleString('pt-BR'),
        vendor: vendor?.name || 'Não inf.',
        customer: customer?.name || 'Consumidor Final',
        ...cardDetails
      });

      await processSale(cart, totalGeral, paymentMethod, selectedCustomerId, selectedVendorId, shippingValue, cardDetails);
      
      setCart([]);
      setShippingValue(0);
      setCardInstallments(1);
      setCardAuthNumber('');
      setCardNsu('');
      setSuccessType('SALE');
      setShowCheckout(false);
      setShowSuccessModal(true);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar venda.");
    } finally {
      setIsFinalizing(false);
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
      technicianName: osTechnician || currentUser?.name || 'Sistema',
      store: currentStore.name
    };

    try {
      await addServiceOrder(newOS);
      setCart([]);
      setOsDescription('');
      setOsTechnician('');
      setShippingValue(0);
      setSuccessType('OS');
      setShowOSModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      alert("Erro ao gerar Ordem de Serviço.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword !== confirmPassword) {
      alert("As senhas não conferem!");
      return;
    }
    try {
      await addUser({ ...currentUser, password: newPassword });
      alert("Senha alterada com sucesso!");
      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      alert("Erro ao atualizar senha.");
    }
  };

  useEffect(() => {
    if (selectedReturnCustomer) {
      const sales = transactions.filter(t => t.clientId === selectedReturnCustomer.id && t.type === 'INCOME' && t.category === 'Venda');
      setCustomerSales(sales);
    } else {
      setCustomerSales([]);
    }
  }, [selectedReturnCustomer, transactions]);

  const handleProcessReturn = async (sale: Transaction, item: CartItem) => {
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
       if (product && !product.isService) {
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
       setSelectedReturnCustomer(null);
       setShowSuccessModal(true);
    }
  };

  const handleCancelSale = async (sale: Transaction) => {
    if (confirm(`DESEJA REALMENTE CANCELAR A VENDA ${sale.id}?\n\nOs itens retornarão ao estoque e o valor de R$ ${sale.value.toLocaleString('pt-BR')} será estornado do caixa.`)) {
      try {
        if (sale.items) {
          for (const item of sale.items) {
            const product = products.find(p => p.id === item.id);
            if (product && !product.isService) {
              await addProduct({ ...product, stock: product.stock + item.quantity });
            }
          }
        }

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

  const inquiryResult = useMemo(() => {
    if (priceInquirySearch.length < 2) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(priceInquirySearch.toLowerCase()) || 
      p.sku.toLowerCase().includes(priceInquirySearch.toLowerCase()) || 
      p.barcode?.includes(priceInquirySearch)
    ).slice(0, 5);
  }, [priceInquirySearch, products]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden font-display">
      
      {/* COMPONENTE DE IMPRESSÃO */}
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
            {lastSaleData?.items?.map((item: any, i: number) => (
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
            {lastSaleData?.authNumber && <p className="uppercase">AUTH: {lastSaleData.authNumber}</p>}
            {lastSaleData?.transactionSku && <p className="uppercase">NSU: {lastSaleData.transactionSku}</p>}
            {lastSaleData?.installments > 1 && <p className="uppercase">PARCELAS: {lastSaleData.installments}x</p>}
            <div className="border-b border-dashed border-slate-300 my-2"></div>
            <p className="text-center mt-4">OBRIGADO PELA PREFERÊNCIA!</p>
            <p className="text-center text-[8px] opacity-50">Tem Acessorio ERP - Recibo não fiscal</p>
         </div>
      </div>

      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm shrink-0 print:hidden">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 relative" ref={menuRef}>
             <div onClick={() => setShowTerminalMenu(!showTerminalMenu)} className="size-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg overflow-hidden cursor-pointer group relative hover:scale-105 transition-all">
                {currentStore.logoUrl ? <img src={currentStore.logoUrl} className="size-full object-cover" alt="Terminal Logo" /> : <span className="material-symbols-outlined">point_of_sale</span>}
             </div>
             {showTerminalMenu && (
               <div className="absolute top-14 left-0 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                  <button onClick={() => logoInputRef.current?.click()} className="w-full px-4 py-2.5 flex items-center gap-3 text-[10px] font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left uppercase">
                    <span className="material-symbols-outlined text-lg text-primary">add_a_photo</span> Alterar Logotipo
                  </button>
                  <button onClick={() => { setShowPasswordChangeModal(true); setShowTerminalMenu(false); }} className="w-full px-4 py-2.5 flex items-center gap-3 text-[10px] font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left uppercase border-t border-slate-50 dark:border-slate-700">
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
           <button onClick={() => setShowPriceInquiry(true)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs hover:bg-primary hover:text-white transition-all uppercase flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">sell</span> Consulta Preço
           </button>
           <button onClick={() => navigate('/servicos?tab=list')} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-primary transition-all uppercase flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">build</span> Gerenciar OS
           </button>
           <button onClick={() => window.history.back()} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all uppercase tracking-widest">Sair</button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden print:hidden">
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
                    {item.image && !item.isService ? ( <img src={item.image} className="size-full object-cover" alt={item.name} /> ) : item.isService ? ( <span className="material-symbols-outlined">build</span> ) : ( <span className="material-symbols-outlined">shopping_bag</span> )}
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

      {/* MODAL CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <div><h3 className="text-2xl font-black uppercase tracking-tight">Pagamento</h3><p className="text-[10px] font-black text-slate-400 uppercase mt-1">Selecione o método e finalize</p></div>
                 <button onClick={() => setShowCheckout(false)} className="size-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-2 gap-3">
                    {['Dinheiro', 'Pix', 'Debito', 'Credito'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-primary/50'}`}>
                        <span className="material-symbols-outlined text-2xl">{m === 'Dinheiro' ? 'payments' : m === 'Pix' ? 'qr_code_2' : 'credit_card'}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{m}</span>
                      </button>
                    ))}
                 </div>

                 {(paymentMethod === 'Credito' || paymentMethod === 'Debito') && (
                   <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Parcelas</label>
                            <select value={cardInstallments} onChange={e => setCardInstallments(Number(e.target.value))} className="w-full h-12 bg-white dark:bg-slate-900 border-none rounded-xl px-4 text-xs font-bold">
                               {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">NSU (Opcional)</label>
                            <input value={cardNsu} onChange={e => setCardNsu(e.target.value)} placeholder="000000" className="w-full h-12 bg-white dark:bg-slate-900 border-none rounded-xl px-4 text-xs font-bold" />
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Nº Autorização (Opcional)</label>
                         <input value={cardAuthNumber} onChange={e => setCardAuthNumber(e.target.value)} placeholder="000000" className="w-full h-12 bg-white dark:bg-slate-900 border-none rounded-xl px-4 text-xs font-bold" />
                      </div>
                   </div>
                 )}

                 <div className="text-center bg-slate-900 dark:bg-black p-6 rounded-[2.5rem]"><p className="text-3xl font-black text-primary tabular-nums">R$ {totalGeral.toLocaleString('pt-BR')}</p></div>
                 
                 <button 
                  disabled={isFinalizing}
                  onClick={handleFinalizeSale} 
                  className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-[2rem] font-black text-sm uppercase shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4"
                 >
                   {isFinalizing ? <span className="material-symbols-outlined animate-spin">sync</span> : 'CONCLUIR VENDA'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CONSULTA PREÇO */}
      {showPriceInquiry && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b bg-slate-900 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">Consulta de Preço</h3>
                 <button onClick={() => setShowPriceInquiry(false)} className="material-symbols-outlined">close</button>
              </div>
              <div className="p-8 space-y-6">
                 <input 
                   autoFocus 
                   value={priceInquirySearch} 
                   onChange={e => setPriceInquirySearch(e.target.value)} 
                   placeholder="Digite o nome, SKU ou bipe o código..." 
                   className="w-full h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 text-xl font-bold border-none" 
                 />
                 <div className="space-y-3">
                    {inquiryResult.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                         <div>
                            <p className="text-lg font-black uppercase text-slate-800 dark:text-white leading-tight">{p.name}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase">SKU: {p.sku} | Estoque: {p.stock} un</p>
                         </div>
                         <div className="text-right">
                            <p className="text-3xl font-black text-primary tabular-nums">R$ {p.salePrice.toLocaleString('pt-BR')}</p>
                         </div>
                      </div>
                    ))}
                    {priceInquirySearch.length >= 2 && inquiryResult.length === 0 && (
                      <div className="py-10 text-center opacity-30 font-black uppercase text-xs">Produto não localizado</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CANCELAMENTO */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b bg-rose-500 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">Estorno de Venda</h3>
                 <button onClick={() => setShowCancelModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <input 
                   value={cancelSearchId} 
                   onChange={e => setCancelSearchId(e.target.value)} 
                   placeholder="Buscar venda por ID ou Cliente..." 
                   className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 font-bold border-none mb-4" 
                 />
                 <div className="space-y-3">
                    {todaySales.map(s => (
                      <div key={s.id} onClick={() => handleCancelSale(s)} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-rose-50 transition-all border border-transparent hover:border-rose-500">
                         <div>
                            <p className="text-[10px] font-black text-rose-500 uppercase">#{s.id}</p>
                            <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{s.client || 'Consumidor Final'}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{s.date} | {s.method}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-lg font-black text-rose-500 tabular-nums">R$ {s.value.toLocaleString('pt-BR')}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Clique para Cancelar</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL TROCAS */}
      {showReturnsModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b bg-amber-500 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">Troca & Devolução</h3>
                 <button onClick={() => { setShowReturnsModal(false); setSelectedReturnCustomer(null); }} className="material-symbols-outlined">close</button>
              </div>
              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                 {!selectedReturnCustomer ? (
                   <div className="space-y-4">
                      <p className="text-xs font-black uppercase text-slate-400 px-2">1. Localize o cliente da venda</p>
                      <input 
                        value={returnSearchCustomer} 
                        onChange={e => setReturnSearchCustomer(e.target.value)} 
                        placeholder="Nome do cliente..." 
                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 font-bold border-none" 
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {customers.filter(c => c.name.toLowerCase().includes(returnSearchCustomer.toLowerCase())).slice(0, 10).map(c => (
                           <button key={c.id} onClick={() => setSelectedReturnCustomer(c)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-left hover:bg-amber-50 transition-all border border-transparent hover:border-amber-500">
                              <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{c.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{c.phone}</p>
                           </button>
                         ))}
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="flex justify-between items-center">
                         <button onClick={() => setSelectedReturnCustomer(null)} className="text-[10px] font-black uppercase text-amber-500">← Voltar para Busca</button>
                         <p className="text-sm font-black uppercase">Compras de {selectedReturnCustomer.name}</p>
                      </div>
                      <div className="space-y-4">
                         {customerSales.map(sale => (
                           <div key={sale.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 space-y-4">
                              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                                 <div><p className="text-[10px] font-black text-slate-400 uppercase">Venda #{sale.id}</p><p className="text-xs font-bold">{sale.date}</p></div>
                                 <p className="text-lg font-black text-primary tabular-nums">R$ {sale.value.toLocaleString('pt-BR')}</p>
                              </div>
                              <div className="space-y-2">
                                 {sale.items?.map((item, idx) => (
                                   <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl">
                                      <span className="text-xs font-bold uppercase">{item.quantity}x {item.name}</span>
                                      <button onClick={() => handleProcessReturn(sale, item)} className="px-4 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase">Trocar Item</button>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         ))}
                         {customerSales.length === 0 && <div className="text-center py-20 opacity-20 uppercase font-black text-xs">Nenhuma venda registrada para este cliente</div>}
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODAL CADASTRO RÁPIDO CLIENTE */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b bg-primary text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">Novo Cliente Rápido</h3>
                 <button onClick={() => setShowCustomerModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <form onSubmit={handleQuickCustomerAdd} className="p-10 space-y-4">
                 <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                    <button type="button" onClick={() => setCustomerModalTab('basic')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${customerModalTab === 'basic' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>Básico</button>
                    <button type="button" onClick={() => setCustomerModalTab('address')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${customerModalTab === 'address' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>Endereço</button>
                 </div>
                 {customerModalTab === 'basic' ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                       <input required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="Nome Completo" className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none uppercase" />
                       <input required value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="WhatsApp (DDD)" className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                       <input value={customerForm.cpfCnpj} onChange={e => setCustomerForm({...customerForm, cpfCnpj: e.target.value})} placeholder="CPF/CNPJ" className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                       <input value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} type="email" placeholder="E-mail (Opcional)" className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                    </div>
                 ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                       <input value={customerForm.zipCode} onChange={e => setCustomerForm({...customerForm, zipCode: e.target.value})} placeholder="CEP" className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                       <div className="grid grid-cols-3 gap-2">
                          <input value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} placeholder="Rua" className="col-span-2 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                          <input value={customerForm.number} onChange={e => setCustomerForm({...customerForm, number: e.target.value})} placeholder="Nº" className="h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                       </div>
                       <input value={customerForm.neighborhood} onChange={e => setCustomerForm({...customerForm, neighborhood: e.target.value})} placeholder="Bairro" className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                       <div className="grid grid-cols-2 gap-2">
                          <input value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} placeholder="Cidade" className="h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none" />
                          <input value={customerForm.state} onChange={e => setCustomerForm({...customerForm, state: e.target.value})} placeholder="UF" className="h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-6 font-bold border-none uppercase" />
                       </div>
                    </div>
                 )}
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase shadow-xl mt-6">CADASTRAR E SELECIONAR</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL SUCESSO */}
      {showSuccessModal && (
        <div className={`fixed inset-0 z-[500] flex items-center justify-center animate-in fade-in duration-300 ${successType === 'OS' ? 'bg-amber-500' : successType === 'RETURN' ? 'bg-amber-600' : successType === 'CANCEL' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
           <div className="text-center text-white space-y-8 animate-in zoom-in-50 duration-500 print:hidden">
              <span className="material-symbols-outlined text-[160px] animate-bounce">
                {successType === 'OS' ? 'build' : successType === 'RETURN' ? 'assignment_return' : successType === 'CANCEL' ? 'cancel' : 'check_circle'}
              </span>
              <div className="space-y-2">
                 <h2 className="text-5xl font-black uppercase tracking-tighter">
                   {successType === 'OS' ? 'Ordem Gerada!' : successType === 'RETURN' ? 'Devolução Concluída!' : successType === 'CANCEL' ? 'Venda Cancelada!' : 'Venda Concluída!'}
                 </h2>
                 <p className="text-xl font-bold uppercase opacity-60">Operação processada com sucesso.</p>
              </div>
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                 {successType === 'SALE' && (
                    <button onClick={printReceipt} className="w-full py-5 bg-white text-emerald-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3">
                       <span className="material-symbols-outlined">print</span> IMPRIMIR RECIBO
                    </button>
                 )}
                 <button onClick={() => setShowSuccessModal(false)} className="w-full py-5 bg-black/20 text-white border border-white/20 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black/30 transition-all">Continuar Operando</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL OS */}
      {showOSModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-8 bg-amber-500 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-3xl">build</span>
                   <h3 className="text-2xl font-black uppercase">Abrir Nova OS</h3>
                 </div>
                 <button onClick={() => setShowOSModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Diagnóstico / Problema</label>
                   <textarea autoFocus value={osDescription} onChange={e => setOsDescription(e.target.value)} rows={4} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500" placeholder="Ex: Troca de tela..." />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Técnico (Opcional)</label>
                   <input value={osTechnician} onChange={e => setOsTechnician(e.target.value)} className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 text-sm font-bold border-none" placeholder="Nome do técnico" />
                 </div>
                 <button onClick={handleFinalizeOS} className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase shadow-xl hover:bg-amber-600 transition-all">GERAR ORDEM DE SERVIÇO</button>
              </div>
           </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; } @media print { body * { visibility: hidden; } #receipt-print, #receipt-print * { visibility: visible; } #receipt-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
};

export default PDV;
