
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  const sql = neon(process.env.DATABASE_URL!);

  if (req.method === 'GET') {
    const data = await sql`SELECT * FROM customers ORDER BY name ASC`;
    const mapped = data.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      birthDate: c.birth_date
    }));
    return res.status(200).json(mapped);
  }

  if (req.method === 'POST') {
    const c = req.body;
    await sql`
      INSERT INTO customers (id, name, email, phone, birth_date)
      VALUES (${c.id}, ${c.name}, ${c.email}, ${c.phone}, ${c.birthDate})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        birth_date = EXCLUDED.birth_date
    `;
    return res.status(200).json({ success: true });
  }
}
