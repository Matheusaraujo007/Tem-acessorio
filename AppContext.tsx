
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, Transaction, TransactionStatus, Customer, User, CartItem, Establishment, UserRole } from './types';

interface SystemConfig {
  companyName: string;
  logoUrl?: string;
  taxRegime: string;
  allowNegativeStock: boolean;
}

interface AppContextType {
  currentUser: User | null;
  systemConfig: SystemConfig;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  users: User[];
  establishments: Establishment[];
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateConfig: (config: SystemConfig) => Promise<void>;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  addUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  transferUser: (userId: string, newStoreId: string) => Promise<void>;
  addEstablishment: (e: Establishment) => Promise<void>;
  deleteEstablishment: (id: string) => Promise<void>;
  // Fixed processSale signature to accept cardDetails as 6th argument
  processSale: (items: CartItem[], total: number, method: string, clientId?: string, vendorId?: string, cardDetails?: { installments?: number; authNumber?: string; transactionSku?: string }) => Promise<void>;
  updateStock: (productId: string, quantity: number) => Promise<void>;
  bulkUpdateStock: (adjustments: Record<string, number>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erp_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    companyName: 'ERP Retail',
    logoUrl: '',
    taxRegime: 'Simples Nacional',
    allowNegativeStock: false
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [pRes, tRes, cRes, uRes, eRes, confRes] = await Promise.all([
        fetch('/api/products').then(r => r.ok ? r.json() : []),
        fetch('/api/transactions').then(r => r.ok ? r.json() : []),
        fetch('/api/customers').then(r => r.ok ? r.json() : []),
        fetch('/api/users').then(r => r.ok ? r.json() : []),
        fetch('/api/establishments').then(r => r.ok ? r.json() : []),
        fetch('/api/config').then(r => r.ok ? r.json() : null)
      ]);
      
      setProducts(pRes);
      setTransactions(tRes);
      setCustomers(cRes);
      setUsers(uRes);
      setEstablishments(eRes);
      
      if (confRes) {
        setSystemConfig({
          companyName: confRes.company_name || 'ERP Retail',
          logoUrl: confRes.logo_url || '',
          taxRegime: confRes.tax_regime || 'Simples Nacional',
          allowNegativeStock: !!confRes.allow_negative_stock
        });
      }
    } catch (error) {
      console.error("Erro na sincronização Neon:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const login = async (email: string, pass: string) => {
    // Busca na lista de usuários já carregada (ou faria um fetch específico por segurança)
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('erp_session', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('erp_session');
  };

  const updateConfig = async (config: SystemConfig) => {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    await refreshData();
  };

  // Funções de CRUD (Mesma lógica mas usando refreshData no final)
  const addProduct = async (p: Product) => { await fetch('/api/products', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p)}); await refreshData(); };
  const addCustomer = async (c: Customer) => { await fetch('/api/customers', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(c)}); await refreshData(); };
  const addUser = async (u: User) => { await fetch('/api/users', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(u)}); await refreshData(); };
  const deleteUser = async (id: string) => { await fetch(`/api/users?id=${id}`, { method: 'DELETE' }); await refreshData(); };
  const addEstablishment = async (e: Establishment) => { await fetch('/api/establishments', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(e)}); await refreshData(); };
  const deleteEstablishment = async (id: string) => { await fetch(`/api/establishments?id=${id}`, { method: 'DELETE' }); await refreshData(); };
  const addTransaction = async (t: Transaction) => { await fetch('/api/transactions', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(t)}); await refreshData(); };
  const transferUser = async (userId: string, newStoreId: string) => { const user = users.find(u => u.id === userId); if(user) await addUser({...user, storeId: newStoreId}); };
  const updateStock = async (id: string, qty: number) => { const p = products.find(x => x.id === id); if(p) await addProduct({...p, stock: p.stock + qty}); };
  const bulkUpdateStock = async (adjs: Record<string, number>) => { for(const [id, stock] of Object.entries(adjs)) { const p = products.find(x => x.id === id); if(p) await fetch('/api/products', {method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...p, stock})}); } await refreshData(); };

  // Fixed processSale implementation to accept cardDetails as 6th argument
  const processSale = async (items: CartItem[], total: number, method: string, clientId?: string, vendorId?: string, cardDetails?: { installments?: number; authNumber?: string; transactionSku?: string }) => {
    for (const item of items) {
       const p = products.find(x => x.id === item.id);
       if (p) await fetch('/api/products', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...p, stock: p.stock - item.quantity})});
    }
    const customer = customers.find(c => c.id === clientId);
    await addTransaction({
      id: `SALE-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `Venda PDV - ${items.length} itens`,
      store: establishments.find(e => e.id === currentUser?.storeId)?.name || 'Principal',
      category: 'Venda',
      status: TransactionStatus.APPROVED,
      value: total,
      type: 'INCOME',
      method,
      client: customer?.name || 'Consumidor Final',
      clientId,
      vendorId,
      items,
      ...cardDetails
    });
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, systemConfig, products, transactions, customers, users, establishments, loading, login, logout, updateConfig,
      addProduct, updateProduct: addProduct, deleteProduct: (id) => deleteUser(id), addTransaction, addCustomer, addUser, deleteUser, transferUser, addEstablishment, deleteEstablishment, processSale, updateStock, bulkUpdateStock, refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
