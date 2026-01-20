
import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  const sql = neon(process.env.DATABASE_URL!);

  if (req.method === 'GET') {
    const data = await sql`SELECT * FROM transactions ORDER BY date DESC`;
    const mapped = data.map(t => ({
      id: t.id,
      date: t.date,
      dueDate: t.due_date,
      description: t.description,
      store: t.store,
      category: t.category,
      status: t.status,
      value: Number(t.value),
      type: t.type,
      method: t.method,
      client: t.client,
      clientId: t.client_id,
      vendorId: t.vendor_id,
      items: t.items
    }));
    return res.status(200).json(mapped);
  }

  if (req.method === 'POST') {
    const t = req.body;
    await sql`
      INSERT INTO transactions (id, date, due_date, description, store, category, status, value, type, method, client, client_id, vendor_id, items)
      VALUES (${t.id}, ${t.date}, ${t.dueDate}, ${t.description}, ${t.store}, ${t.category}, ${t.status}, ${t.value}, ${t.type}, ${t.method}, ${t.client}, ${t.clientId}, ${t.vendorId}, ${JSON.stringify(t.items)})
    `;
    return res.status(200).json({ success: true });
  }
}
