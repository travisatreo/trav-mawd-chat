// GET /api/gmail/status?user_id=<uuid>
//
// Lightweight check the onboarding page (and v2) can hit to confirm
// a user actually has a stored Google/Gmail connection on the server —
// the source of truth, not just localStorage.

import { getConnection } from '../lib/connections.js';

export default async function handler(req, res) {
  try {
    const userId = req.query.user_id;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'user_id required' });
    }

    const conn = await getConnection(userId, 'google');
    if (!conn) {
      return res.status(200).json({ connected: false });
    }

    return res.status(200).json({
      connected: true,
      email: conn.account_email,
      scopes: conn.scopes || [],
      expires_at: conn.expires_at,
      has_refresh_token: !!conn.refresh_token,
    });
  } catch (err) {
    console.error('gmail/status error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
