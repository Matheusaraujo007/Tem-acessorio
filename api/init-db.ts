
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Tabela de Configurações Globais
    await sql`
      CREATE TABLE IF NOT EXISTS system_configs (
        id TEXT PRIMARY KEY,
        company_name TEXT DEFAULT 'ERP Retail',
        logo_url TEXT,
        tax_regime TEXT DEFAULT 'Simples Nacional',
        allow_negative_stock BOOLEAN DEFAULT FALSE
      )
    `;

    // Tabela de Permissões por Cargo
    await sql`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role TEXT PRIMARY KEY,
        permissions JSONB NOT NULL
      )
    `;

    // Reset/Update da config principal
    await sql`
      INSERT INTO system_configs (id, company_name)
      VALUES ('main', 'ERP Retail')
      ON CONFLICT (id) DO NOTHING
    `;

    // Inserir permissões padrão para cada cargo se não existirem
    const defaultPerms = {
      dashboard: true, pdv: true, customers: true, reports: true, 
      inventory: true, balance: true, incomes: true, expenses: true, 
      financial: true, settings: false
    };

    await sql`INSERT INTO role_permissions (role, permissions) VALUES ('GERENTE', ${JSON.stringify({...defaultPerms, settings: false})}) ON CONFLICT (role) DO NOTHING`;
    await sql`INSERT INTO role_permissions (role, permissions) VALUES ('CAIXA', ${JSON.stringify({...defaultPerms, reports: false, financial: false, inventory: false, balance: false, settings: false})}) ON CONFLICT (role) DO NOTHING`;
    await sql`INSERT INTO role_permissions (role, permissions) VALUES ('VENDEDOR', ${JSON.stringify({...defaultPerms, reports: false, financial: false, inventory: false, balance: false, settings: false, incomes: false, expenses: false})}) ON CONFLICT (role) DO NOTHING`;
    await sql`INSERT INTO role_permissions (role, permissions) VALUES ('ADMINISTRADOR', ${JSON.stringify({...defaultPerms, settings: true})}) ON CONFLICT (role) DO NOTHING`;

    // Tabela de Usuários
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL DEFAULT '123456',
        role TEXT NOT NULL,
        store_id TEXT,
        active BOOLEAN DEFAULT TRUE,
        avatar TEXT
      )
    `;

    // Admin Inicial
    await sql`
      INSERT INTO users (id, name, email, password, role, store_id, active)
      VALUES ('admin-01', 'Administrador', 'admin@erp.com', 'admin123', 'ADMINISTRADOR', 'matriz', TRUE)
      ON CONFLICT (id) DO NOTHING
    `;

    // Demais tabelas
    await sql`CREATE TABLE IF NOT EXISTS establishments (id TEXT PRIMARY KEY, name TEXT NOT NULL, cnpj TEXT, location TEXT, has_stock_access BOOLEAN DEFAULT TRUE, active BOOLEAN DEFAULT TRUE)`;
    await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE, barcode TEXT, category TEXT, cost_price NUMERIC, sale_price NUMERIC, stock INTEGER, image TEXT, brand TEXT, unit TEXT, location TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date TEXT, due_date TEXT, description TEXT, store TEXT, category TEXT, status TEXT, value NUMERIC, type TEXT, method TEXT, client TEXT, client_id TEXT, vendor_id TEXT, items JSONB, installments INTEGER, auth_number TEXT, transaction_sku TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, birth_date TEXT)`;

    return res.status(200).json({ message: 'Banco Neon Sincronizado!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
