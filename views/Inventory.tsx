
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../AppContext';
import { Product, TransactionStatus } from '../types';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, updateStock, addTransaction } = useApp();
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const [showProductModal, setShowProductModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleConfirmPurchase = () => {
    if (purchaseList.length === 0) return;

    let totalCost = 0;
    purchaseList.forEach(item => {
      updateStock(item.product.id, item.quantity);
      totalCost += item.cost * item.quantity;
    });

    addTransaction({
      id: `PURCH-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `Entrada de Mercadoria (${purchaseList.length} itens)`,
      store: 'Matriz São Paulo',
      category: 'Compra de Estoque',
      status: TransactionStatus.PAID,
      value: totalCost,
      type: 'EXPENSE',
      method: 'Transferência/Boleto',
      client: 'Fornecedor Diverso'
    });

    setPurchaseList([]);
    setShowPurchaseModal(false);
    alert('Estoque atualizado e compra lançada no financeiro!');
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Inventário</h2>
          <p className="text-slate-500 text-sm mt-1 text-slate-500 dark:text-slate-400">Gerencie seu catálogo e movimentações de entrada.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowPurchaseModal(true); setTimeout(() => scannerInputRef.current?.focus(), 200); }} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:bg-slate-700 active:scale-95 shadow-md">
            <span className="material-symbols-outlined">barcode_scanner</span> Entrada Rápida
          </button>
          <button onClick={() => { setEditingId(null); setForm({ name: '', sku: `SKU-${Date.now()}`, barcode: '', category: '', brand: '', costPrice: 0, salePrice: 0, stock: 0, unit: 'UN', location: '', image: '' }); setShowProductModal(true); }} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:bg-blue-600 active:scale-95">
            <span className="material-symbols-outlined">add</span> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Pesquisar por Nome, SKU ou EAN..." className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
          <option value="Todos">Todos os Status</option>
          <option value="Em Estoque">Ok (&gt;10)</option>
          <option value="Baixo">Crítico (1-10)</option>
          <option value="Esgotado">Zero (0)</option>
        </select>
      </div>
      
      <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Localização</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Preço Venda</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Estoque Atual</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map(p => (
                <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-sm">
                        <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{p.name}</p>
                        <div className="flex gap-2 mt-1">
                           <span className="text-[10px] font-mono text-primary font-bold bg-primary/5 px-1.5 rounded">{p.sku}</span>
                           <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{p.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{p.location || 'Depósito Geral'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-right text-primary tabular-nums">
                    R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{p.stock} <span className="text-[10px] text-slate-400 font-normal">{p.unit}</span></span>
                      <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${p.stock > 10 ? 'bg-emerald-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(p.stock * 5, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(p.id); setForm(p); setShowProductModal(true); }} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => { if(confirm('Excluir produto?')) deleteProduct(p.id)}} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{editingId ? 'Editar Produto' : 'Novo Registro de Produto'}</h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Painel de Inventário Corporativo</p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 shadow-sm transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Nome do Produto</label>
                      <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" placeholder="Ex: Cerveja Artesanal 500ml" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Código de Barras (EAN)</label>
                        <div className="flex gap-2">
                          <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none font-mono" placeholder="Bipe ou digite..." />
                          <button type="button" onClick={generateEAN} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 text-slate-500"><span className="material-symbols-outlined text-lg">autorenew</span></button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">SKU / Referência Interna</label>
                        <input type="text" required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none font-mono" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Categoria</label>
                        <input type="text" list="cat-list" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <datalist id="cat-list">
                          {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Unidade</label>
                        <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none">
                          <option value="UN">Unidade (UN)</option>
                          <option value="KG">Quilo (KG)</option>
                          <option value="LT">Litro (LT)</option>
                          <option value="CX">Caixa (CX)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Posição Estoque</label>
                        <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none" placeholder="Ex: Prateleira B1" />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Imagem do Produto (URL ou Local)</label>
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={form.image?.startsWith('data:') ? 'Arquivo Local Carregado' : form.image} 
                              onChange={e => setForm({...form, image: e.target.value})} 
                              className={`w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all ${form.image?.startsWith('data:') ? 'text-primary font-bold italic' : ''}`} 
                              placeholder="https://suaimagem.com/foto.jpg" 
                              readOnly={form.image?.startsWith('data:')}
                            />
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleFileChange} 
                            />
                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-500"
                              title="Carregar do computador"
                            >
                              <span className="material-symbols-outlined">upload_file</span>
                            </button>
                            {form.image?.startsWith('data:') && (
                              <button 
                                type="button" 
                                onClick={() => setForm({...form, image: ''})}
                                className="px-4 bg-rose-100 text-rose-500 rounded-xl hover:bg-rose-200 transition-colors"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 px-1 italic">Dica: Cole um link ou clique no botão para buscar uma imagem no seu computador.</p>
                        </div>
                        <div className="size-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {form.image ? (
                            <img src={form.image} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=Error')} />
                          ) : (
                            <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl space-y-6 flex flex-col justify-center">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Preço de Venda (R$)</label>
                    <input type="number" step="0.01" required value={form.salePrice} onChange={e => setForm({...form, salePrice: parseFloat(e.target.value)})} className="w-full bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-xl p-4 text-2xl font-black text-primary outline-none focus:border-primary transition-all shadow-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Custo Médio (R$)</label>
                    <input type="number" step="0.01" required value={form.costPrice} onChange={e => setForm({...form, costPrice: parseFloat(e.target.value)})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Estoque Inicial</label>
                    <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none" />
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                     <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase">
                        <span>Margem Bruta</span>
                        <span>{form.salePrice && form.costPrice ? (((form.salePrice - form.costPrice) / form.salePrice) * 100).toFixed(1) : '0.0'}%</span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-4 text-sm font-black text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-all">DESCARTAR</button>
                <button type="submit" className="flex-[2] py-4 text-sm font-black text-white bg-primary rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">SALVAR PRODUTO NO SISTEMA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[550px] animate-in zoom-in-95 duration-200">
             <div className="w-full md:w-1/3 border-r border-slate-100 dark:border-slate-800 p-8 flex flex-col justify-between bg-slate-50 dark:bg-slate-900">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-2xl">barcode_scanner</span>
                    </div>
                    <h3 className="text-xl font-black">Recepção</h3>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Foco do Scanner</label>
                    <input 
                      ref={scannerInputRef}
                      autoFocus
                      value={purchaseScanner}
                      onChange={e => setPurchaseScanner(e.target.value)}
                      onKeyDown={handleScanEnter}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-primary rounded-2xl p-4 text-center text-xl font-black outline-none shadow-lg focus:ring-4 focus:ring-primary/20 placeholder:text-slate-300"
                      placeholder="BIPE O ITEM"
                    />
                    <p className="text-[10px] text-center text-slate-400 font-medium">O item será adicionado automaticamente à lista após a bipagem.</p>
                  </div>
                </div>
                <div className="space-y-3">
                   <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                         <span>Itens na Lista</span>
                         <span>{purchaseList.length} un.</span>
                      </div>
                   </div>
                   <button 
                      onClick={handleConfirmPurchase} 
                      disabled={purchaseList.length === 0} 
                      className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                      CONFIRMAR ENTRADA
                    </button>
                    <button onClick={() => setShowPurchaseModal(false)} className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Cancelar</button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 shadow-sm z-10">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Item Conferido</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Quantidade</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Custo Unit.</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {purchaseList.length > 0 ? purchaseList.map((item, idx) => (
                      <tr key={idx} className="animate-in slide-in-from-right-4 duration-300">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{item.product.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{item.product.barcode || item.product.sku}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setPurchaseList(prev => prev.map(p => p.product.id === item.product.id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p))} className="size-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold hover:bg-slate-200 transition-colors">-</button>
                            <span className="text-sm font-black w-8 text-center">{item.quantity}</span>
                            <button onClick={() => setPurchaseList(prev => prev.map(p => p.product.id === item.product.id ? { ...p, quantity: p.quantity + 1 } : p))} className="size-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold hover:bg-slate-200 transition-colors">+</button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={item.cost} 
                            onChange={e => setPurchaseList(prev => prev.map(p => p.product.id === item.product.id ? { ...p, cost: parseFloat(e.target.value) || 0 } : p))}
                            className="w-20 text-right bg-slate-50 dark:bg-slate-800 border-none rounded p-1 text-sm font-bold outline-none focus:ring-1 focus:ring-primary/40" 
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setPurchaseList(prev => prev.filter(p => p.product.id !== item.product.id))} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg p-2 transition-all"><span className="material-symbols-outlined">delete</span></button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center opacity-20">
                            <span className="material-symbols-outlined text-6xl">inventory</span>
                            <p className="text-sm font-black uppercase tracking-widest mt-2">Nenhum item bipado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
