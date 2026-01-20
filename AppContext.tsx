
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, Transaction, TransactionStatus, Customer, User, CartItem, Establishment, UserRole } from './types';

interface AppContextType {
  currentUser: User | null;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  users: User[];
  establishments: Establishment[];
  loading: boolean;
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
  processSale: (items: CartItem[], total: number, method: string, clientId?: string, vendorId?: string, cardDetails?: { installments: number, authNumber: string, transactionSku: string }) => Promise<void>;
  updateStock: (productId: string, quantity: number) => Promise<void>;
  bulkUpdateStock: (adjustments: Record<string, number>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [pRes, tRes, cRes, uRes, eRes] = await Promise.all([
        fetch('/api/products').then(r => r.ok ? r.json() : []),
        fetch('/api/transactions').then(r => r.ok ? r.json() : []),
        fetch('/api/customers').then(r => r.ok ? r.json() : []),
        fetch('/api/users').then(r => r.ok ? r.json() : []),
        fetch('/api/establishments').then(r => r.ok ? r.json() : [])
      ]);
      
      setProducts(pRes);
      setTransactions(tRes);
      setCustomers(cRes);
      setUsers(uRes);
      setEstablishments(eRes);

      // Simular login do primeiro Admin encontrado ou criar um mock
      if (uRes.length > 0) {
        const admin = uRes.find((u: User) => u.role === UserRole.ADMIN) || uRes[0];
        setCurrentUser(admin);
      } else {
        // Fallback para desenvolvimento inicial
        setCurrentUser({
          id: 'admin-001',
          name: 'Carlos Silva',
          email: 'admin@erpretail.com',
          role: UserRole.ADMIN,
          storeId: 'matriz',
          active: true
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados do Neon:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addProduct = async (p: Product) => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    await refreshData();
  };

  const updateProduct = addProduct;

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };
  
  const addCustomer = async (c: Customer) => {
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c)
    });
    await refreshData();
  };

  const addUser = async (u: User) => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u)
    });
    await refreshData();
  };

  const deleteUser = async (id: string) => {
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const transferUser = async (userId: string, newStoreId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const updatedUser = { ...user, storeId: newStoreId };
      await addUser(updatedUser);
    }
  };

  const addEstablishment = async (e: Establishment) => {
    await fetch('/api/establishments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e)
    });
    await refreshData();
  };

  const deleteEstablishment = async (id: string) => {
    await fetch(`/api/establishments?id=${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const addTransaction = async (t: Transaction) => {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t)
    });
    await refreshData();
  };

  const updateStock = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updatedProduct = { ...product, stock: product.stock + quantity };
      await addProduct(updatedProduct);
    }
  };

  const bulkUpdateStock = async (adjustments: Record<string, number>) => {
    for (const [id, stock] of Object.entries(adjustments)) {
      const product = products.find(p => p.id === id);
      if (product) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...product, stock })
        });
      }
    }
    await refreshData();
  };

  const processSale = async (
    items: CartItem[], 
    total: number, 
    method: string, 
    clientId?: string, 
    vendorId?: string,
    cardDetails?: { installments: number, authNumber: string, transactionSku: string }
  ) => {
    for (const item of items) {
       const product = products.find(p => p.id === item.id);
       if (product) {
         await fetch('/api/products', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ ...product, stock: product.stock - item.quantity })
         });
       }
    }

    const customer = customers.find(c => c.id === clientId);
    const newTrx: Transaction = {
      id: `SALE-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      description: `Venda PDV - ${items.length} itens`,
      store: 'Loja Principal',
      category: 'Venda',
      status: TransactionStatus.APPROVED,
      value: total,
      type: 'INCOME',
      method: method,
      client: customer ? customer.name : 'Consumidor Final',
      clientId: clientId,
      vendorId: vendorId,
      items: items,
      installments: cardDetails?.installments,
      authNumber: cardDetails?.authNumber,
      transactionSku: cardDetails?.transactionSku
    };

    await addTransaction(newTrx);
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, products, transactions, customers, users, establishments, loading, addProduct, updateProduct, deleteProduct, 
      addTransaction, addCustomer, addUser, deleteUser, transferUser, addEstablishment, deleteEstablishment, processSale, updateStock, bulkUpdateStock, refreshData
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
