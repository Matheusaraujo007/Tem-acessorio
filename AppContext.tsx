
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, Transaction, TransactionStatus, Customer, User, CartItem } from './types';
import { MOCK_PRODUCTS, MOCK_TRANSACTIONS, MOCK_CUSTOMERS, MOCK_USERS } from './constants';

interface AppContextType {
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  users: User[];
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  addTransaction: (t: Transaction) => void;
  addCustomer: (c: Customer) => void;
  processSale: (items: CartItem[], total: number, method: string, clientId?: string, vendorId?: string, cardDetails?: { installments: number, authNumber: string, transactionSku: string }) => void;
  updateStock: (productId: string, quantity: number) => void;
  bulkUpdateStock: (adjustments: Record<string, number>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [users] = useState<User[]>(MOCK_USERS);

  const addProduct = (p: Product) => setProducts(prev => [p, ...prev]);
  const updateProduct = (p: Product) => setProducts(prev => prev.map(item => item.id === p.id ? p : item));
  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  
  const addCustomer = (c: Customer) => setCustomers(prev => [c, ...prev]);
  const addTransaction = (t: Transaction) => setTransactions(prev => [t, ...prev]);

  const updateStock = (productId: string, quantity: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, stock: p.stock + quantity };
      }
      return p;
    }));
  };

  const bulkUpdateStock = (adjustments: Record<string, number>) => {
    setProducts(prev => prev.map(p => {
      if (adjustments[p.id] !== undefined) {
        return { ...p, stock: adjustments[p.id] };
      }
      return p;
    }));
  };

  const processSale = (
    items: CartItem[], 
    total: number, 
    method: string, 
    clientId?: string, 
    vendorId?: string,
    cardDetails?: { installments: number, authNumber: string, transactionSku: string }
  ) => {
    items.forEach(item => {
      updateStock(item.id, -item.quantity);
    });

    const customer = customers.find(c => c.id === clientId);
    const vendor = users.find(u => u.id === vendorId);

    const newTrx: Transaction = {
      id: `SALE-${Math.floor(Math.random() * 100000)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      description: `Venda PDV - ${items.length} itens`,
      store: 'Matriz São Paulo',
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
    addTransaction(newTrx);
  };

  return (
    <AppContext.Provider value={{ 
      products, transactions, customers, users, addProduct, updateProduct, deleteProduct, 
      addTransaction, addCustomer, processSale, updateStock, bulkUpdateStock
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
