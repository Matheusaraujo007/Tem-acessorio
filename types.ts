
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
  isService?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export enum TransactionStatus {
  PAID = 'PAGO',
  PENDING = 'PENDENTE',
  OVERDUE = 'ATRASADO',
  APPROVED = 'ATRASADO'
}

export enum ServiceOrderStatus {
  OPEN = 'ABERTA',
  IN_PROGRESS = 'EM ANDAMENTO',
  FINISHED = 'CONCLUÍDA',
  CANCELLED = 'CANCELADA'
}

export interface ServiceOrder {
  id: string;
  date: string;
  customerName: string;
  customerId: string;
  description: string;
  status: ServiceOrderStatus;
  items: CartItem[];
  totalValue: number;
  technicianName?: string;
  expectedDate?: string;
  store: string;
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
  shippingValue?: number;
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
  active: boolean;
  avatar?: string;
  password?: string;
  commissionActive?: boolean;
  commissionRate?: number;
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
  serviceOrders: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  cpfCnpj?: string;
  zipCode?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface Establishment {
  id: string;
  name: string;
  cnpj: string;
  location: string;
  hasStockAccess: boolean;
  active: boolean;
  logoUrl?: string;
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
