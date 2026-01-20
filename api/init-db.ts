
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Tabela de Configurações Globais (Adicionando LOGO)
    await sql`
      CREATE TABLE IF NOT EXISTS system_configs (
        id TEXT PRIMARY KEY,
        company_name TEXT DEFAULT 'ERP Retail',
        logo_url TEXT,
        tax_regime TEXT DEFAULT 'Simples Nacional',
        allow_negative_stock BOOLEAN DEFAULT FALSE
      )
    `;

    // Garantir que existe uma config inicial
    await sql`
      INSERT INTO system_configs (id, company_name)
      VALUES ('main', 'ERP Retail - Tem Acessório')
      ON CONFLICT (id) DO NOTHING
    `;

    // Tabela de Usuários (Garantindo Senha e StoreID)
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

    // Criar Admin Inicial caso não exista (Para conseguir logar pela primeira vez)
    await sql`
      INSERT INTO users (id, name, email, password, role, store_id, active)
      VALUES ('admin-01', 'Administrador', 'admin@erp.com', 'admin123', 'ADMINISTRADOR', 'matriz', TRUE)
      ON CONFLICT (id) DO NOTHING
    `;

    // Outras tabelas permanecem...
    await sql`CREATE TABLE IF NOT EXISTS establishments (id TEXT PRIMARY KEY, name TEXT NOT NULL, cnpj TEXT, location TEXT, has_stock_access BOOLEAN DEFAULT TRUE, active BOOLEAN DEFAULT TRUE)`;
    await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE, barcode TEXT, category TEXT, cost_price NUMERIC, sale_price NUMERIC, stock INTEGER, image TEXT, brand TEXT, unit TEXT, location TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date TEXT, due_date TEXT, description TEXT, store TEXT, category TEXT, status TEXT, value NUMERIC, type TEXT, method TEXT, client TEXT, client_id TEXT, vendor_id TEXT, items JSONB, installments INTEGER, auth_number TEXT, transaction_sku TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, birth_date TEXT)`;

    return res.status(200).json({ message: 'Sistema pronto! Admin: admin@erp.com / Senha: admin123' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
