
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  const sql = neon(process.env.DATABASE_URL!);

  if (req.method === 'GET') {
    const products = await sql`SELECT * FROM products ORDER BY name ASC`;
    // Mapear snake_case do Postgres para camelCase do App
    const mapped = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      costPrice: Number(p.cost_price),
      salePrice: Number(p.sale_price),
      stock: p.stock,
      image: p.image,
      brand: p.brand,
      unit: p.unit,
      location: p.location
    }));
    return res.status(200).json(mapped);
  }

  if (req.method === 'POST') {
    const p = req.body;
    await sql`
      INSERT INTO products (id, name, sku, barcode, category, cost_price, sale_price, stock, image, brand, unit, location)
      VALUES (${p.id}, ${p.name}, ${p.sku}, ${p.barcode}, ${p.category}, ${p.costPrice}, ${p.salePrice}, ${p.stock}, ${p.image}, ${p.brand}, ${p.unit}, ${p.location})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sku = EXCLUDED.sku,
        barcode = EXCLUDED.barcode,
        category = EXCLUDED.category,
        cost_price = EXCLUDED.cost_price,
        sale_price = EXCLUDED.sale_price,
        stock = EXCLUDED.stock,
        image = EXCLUDED.image,
        brand = EXCLUDED.brand,
        unit = EXCLUDED.unit,
        location = EXCLUDED.location
    `;
    return res.status(200).json({ success: true });
  }
}
