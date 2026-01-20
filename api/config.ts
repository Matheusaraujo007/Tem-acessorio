
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Garante a existência da tabela
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
        const initial = { id: 'main', company_name: 'ERP Retail', tax_regime: 'Simples Nacional' };
        await sql`INSERT INTO system_configs (id, company_name, tax_regime) VALUES ('main', 'ERP Retail', 'Simples Nacional')`;
        return res.status(200).json({
          companyName: initial.company_name,
          logoUrl: '',
          taxRegime: initial.tax_regime,
          allowNegativeStock: false
        });
      }
      
      // MAPEAMENTO: Banco (snake_case) -> Frontend (camelCase)
      const config = data[0];
      return res.status(200).json({
        companyName: config.company_name,
        logoUrl: config.logo_url,
        taxRegime: config.tax_regime,
        allowNegativeStock: config.allow_negative_stock
      });
    }

    if (req.method === 'POST') {
      const { companyName, logoUrl, taxRegime, allowNegativeStock } = req.body;
      
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
    return res.status(500).json({ error: error.message });
  }
}
