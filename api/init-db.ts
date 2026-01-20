
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    await sql`CREATE TABLE IF NOT EXISTS system_configs (id TEXT PRIMARY KEY, company_name TEXT, logo_url TEXT, tax_regime TEXT, allow_negative_stock BOOLEAN)`;
    await sql`CREATE TABLE IF NOT EXISTS role_permissions (role TEXT PRIMARY KEY, permissions JSONB NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, password TEXT DEFAULT '123456', role TEXT NOT NULL, store_id TEXT, active BOOLEAN, avatar TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS establishments (id TEXT PRIMARY KEY, name TEXT NOT NULL, cnpj TEXT, location TEXT, has_stock_access BOOLEAN, active BOOLEAN)`;
    await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE, barcode TEXT, category TEXT, cost_price NUMERIC, sale_price NUMERIC, stock INTEGER, image TEXT, brand TEXT, unit TEXT, location TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date TEXT, due_date TEXT, description TEXT, store TEXT, category TEXT, status TEXT, value NUMERIC, type TEXT, method TEXT, client TEXT, client_id TEXT, vendor_id TEXT, items JSONB, installments INTEGER, auth_number TEXT, transaction_sku TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, birth_date TEXT)`;
    
    // Adicionar colunas de comissão se não existirem
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_active BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0`;
    } catch (e) { console.log("Colunas de comissão já existem ou erro ao criar."); }

    await sql`
      CREATE TABLE IF NOT EXISTS service_orders (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        items JSONB NOT NULL,
        total_value NUMERIC NOT NULL,
        technician_name TEXT,
        expected_date TEXT,
        store TEXT NOT NULL
      )
    `;

    return res.status(200).json({ message: 'Banco Neon Sincronizado com Sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
