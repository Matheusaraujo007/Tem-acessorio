
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL não configurada no Vercel' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Criar Tabela de Produtos
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

    // Criar Tabela de Transações
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

    // Criar Tabela de Clientes
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        birth_date TEXT
      )
    `;

    return res.status(200).json({ message: 'Banco de dados Neon inicializado com sucesso! As tabelas de Produtos, Vendas e Clientes estão prontas.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
