
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Tabelas Base
    await sql`CREATE TABLE IF NOT EXISTS system_configs (id TEXT PRIMARY KEY, company_name TEXT DEFAULT 'ERP Retail', logo_url TEXT, tax_regime TEXT, allow_negative_stock BOOLEAN DEFAULT FALSE, return_period_days INTEGER DEFAULT 30)`;
    await sql`CREATE TABLE IF NOT EXISTS role_permissions (role TEXT PRIMARY KEY, permissions JSONB NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, password TEXT DEFAULT '123456', role TEXT NOT NULL, store_id TEXT, active BOOLEAN DEFAULT TRUE, avatar TEXT, commission_active BOOLEAN DEFAULT FALSE, commission_rate NUMERIC DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS establishments (id TEXT PRIMARY KEY, name TEXT NOT NULL, cnpj TEXT, location TEXT, has_stock_access BOOLEAN DEFAULT TRUE, active BOOLEAN DEFAULT TRUE, logo_url TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE, barcode TEXT, category TEXT, cost_price NUMERIC, sale_price NUMERIC, stock INTEGER DEFAULT 0, image TEXT, brand TEXT, unit TEXT, location TEXT, is_service BOOLEAN DEFAULT FALSE)`;
    await sql`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date TEXT, due_date TEXT, description TEXT, store TEXT, category TEXT, status TEXT, value NUMERIC, shipping_value NUMERIC DEFAULT 0, type TEXT, method TEXT, client TEXT, client_id TEXT, vendor_id TEXT, items JSONB, installments INTEGER, auth_number TEXT, transaction_sku TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, birth_date TEXT, cpf_cnpj TEXT, zip_code TEXT, address TEXT, number TEXT, complement TEXT, neighborhood TEXT, city TEXT, state TEXT, notes TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS service_orders (id TEXT PRIMARY KEY, date TEXT NOT NULL, customer_id TEXT NOT NULL, customer_name TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, items JSONB NOT NULL, total_value NUMERIC NOT NULL, technician_name TEXT, expected_date TEXT, store TEXT NOT NULL)`;

    // Migrações
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS other_costs_percent NUMERIC DEFAULT 0`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 0`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS max_discount_percent NUMERIC DEFAULT 0`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent NUMERIC DEFAULT 0`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0`; } catch(e) {}

    try { await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shipping_value NUMERIC DEFAULT 0`; } catch(e) {}
    try { await sql`ALTER TABLE establishments ADD COLUMN IF NOT EXISTS logo_url TEXT`; } catch(e) {}
    try { await sql`ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS return_period_days INTEGER DEFAULT 30`; } catch(e) {}
    try { 
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip_code TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS number TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS complement TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT`;
    } catch(e) {}

    return res.status(200).json({ message: 'Banco de Dados Neon Sincronizado com Sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
