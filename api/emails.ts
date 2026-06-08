import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      return res.status(400).json({ error: "No Resend API Key configured" });
    }

    const payload = { ...req.body };
    payload.from = 'IDE Mind <noreply@idemind.dev>';

    // If there is HTML provided directly, try to inject preview text, 
    // but don't touch if they are using a template object (so we preserve template usage)
    if (payload.html) {
      payload.html = payload.html.replace(
        /(<body[^>]*>)/i,
        '$1\n<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">\n  Portal Access\n</div>\n'
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
