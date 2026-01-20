
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, Transaction, TransactionStatus, Customer, User, CartItem } from './types';
import { MOCK_USERS } from './constants';

interface AppContextType {
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  users: User[];
  loading: boolean;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  processSale: (items: CartItem[], total: number, method: string, clientId?: string, vendorId?: string, cardDetails?: { installments: number, authNumber: string, transactionSku: string }) => Promise<void>;
  updateStock: (productId: string, quantity: number) => Promise<void>;
  bulkUpdateStock: (adjustments: Record<string, number>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [pRes, tRes, cRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/transactions'),
        fetch('/api/customers')
      ]);
      
      if (pRes.ok) setProducts(await pRes.json());
      if (tRes.ok) setTransactions(await tRes.json());
      if (cRes.ok) setCustomers(await cRes.json());
    } catch (error) {
      console.error("Erro ao carregar dados do banco:", error);
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

  const updateProduct = addProduct; // No Neon usamos ON CONFLICT para update

  const deleteProduct = async (id: string) => {
    // Implementar DELETE na API se necessário
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
      await addProduct({ ...product, stock: product.stock + quantity });
    }
  };

  const bulkUpdateStock = async (adjustments: Record<string, number>) => {
    for (const [id, stock] of Object.entries(adjustments)) {
      const product = products.find(p => p.id === id);
      if (product) {
        await addProduct({ ...product, stock });
      }
    }
  };

  const processSale = async (
    items: CartItem[], 
    total: number, 
    method: string, 
    clientId?: string, 
    vendorId?: string,
    cardDetails?: { installments: number, authNumber: string, transactionSku: string }
  ) => {
    // Atualizar estoque local para velocidade
    for (const item of items) {
       await updateStock(item.id, -item.quantity);
    }

    const customer = customers.find(c => c.id === clientId);
    const newTrx: Transaction = {
      id: `SALE-${Math.floor(Math.random() * 100000)}`,
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
      products, transactions, customers, users, loading, addProduct, updateProduct, deleteProduct, 
      addTransaction, addCustomer, processSale, updateStock, bulkUpdateStock, refreshData
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
