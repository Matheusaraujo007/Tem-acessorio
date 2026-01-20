
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  image: string;
  brand?: string;
  unit?: string;
  weight?: string;
  location?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export enum TransactionStatus {
  PAID = 'PAGO',
  PENDING = 'PENDENTE',
  OVERDUE = 'ATRASADO',
  APPROVED = 'APROVADO'
}

export interface Transaction {
  id: string;
  date: string;
  dueDate?: string;
  description: string;
  store: string;
  category: string;
  status: TransactionStatus;
  value: number;
  type: 'INCOME' | 'EXPENSE';
  method?: string;
  client?: string;
  clientId?: string;
  vendorId?: string;
  items?: CartItem[];
  installments?: number;
  authNumber?: string;
  transactionSku?: string;
}

export interface BalanceItem {
  productId: string;
  expected: number;
  counted: number;
}

export interface BalanceSession {
  id: string;
  date: string;
  status: 'OPEN' | 'FINISHED';
  items: Record<string, number>; // productId -> countedQuantity
}

export enum UserRole {
  ADMIN = 'ADMINISTRADOR',
  MANAGER = 'GERENTE',
  CASHIER = 'CAIXA',
  VENDOR = 'VENDEDOR'
}

export interface RolePermissions {
  dashboard: boolean;
  pdv: boolean;
  customers: boolean;
  reports: boolean;
  inventory: boolean;
  balance: boolean;
  incomes: boolean;
  expenses: boolean;
  financial: boolean;
  settings: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
  active: boolean;
  avatar?: string;
  password?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
}

export interface Establishment {
  id: string;
  name: string;
  cnpj: string;
  location: string;
  hasStockAccess: boolean;
  active: boolean;
}

export interface DRERow {
  label: string;
  value: number;
  avPercent: number;
  trend: number;
  isSubtotal?: boolean;
  isNegative?: boolean;
  indent?: boolean;
}
