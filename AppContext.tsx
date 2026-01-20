
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
        fetch('/api/products').then(r => r.ok ? r.json() : []),
        fetch('/api/transactions').then(r => r.ok ? r.json() : []),
        fetch('/api/customers').then(r => r.ok ? r.json() : [])
      ]);
      
      setProducts(pRes);
      setTransactions(tRes);
      setCustomers(cRes);
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
    // Implementar DELETE na API no futuro se desejar remover fisicamente
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
    // 1. Atualizar estoque de cada item no banco
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

    // 2. Salvar transação
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
