
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../AppContext';
import { Product, TransactionStatus, UserRole } from '../types';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, updateStock, addTransaction, currentUser, establishments } = useApp();
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  const [form, setForm] = useState<Partial<Product>>({
    name: '', sku: '', barcode: '', category: '', brand: '', costPrice: 0, salePrice: 0, stock: 0, unit: 'UN', location: '', image: '', isService: false
  });

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

  // Cálculo de Margem em tempo real
  const margin = useMemo(() => {
    if (!form.costPrice || !form.salePrice) return 0;
    const profit = form.salePrice - form.costPrice;
    return (profit / form.costPrice) * 100;
  }, [form.costPrice, form.salePrice]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = form.image || (form.isService ? 'https://picsum.photos/seed/service/400/400' : `https://picsum.photos/seed/${form.sku || Date.now()}/400/400`);
    const productData = { 
      ...form as Product, 
      id: editingId || `prod-${Date.now()}`, 
      image: finalImage,
      stock: form.isService ? 999999 : (form.stock || 0)
    };
    
    await addProduct(productData);
    setShowProductModal(false);
    setEditingId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const openNewProduct = () => {
    setEditingId(null);
    setForm({ 
      name: '', sku: `SKU-${Date.now()}`, barcode: '', category: '', brand: '', 
      costPrice: 0, salePrice: 0, stock: 0, unit: 'UN', location: '', image: '', isService: false 
    });
    setShowProductModal(true);
  };

  const openNewService = () => {
    setEditingId(null);
    setForm({ 
      name: '', sku: `SRV-${Date.now()}`, category: 'Serviços', isService: true, 
      stock: 999999, salePrice: 0, costPrice: 0, unit: 'UN' 
    });
    setShowProductModal(true);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Inventário & Catálogo</h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-tight">Controle central de ativos e serviços</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openNewService} className="flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-lg">build</span> Novo Serviço
          </button>
          <button onClick={openNewProduct} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-lg">add_shopping_cart</span> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px] relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Bipar código ou digitar nome..." className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
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
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Item</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Referências</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Financeiro</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Estoque</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map(p => (
                <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-700 shadow-inner group-hover:scale-110 transition-transform">
                        <img src={p.image} className="size-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.brand || 'Marca não inf.'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono font-black text-primary uppercase">SKU: {p.sku}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{p.barcode || 'S/ BARRAS'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm font-black text-primary tabular-nums">Venda: R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Custo: R$ {p.costPrice.toLocaleString('pt-BR')}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    {p.isService ? (
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">Serviço</span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-black tabular-nums ${p.stock <= 5 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>{p.stock}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">{p.unit} • {p.location || 'S/ Loc.'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(p.id); setForm(p); setShowProductModal(true); }} className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary rounded-xl transition-all shadow-sm"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => { if(confirm('Excluir item do catálogo permanentemente?')) deleteProduct(p.id)}} className="size-10 flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL COMPLEXO DE CADASTRO */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className={`p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-white ${form.isService ? 'bg-amber-500' : 'bg-primary'}`}>
              <div className="flex items-center gap-4">
                 <span className="material-symbols-outlined text-3xl">{form.isService ? 'construction' : 'inventory_2'}</span>
                 <h3 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'Editar Registro' : (form.isService ? 'Novo Serviço' : 'Novo Produto')}</h3>
              </div>
              <button onClick={() => setShowProductModal(false)} className="size-10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                 {/* COLUNA ESQUERDA: IMAGEM E INFOS BÁSICAS */}
                 <div className="lg:col-span-4 space-y-8">
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identidade Visual</p>
                       <div className="aspect-square w-full bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          {form.image ? (
                             <img src={form.image} className="size-full object-cover" />
                          ) : (
                             <>
                                <span className="material-symbols-outlined text-6xl text-slate-300">add_photo_alternate</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase mt-2">Upload Imagem</span>
                             </>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-xs uppercase">Trocar Foto</div>
                       </div>
                       <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4">
                       <p className="text-[10px] font-black text-primary uppercase tracking-widest text-center">Resumo do Cadastro</p>
                       <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Margem Bruta</span>
                          <span className={`text-sm font-black ${margin >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>{margin.toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Lucro por Un.</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">R$ {( (form.salePrice || 0) - (form.costPrice || 0) ).toLocaleString('pt-BR')}</span>
                       </div>
                    </div>
                 </div>

                 {/* COLUNA DIREITA: CAMPOS TÉCNICOS */}
                 <div className="lg:col-span-8 space-y-10">
                    {/* SEÇÃO 1: INFORMAÇÃO BÁSICA */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="material-symbols-outlined text-slate-400 text-lg">info</span>
                          <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Informação Básica</h4>
                       </div>
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Nome Comercial / Descrição</label>
                             <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold uppercase focus:ring-2 focus:ring-primary/20" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Categoria</label>
                                <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-black uppercase" placeholder="Ex: Acessórios" />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Marca / Fabricante</label>
                                <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-black uppercase" placeholder="Ex: Samsung" />
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">SKU (Código Interno)</label>
                                <input type="text" required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-mono font-bold uppercase" />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Código de Barras (EAN)</label>
                                <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-mono font-bold" placeholder="789..." />
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* SEÇÃO 2: PRECIFICAÇÃO */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="material-symbols-outlined text-slate-400 text-lg">payments</span>
                          <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Precificação</h4>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Preço de Custo (R$)</label>
                             <input type="number" step="0.01" required value={form.costPrice} onChange={e => setForm({...form, costPrice: parseFloat(e.target.value)})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-black text-rose-500 tabular-nums" />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Preço de Venda (R$)</label>
                             <input type="number" step="0.01" required value={form.salePrice} onChange={e => setForm({...form, salePrice: parseFloat(e.target.value)})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-black text-primary tabular-nums" />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Unidade</label>
                             <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-black uppercase">
                                <option value="UN">UNIDADE (UN)</option>
                                <option value="KG">QUILO (KG)</option>
                                <option value="LT">LITRO (LT)</option>
                                <option value="CX">CAIXA (CX)</option>
                                <option value="MT">METRO (MT)</option>
                             </select>
                          </div>
                       </div>
                    </div>

                    {/* SEÇÃO 3: LOGÍSTICA (APENAS PRODUTO) */}
                    {!form.isService && (
                       <div className="space-y-6">
                          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                             <span className="material-symbols-outlined text-slate-400 text-lg">inventory</span>
                             <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Estoque & Logística</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Saldo em Estoque</label>
                                <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-lg font-black" />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">Localização Interna</label>
                                <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold uppercase" placeholder="Ex: Gôndola A-12" />
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
              
              <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                 <button type="submit" className={`w-full h-20 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 text-white ${form.isService ? 'bg-amber-500 shadow-amber-500/20' : 'bg-primary shadow-primary/20'}`}>
                    {editingId ? 'Confirmar Alterações' : (form.isService ? 'Cadastrar Novo Serviço' : 'Efetivar Cadastro de Produto')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
    </div>
  );
};

export default Inventory;
