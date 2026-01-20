
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Garantir que a tabela existe antes de qualquer operação para evitar erro 500
    await sql`
      CREATE TABLE IF NOT EXISTS system_configs (
        id TEXT PRIMARY KEY,
        company_name TEXT DEFAULT 'ERP Retail',
        logo_url TEXT,
        tax_regime TEXT DEFAULT 'Simples Nacional',
        allow_negative_stock BOOLEAN DEFAULT FALSE
      )
    `;

    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM system_configs WHERE id = 'main'`;
      if (data.length === 0) {
        // Se não existir, cria o padrão e retorna
        await sql`INSERT INTO system_configs (id, company_name) VALUES ('main', 'ERP Retail')`;
        return res.status(200).json({ id: 'main', company_name: 'ERP Retail' });
      }
      return res.status(200).json(data[0]);
    }

    if (req.method === 'POST') {
      const { companyName, logoUrl, taxRegime, allowNegativeStock } = req.body;
      
      // UPSERT robusto
      await sql`
        INSERT INTO system_configs (id, company_name, logo_url, tax_regime, allow_negative_stock)
        VALUES ('main', ${companyName}, ${logoUrl}, ${taxRegime}, ${allowNegativeStock})
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          logo_url = EXCLUDED.logo_url,
          tax_regime = EXCLUDED.tax_regime,
          allow_negative_stock = EXCLUDED.allow_negative_stock
      `;
      
      return res.status(200).json({ success: true });
    }
  } catch (error: any) {
    console.error("Erro crítico na API de Config:", error);
    return res.status(500).json({ error: error.message });
  }
}
