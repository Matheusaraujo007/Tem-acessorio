
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const data = await sql`SELECT * FROM system_configs WHERE id = 'main'`;
      return res.status(200).json(data[0] || {});
    }

    if (req.method === 'POST') {
      const { companyName, logoUrl, taxRegime, allowNegativeStock } = req.body;
      
      // UPSERT: Se não existir o ID 'main', ele insere. Se existir, ele atualiza.
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
    console.error("Erro na API de Config:", error);
    return res.status(500).json({ error: error.message });
  }
}
