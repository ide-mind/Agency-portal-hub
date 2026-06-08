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

    // Unpack template variables if they are present
    if (payload.template && payload.template.variables) {
      const vars = payload.template.variables;
      const clientName = vars.client_name || 'Client';
      const projectName = vars.allocation_name || 'Project';
      const otpCode = vars.otp_code || '------';
      const portalLink = vars.portal_link || '#';

      payload.html = `
<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: sans-serif; padding: 20px;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Portal Access
  </div>
  <div style="margin-bottom: 24px;">
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <mask id="cut">
          <rect width="200" height="200" fill="white" />
          <line x1="-20" y1="220" x2="220" y2="-20" stroke="black" stroke-width="45" />
        </mask>
      </defs>
      <rect width="200" height="200" fill="#FF4D00" mask="url(#cut)" />
    </svg>
  </div>
  <p>Hello ${clientName},</p>
  <p>Here is your portal access code for <strong>${projectName}</strong>:</p>
  <div style="padding: 15px; background: #f0f0f0; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
    ${otpCode}
  </div>
  <p>You can access your portal here: <a href="${portalLink}" style="color: #FF4D00;">${portalLink}</a></p>
  <p>Best,<br><strong>IDE Mind</strong></p>
</body>
</html>
      `;
      delete payload.template;
    } else if (payload.html) {
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
