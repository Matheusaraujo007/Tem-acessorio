
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  const sql = neon(process.env.DATABASE_URL!);

  if (req.method === 'GET') {
    const data = await sql`SELECT * FROM system_configs WHERE id = 'main'`;
    return res.status(200).json(data[0] || {});
  }

  if (req.method === 'POST') {
    const { companyName, logoUrl, taxRegime, allowNegativeStock } = req.body;
    await sql`
      UPDATE system_configs SET
        company_name = ${companyName},
        logo_url = ${logoUrl},
        tax_regime = ${taxRegime},
        allow_negative_stock = ${allowNegativeStock}
      WHERE id = 'main'
    `;
    return res.status(200).json({ success: true });
  }
}
