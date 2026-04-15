// POST /api/user/upsert
// Body: { id, name?, talent_type?, primary_goal?, email? }
//
// Idempotent. Called by onboard.html as the user fills in each step, and
// again at completion with the full profile.

import { upsertUser } from '../lib/connections.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, name, talent_type, primary_goal, email } = req.body || {};
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id required' });
    }

    const user = await upsertUser({ id, name, talent_type, primary_goal, email });
    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error('user/upsert error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
