
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../AppContext';
import { Product, TransactionStatus, UserRole } from '../types';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, updateStock, addTransaction, currentUser, establishments } = useApp();
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const [showProductModal, setShowProductModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  const [form, setForm] = useState<Partial<Product>>({
    name: '', sku: '', barcode: '', category: '', brand: '', costPrice: 0, salePrice: 0, stock: 0, unit: 'UN', location: '', image: ''
  });

  const [purchaseScanner, setPurchaseScanner] = useState('');
  const [purchaseList, setPurchaseList] = useState<{ product: Product; quantity: number; cost: number }[]>([]);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const search = filter.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search) || p.barcode?.includes(search);
      const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
      let matchesStatus = true;
      if (statusFilter === 'Em Estoque') matchesStatus = p.stock > 10;
      if (statusFilter === 'Baixo') matchesStatus = p.stock > 0 && p.stock <= 10;
      if (statusFilter === 'Esgotado') matchesStatus = p.stock === 0;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, filter, categoryFilter, statusFilter]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = form.image || `https://picsum.photos/seed/${form.sku || Date.now()}/400/400`;
    if (editingId) {
      updateProduct({ ...form as Product, id: editingId, image: finalImage });
    } else {
      addProduct({ ...form as Product, id: `prod-${Date.now()}`, image: finalImage });
    }
    setShowProductModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateEAN = () => {
    const code = Math.floor(Math.random() * 900000000000) + 789000000000;
    setForm({ ...form, barcode: code.toString() });
  };

  const handleScanEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && purchaseScanner) {
      const found = products.find(p => p.barcode === purchaseScanner || p.sku === purchaseScanner);
      if (found) {
        setPurchaseList(prev => {
          const existing = prev.find(item => item.product.id === found.id);
          if (existing) return prev.map(item => item.product.id === found.id ? { ...item, quantity: item.quantity + 1 } : item);
          return [...prev, { product: found, quantity: 1, cost: found.costPrice }];
        });
        setPurchaseScanner('');
      } else {
        alert('Produto não localizado!');
        setPurchaseScanner('');
      }
    }
  };

  const purchaseTotal = useMemo(() => purchaseList.reduce((acc, item) => acc + (item.cost * item.quantity), 0), [purchaseList]);

  const handleConfirmPurchase = () => {
    if (purchaseList.length === 0) return;

    purchaseList.forEach(item => {
      updateStock(item.product.id, item.quantity);
    });

    // LANÇAMENTO AUTOMÁTICO NA DRE (COMO DESPESA DE COMPRA DE ESTOQUE)
    addTransaction({
      id: `PURCH-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `Reposição de Estoque (${purchaseList.length} itens)`,
      store: currentStore?.name || 'Matriz São Paulo',
      category: 'Compra de Estoque',
      status: TransactionStatus.PAID,
      value: purchaseTotal,
      type: 'EXPENSE',
      method: 'Transferência/Boleto',
      client: 'Fornecedor de Reposição'
    });

    setPurchaseList([]);
    setShowPurchaseModal(false);
    alert(`Estoque atualizado! Foi gerada uma despesa de R$ ${purchaseTotal.toLocaleString('pt-BR')} para a DRE.`);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Central de Inventário</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-tight">Unidade: {currentStore?.name}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowPurchaseModal(true); setTimeout(() => scannerInputRef.current?.focus(), 200); }} className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl">
            <span className="material-symbols-outlined text-lg">barcode_scanner</span> Entrada de Mercadoria
          </button>
          <button onClick={() => { setEditingId(null); setForm({ name: '', sku: `SKU-${Date.now()}`, barcode: '', category: '', brand: '', costPrice: 0, salePrice: 0, stock: 0, unit: 'UN', location: '', image: '' }); setShowProductModal(true); }} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-lg">add</span> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px] relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Pesquisar por Nome, SKU ou EAN..." className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20">
          <option value="Todos">Status de Estoque</option>
          <option value="Em Estoque">Ok (&gt;10)</option>
          <option value="Baixo">Baixo (1-10)</option>
          <option value="Esgotado">Esgotado (0)</option>
        </select>
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Item / Identificação</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Localização</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Preço Venda</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Estoque Atual</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map(p => (
                <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-sm">
                        <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight uppercase truncate max-w-[200px]">{p.name}</p>
                        <div className="flex gap-2 mt-1">
                           <span className="text-[9px] font-mono text-primary font-bold bg-primary/5 px-1.5 rounded uppercase">{p.sku}</span>
                           <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">{p.location || 'Depósito'}</span>
                  </td>
                  <td className="px-8 py-6 text-sm font-black text-right text-primary tabular-nums">
                    R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{p.stock} <span className="text-[9px] text-slate-400 font-bold uppercase">{p.unit}</span></span>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${p.stock > 10 ? 'bg-emerald-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min((p.stock / 20) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(p.id); setForm(p); setShowProductModal(true); }} className="size-10 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => { if(confirm('Excluir produto definitivamente?')) deleteProduct(p.id)}} className="size-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-primary text-white">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'Editar Detalhes' : 'Cadastrar Novo Item'}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Catálogo Geral de Mercadorias</p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="size-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="md:col-span-2 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Nome do Produto / Descrição Comercial</label>
                    <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all uppercase" placeholder="EX: CAMISETA OVERSIZED VINTAGE" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Código de Barras (EAN)</label>
                      <div className="flex gap-2">
                        <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="flex-1 h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-mono font-bold" placeholder="7890000000000" />
                        <button type="button" onClick={generateEAN} className="size-16 bg-slate-100 dark:bg-slate-700 rounded-2xl hover:bg-slate-200 text-slate-500 transition-all shrink-0"><span className="material-symbols-outlined">autorenew</span></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Referência SKU</label>
                      <input type="text" required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-mono font-bold uppercase" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Categoria</label>
                      <input type="text" list="cat-list" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-black uppercase" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Unidade</label>
                      <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-xs font-black uppercase">
                        <option value="UN">UNIDADE</option>
                        <option value="PC">PEÇA</option>
                        <option value="CX">CAIXA</option>
                        <option value="KG">QUILO</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Localização</label>
                      <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold uppercase" placeholder="PRATELEIRA A1" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Mídia do Item</label>
                    <div className="flex gap-4">
                      <input 
                        type="text" 
                        value={form.image?.startsWith('data:') ? 'IMAGEM LOCAL CARREGADA' : form.image} 
                        onChange={e => setForm({...form, image: e.target.value})} 
                        className="flex-1 h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-xs font-bold" 
                        placeholder="Link da imagem..." 
                      />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="size-16 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary transition-all"><span className="material-symbols-outlined">upload</span></button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                  </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-8 rounded-[2.5rem] flex flex-col gap-8 h-fit">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Preço de Venda (R$)</label>
                  <input type="number" step="0.01" required value={form.salePrice} onChange={e => setForm({...form, salePrice: parseFloat(e.target.value)})} className="w-full h-20 bg-white dark:bg-slate-900 border-2 border-primary/20 rounded-3xl px-8 text-4xl font-black text-primary tabular-nums outline-none focus:ring-4 focus:ring-primary/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Preço de Custo (R$)</label>
                  <input type="number" step="0.01" required value={form.costPrice} onChange={e => setForm({...form, costPrice: parseFloat(e.target.value)})} className="w-full h-14 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 text-lg font-black text-slate-700 dark:text-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Estoque Inicial</label>
                  <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} className="w-full h-14 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 text-lg font-black" />
                </div>
                <button type="submit" className="w-full h-20 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95">Salvar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[650px] animate-in zoom-in-95">
             <div className="w-full md:w-[400px] border-r border-slate-100 dark:border-slate-800 p-10 flex flex-col justify-between bg-slate-50 dark:bg-slate-900 shadow-inner">
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="size-14 bg-primary rounded-3xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                      <span className="material-symbols-outlined text-3xl">add_shopping_cart</span>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tight">Entrada</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REPOSIÇÃO FINANCEIRA</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Bipar ou SKU</label>
                    <input 
                      ref={scannerInputRef}
                      autoFocus
                      value={purchaseScanner}
                      onChange={e => setPurchaseScanner(e.target.value)}
                      onKeyDown={handleScanEnter}
                      className="w-full h-24 bg-white dark:bg-slate-800 border-4 border-primary/20 rounded-[2rem] px-8 text-center text-3xl font-black text-primary outline-none focus:border-primary transition-all placeholder:text-slate-200"
                      placeholder="ESCANEAR"
                    />
                  </div>
                </div>
                <div className="space-y-6 pt-10 border-t border-slate-200 dark:border-slate-800">
                   <div className="flex justify-between items-end px-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento Total</p>
                      <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">R$ {purchaseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                   <button 
                      onClick={handleConfirmPurchase} 
                      disabled={purchaseList.length === 0} 
                      className="w-full h-24 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-[2.5rem] font-black text-lg uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex flex-col items-center justify-center"
                    >
                      <span className="text-xs opacity-80 mb-1">FINALIZAR E LANÇAR CUSTO</span>
                      CONFIRMAR ENTRADA
                    </button>
                    <button onClick={() => setShowPurchaseModal(false)} className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">Abandonar Operação</button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-10 custom-scrollbar">
                <div className="space-y-4">
                    {purchaseList.length > 0 ? purchaseList.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border-2 border-transparent hover:border-slate-200 transition-all animate-in slide-in-from-right-4">
                        <div className="size-20 rounded-2xl bg-white dark:bg-slate-800 p-1 shrink-0 shadow-md">
                           <img src={item.product.image} className="size-full object-cover rounded-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{item.product.name}</p>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Custo: R$ {item.cost.toLocaleString('pt-BR')} • {item.product.sku}</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm">
                           <button onClick={() => setPurchaseList(prev => prev.map(p => p.product.id === item.product.id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p))} className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black">-</button>
                           <span className="text-lg font-black w-10 text-center tabular-nums">{item.quantity}</span>
                           <button onClick={() => setPurchaseList(prev => prev.map(p => p.product.id === item.product.id ? { ...p, quantity: p.quantity + 1 } : p))} className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black">+</button>
                        </div>
                        <button onClick={() => setPurchaseList(prev => prev.filter(p => p.product.id !== item.product.id))} className="size-12 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                         <span className="material-symbols-outlined text-9xl">inventory</span>
                         <p className="text-xl font-black uppercase tracking-widest mt-4">Nenhum item bipado ainda</p>
                      </div>
                    )}
                </div>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default Inventory;
