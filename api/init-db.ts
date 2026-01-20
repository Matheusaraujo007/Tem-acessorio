
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL não configurada no Vercel' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Tabela de Configurações Globais
    await sql`
      CREATE TABLE IF NOT EXISTS system_configs (
        id TEXT PRIMARY KEY,
        company_name TEXT,
        tax_regime TEXT,
        default_commission NUMERIC,
        allow_negative_stock BOOLEAN DEFAULT FALSE
      )
    `;

    // Tabela de Estabelecimentos
    await sql`
      CREATE TABLE IF NOT EXISTS establishments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cnpj TEXT,
        location TEXT,
        has_stock_access BOOLEAN DEFAULT TRUE,
        active BOOLEAN DEFAULT TRUE
      )
    `;

    // Tabela de Produtos
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        barcode TEXT,
        category TEXT,
        cost_price NUMERIC,
        sale_price NUMERIC,
        stock INTEGER,
        image TEXT,
        brand TEXT,
        unit TEXT,
        location TEXT
      )
    `;

    // Tabela de Transações
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT,
        due_date TEXT,
        description TEXT,
        store TEXT,
        category TEXT,
        status TEXT,
        value NUMERIC,
        type TEXT,
        method TEXT,
        client TEXT,
        client_id TEXT,
        vendor_id TEXT,
        items JSONB,
        installments INTEGER,
        auth_number TEXT,
        transaction_sku TEXT
      )
    `;

    // Tabela de Clientes
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        birth_date TEXT
      )
    `;

    // Tabela de Usuários (Funcionários)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT,
        store_id TEXT,
        active BOOLEAN DEFAULT TRUE,
        avatar TEXT
      )
    `;

    return res.status(200).json({ message: 'Infraestrutura Neon sincronizada com sucesso! Todas as tabelas corporativas estão prontas.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
