import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";

// In-memory fallback if Supabase is missing (for mock functionality as present previously)
let mockClients: any[] = [];
let nextMockId = 1;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = process.env.SUPABASE_URL || 'https://mock.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || 'mock-key';
  const isSupabaseMocked = !(process.env.SUPABASE_URL) || (process.env.SUPABASE_URL || '').includes('mock.supabase.co');

  const supabase = createClient(url, key);

  const id = req.query.id as string;

  try {
    if (req.method === 'GET') {
      if (isSupabaseMocked) {
          return res.json([...mockClients].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return res.json(data);
    } 
    
    if (req.method === 'POST') {
      if (isSupabaseMocked) {
          const newClient = {
              ...req.body,
              id: `mock-id-${nextMockId++}`,
              created_at: new Date().toISOString()
          };
          mockClients.push(newClient);
          return res.json([newClient]);
      }
      const { data, error } = await supabase.from('clients').insert([req.body]).select();
      if (error) throw error;
      return res.json(data);
    } 
    
    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: "Missing client ID" });
      if (isSupabaseMocked) {
          const clientIndex = mockClients.findIndex(c => c.id === id);
          if (clientIndex !== -1) {
              mockClients[clientIndex] = { ...mockClients[clientIndex], ...req.body };
              return res.json([mockClients[clientIndex]]);
          }
          return res.status(404).json({ error: "Client not found" });
      }
      const { data, error } = await supabase.from('clients').update(req.body).eq('id', id).select();
      if (error) throw error;
      return res.json(data);
    } 
    
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: "Missing client ID" });
      if (isSupabaseMocked) {
          const clientIndex = mockClients.findIndex(c => c.id === id);
          if (clientIndex !== -1) {
              const deleted = mockClients[clientIndex];
              mockClients.splice(clientIndex, 1);
              return res.json([deleted]);
          }
          return res.status(404).json({ error: "Client not found" });
      }
      const { data, error } = await supabase.from('clients').delete().eq('id', id).select();
      if (error) throw error;
      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
