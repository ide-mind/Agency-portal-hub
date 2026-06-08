import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const folderId = process.env.CLICKUP_FOLDER_ID;
  const apiKey = process.env.CLICKUP_API_KEY;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}/list`, {
      headers: {
        'Authorization': apiKey || '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
        throw new Error("Failed to fetch lists");
    }
    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch ClickUp lists' });
  }
}
