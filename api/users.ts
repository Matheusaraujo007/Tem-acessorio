
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB URL missing' });
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    const data = await sql`SELECT * FROM users ORDER BY name ASC`;
    const mapped = data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: u.password, // Adicionado para permitir login
      role: u.role,
      storeId: u.store_id,
      active: u.active,
      avatar: u.avatar
    }));
    return res.status(200).json(mapped);
  }

  if (req.method === 'POST') {
    const u = req.body;
    try {
      await sql`
        INSERT INTO users (id, name, email, password, role, store_id, active, avatar)
        VALUES (${u.id}, ${u.name}, ${u.email}, ${u.password || '123456'}, ${u.role}, ${u.storeId || 'matriz'}, ${u.active !== undefined ? u.active : true}, ${u.avatar || ''})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          active = EXCLUDED.active,
          avatar = EXCLUDED.avatar
      `;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await sql`DELETE FROM users WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }
}
