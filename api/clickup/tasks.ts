import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.CLICKUP_API_KEY;
  const listId = req.query.listId as string;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!listId) {
    return res.status(400).json({ error: 'Missing listId' });
  }

  try {
    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?page=0&include_closed=true&subtasks=true`, {
      headers: {
        'Authorization': apiKey || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        throw new Error("Failed to fetch tasks");
    }
    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch ClickUp tasks' });
  }
}
