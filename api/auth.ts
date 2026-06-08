import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  console.log('ENV CHECK:', process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD ? 'password_exists' : 'password_missing');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const adminUsername = process.env.ADMIN_USERNAME || 'admin'; // fallback just in case, but rely on env
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
}
