
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../AppContext';
import { Product, TransactionStatus, UserRole } from '../types';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, updateStock, addTransaction, currentUser, establishments } = useApp();
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');

  const [showProductModal, setShowProductModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  const [form, setForm] = useState<Partial<Product>>({
    name: '', sku: '', barcode: '', category: '', brand: '', costPrice: 0, salePrice: 0, stock: 0, unit: 'UN', location: '', image: '', isService: false
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
      const matchesType = typeFilter === 'ALL' || (typeFilter === 'SERVICE' ? p.isService : !p.isService);
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [products, filter, categoryFilter, typeFilter]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = form.image || (form.isService ? 'https://picsum.photos/seed/service/400/400' : `https://picsum.photos/seed/${form.sku || Date.now()}/400/400`);
    const productData = { 
      ...form as Product, 
      id: editingId || `prod-${Date.now()}`, 
      image: finalImage,
      stock: form.isService ? 999999 : form.stock // Serviços não precisam de controle de estoque manual
    };
    
    await addProduct(productData);
    setShowProductModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const purchaseTotal = useMemo(() => purchaseList.reduce((acc, item) => acc + (item.cost * item.quantity), 0), [purchaseList]);

  const handleConfirmPurchase = () => {
    if (purchaseList.length === 0) return;
    purchaseList.forEach(item => updateStock(item.product.id, item.quantity));
    addTransaction({
      id: `PURCH-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `Reposição de Estoque (${purchaseList.length} itens)`,
      store: currentStore?.name || 'Matriz São Paulo',
      category: 'Compra de Estoque',
      status: TransactionStatus.PAID,
      value: purchaseTotal,
      type: 'EXPENSE',
      method: 'Transferência/Boleto'
    });
    setPurchaseList([]);
    setShowPurchaseModal(false);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Catálogo Geral</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-tight">Produtos e Serviços Cadastrados</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setEditingId(null); setForm({ name: '', sku: `SRV-${Date.now()}`, category: 'Serviços', isService: true, stock: 0, salePrice: 0, costPrice: 0, unit: 'UN' }); setShowProductModal(true); }} className="flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-lg">build</span> Novo Serviço
          </button>
          <button onClick={() => { setEditingId(null); setForm({ name: '', sku: `SKU-${Date.now()}`, isService: false, stock: 0, salePrice: 0, costPrice: 0, unit: 'UN' }); setShowProductModal(true); }} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-lg">add</span> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px] relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Pesquisar..." className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
           <button onClick={() => setTypeFilter('ALL')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${typeFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>Tudo</button>
           <button onClick={() => setTypeFilter('PRODUCT')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${typeFilter === 'PRODUCT' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>Produtos</button>
           <button onClick={() => setTypeFilter('SERVICE')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${typeFilter === 'SERVICE' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>Serviços</button>
        </div>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-6 text-[10px] font-black uppercase tracking-widest">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo / Item</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Referência</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Preço de Venda</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Disponível</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map(p => (
                <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${p.isService ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                        <span className="material-symbols-outlined">{p.isService ? 'build' : 'shopping_bag'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-tighter">{p.sku}</span>
                  </td>
                  <td className="px-8 py-6 text-sm font-black text-right text-primary tabular-nums">
                    R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-center">
                    {p.isService ? (
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">Disponível</span>
                    ) : (
                      <span className={`text-sm font-black tabular-nums ${p.stock <= 5 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {p.stock} <span className="text-[9px] opacity-50">{p.unit}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(p.id); setForm(p); setShowProductModal(true); }} className="size-10 flex items-center justify-center text-slate-400 hover:text-primary rounded-xl transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => { if(confirm('Excluir item?')) deleteProduct(p.id)}} className="size-10 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-xl transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-white ${form.isService ? 'bg-amber-500' : 'bg-primary'}`}>
              <h3 className="text-2xl font-black uppercase tracking-tight">{form.isService ? 'Novo Serviço' : 'Novo Produto'}</h3>
              <button onClick={() => setShowProductModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-10 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Descrição do {form.isService ? 'Serviço' : 'Produto'}</label>
                    <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold outline-none uppercase" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">SKU / Código Referência</label>
                      <input type="text" required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-mono font-bold uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Categoria</label>
                      <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-black uppercase" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Preço de Venda (R$)</label>
                      <input type="number" step="0.01" required value={form.salePrice} onChange={e => setForm({...form, salePrice: parseFloat(e.target.value)})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-black text-primary tabular-nums" />
                    </div>
                    {!form.isService && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase px-4 tracking-widest">Estoque Inicial</label>
                        <input type="number" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-black" />
                      </div>
                    )}
                  </div>
              </div>

              <button type="submit" className={`w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl text-white ${form.isService ? 'bg-amber-500' : 'bg-primary'}`}>Salvar Registro</button>
            </form>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
    </div>
  );
};

export default Inventory;
