
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, Transaction, TransactionStatus, Customer, User, CartItem, Establishment, UserRole, RolePermissions, ServiceOrder, ServiceOrderStatus } from './types';

interface SystemConfig {
  companyName: string;
  logoUrl?: string;
  taxRegime: string;
  allowNegativeStock: boolean;
  returnPeriodDays: number;
}

interface AppContextType {
  currentUser: User | null;
  systemConfig: SystemConfig;
  rolePermissions: Record<UserRole, RolePermissions>;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  users: User[];
  serviceOrders: ServiceOrder[];
  establishments: Establishment[];
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateConfig: (config: SystemConfig) => Promise<void>;
  updateRolePermissions: (role: UserRole, perms: RolePermissions) => Promise<void>;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  addUser: (u: User) => Promise<void>;
  updateSelf: (u: User) => Promise<void>;
  addServiceOrder: (os: ServiceOrder) => Promise<void>;
  updateServiceOrder: (os: ServiceOrder) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addEstablishment: (e: Establishment) => Promise<void>;
  deleteEstablishment: (id: string) => Promise<void>;
  processSale: (items: CartItem[], total: number, method: string, clientId?: string, vendorId?: string, shippingValue?: number, cardDetails?: { installments?: number; authNumber?: string; transactionSku?: string }) => Promise<void>;
  updateStock: (productId: string, quantity: number) => Promise<void>;
  bulkUpdateStock: (adjustments: Record<string, number>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_USER: User = {
  id: 'admin-01',
  name: 'Administrador Sistema',
  email: 'admin@erp.com',
  role: UserRole.ADMIN,
  storeId: 'matriz',
  active: true,
  avatar: 'https://picsum.photos/seed/admin/100/100'
};

const INITIAL_PERMS: Record<UserRole, RolePermissions> = {
  [UserRole.ADMIN]: { dashboard: true, pdv: true, customers: true, reports: true, inventory: true, balance: true, incomes: true, expenses: true, financial: true, settings: true, serviceOrders: true },
  [UserRole.MANAGER]: { dashboard: true, pdv: true, customers: true, reports: true, inventory: true, balance: true, incomes: true, expenses: true, financial: true, settings: false, serviceOrders: true },
  [UserRole.CASHIER]: { dashboard: true, pdv: true, customers: true, reports: false, inventory: false, balance: false, incomes: true, expenses: false, financial: false, settings: false, serviceOrders: true },
  [UserRole.VENDOR]: { dashboard: true, pdv: true, customers: true, reports: false, inventory: false, balance: false, incomes: false, expenses: false, financial: false, settings: false, serviceOrders: true },
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USER);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, RolePermissions>>(INITIAL_PERMS);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    companyName: 'Retail Cloud ERP', logoUrl: '', taxRegime: 'Simples Nacional', allowNegativeStock: false, returnPeriodDays: 30
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const responses = await Promise.all([
        fetch('/api/products').then(r => r.json()).catch(() => []),
        fetch('/api/transactions').then(r => r.json()).catch(() => []),
        fetch('/api/customers').then(r => r.json()).catch(() => []),
        fetch('/api/users').then(r => r.json()).catch(() => []),
        fetch('/api/establishments').then(r => r.json()).catch(() => []),
        fetch('/api/service-orders').then(r => r.json()).catch(() => []),
        fetch('/api/config').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/permissions').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      
      setProducts(responses[0]);
      setTransactions(responses[1]);
      setCustomers(responses[2]);
      setUsers(responses[3]);
      setEstablishments(responses[4]);
      setServiceOrders(responses[5]);
      
      if (responses[6]) setSystemConfig(responses[6]);
      if (responses[7] && Array.isArray(responses[7])) {
        const permsMap = { ...INITIAL_PERMS };
        responses[7].forEach((p: any) => { permsMap[p.role as UserRole] = p.permissions; });
        setRolePermissions(permsMap);
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/init-db').finally(() => refreshData());
  }, []);

  const login = async (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) { setCurrentUser(user); return true; }
    return false;
  };

  const logout = () => setCurrentUser(DEFAULT_USER);

  const addServiceOrder = async (os: ServiceOrder) => {
    await fetch('/api/service-orders', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(os)});
    await refreshData();
  };

  const updateServiceOrder = async (os: ServiceOrder) => {
    await addServiceOrder(os);
  };

  const addProduct = async (p: Product) => { await fetch('/api/products', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p)}); await refreshData(); };
  const addTransaction = async (t: Transaction) => { await fetch('/api/transactions', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(t)}); await refreshData(); };
  const addCustomer = async (c: Customer) => { await fetch('/api/customers', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(c)}); await refreshData(); };
  const addUser = async (u: User) => { await fetch('/api/users', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(u)}); await refreshData(); };
  const addEstablishment = async (e: Establishment) => { await fetch('/api/establishments', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(e)}); await refreshData(); };

  const processSale = async (items: CartItem[], total: number, method: string, clientId?: string, vendorId?: string, shippingValue: number = 0, cardDetails?: any) => {
    for (const item of items) {
       const p = products.find(x => x.id === item.id);
       if (p && !p.isService) await fetch('/api/products', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...p, stock: p.stock - item.quantity})});
    }

    const client = customers.find(c => c.id === clientId);
    await addTransaction({
      id: `SALE-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `Venda PDV`,
      store: establishments.find(e => e.id === currentUser?.storeId)?.name || 'Principal',
      category: 'Venda',
      status: TransactionStatus.PAID,
      value: total,
      shippingValue: shippingValue,
      type: 'INCOME',
      method,
      clientId,
      client: client?.name || 'Consumidor Final',
      vendorId,
      items,
      ...cardDetails
    });
    await refreshData();
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, systemConfig, rolePermissions, products, transactions, customers, users, serviceOrders, establishments, loading, login, logout, 
      addProduct, updateProduct: addProduct, deleteProduct: (id) => {}, addTransaction, addCustomer, addUser, updateSelf: addUser, addServiceOrder, updateServiceOrder,
      deleteUser: (id) => {}, addEstablishment, deleteEstablishment: (id) => {}, processSale, updateStock: (id, q) => {}, bulkUpdateStock: (a) => {}, refreshData,
      updateConfig: async (conf) => { await fetch('/api/config', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(conf)}); refreshData(); }, 
      updateRolePermissions: async (role, perms) => { await fetch('/api/permissions', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({role, permissions: perms})}); refreshData(); }
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
