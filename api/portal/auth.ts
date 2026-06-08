import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";

let mockClients: any[] = []; // Matches mock fallback

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL || 'https://mock.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || 'mock-key';
  const isSupabaseMocked = !(process.env.SUPABASE_URL) || (process.env.SUPABASE_URL || '').includes('mock.supabase.co');

  try {
    const { id, accessCode } = req.body;
    if (isSupabaseMocked) {
        const client = mockClients.find(c => c.id === id && c.access_code === accessCode && c.status === 'Active');
        if (client) {
            return res.json({ success: true, listId: client.clickup_list_id, clientName: client.name, clientId: client.client_id });
        }
        return res.status(401).json({ error: "Invalid code or client inactive" });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('clients')
      .select('clickup_list_id, name, access_code, status, client_id')
      .eq('id', id).single();
    
    if (error || !data) throw error;
    
    if (data.access_code === accessCode && data.status === 'Active') {
        return res.json({ success: true, listId: data.clickup_list_id, clientName: data.name, clientId: data.client_id });
    }
    return res.status(401).json({ error: "Invalid code or client inactive" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
