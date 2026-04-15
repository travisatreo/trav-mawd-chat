// GET /api/auth/google/start?user_id=<uuid>&return=<path>
//
// Kicks off the Google OAuth dance. Signs user_id + return URL into a
// state token (HMAC) so we can round-trip through Google without a
// server-side session store.
//
// 302 → https://accounts.google.com/o/oauth2/v2/auth?...

import { signState, buildAuthUrl } from '../../lib/google.js';

export default async function handler(req, res) {
  try {
    const userId = req.query.user_id;
    const returnUrl = req.query.return || '/onboard.html';

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'user_id required' });
    }

    // Only allow relative return URLs — prevent open redirect.
    const safeReturn = returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/onboard.html';

    const state = signState({
      user_id: userId,
      return: safeReturn,
      nonce: Math.random().toString(36).slice(2),
      exp: Date.now() + 10 * 60 * 1000,  // 10 minutes
    });

    const authUrl = buildAuthUrl({ state });
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, authUrl);
  } catch (err) {
    console.error('auth/google/start error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
