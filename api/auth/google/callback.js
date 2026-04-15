// GET /api/auth/google/callback?code=...&state=...
//
// Google redirects here after the user approves (or denies) consent.
// We verify the state HMAC, exchange the code for tokens, store them in
// Supabase against the user_id we signed into state, then redirect back
// to the onboard page (or wherever `return` pointed).

import { verifyState, exchangeCode, getUserInfo } from '../../lib/google.js';
import { upsertConnection, getConnection } from '../../lib/connections.js';

export default async function handler(req, res) {
  const { code, state, error: googleError, error_description } = req.query;

  // User denied consent, or Google reported a problem.
  if (googleError) {
    const msg = error_description || googleError;
    return redirect(res, '/onboard.html', { oauth_error: msg });
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  let payload;
  try {
    payload = verifyState(state);
  } catch (err) {
    console.error('state verify failed:', err.message);
    return res.status(400).send('Invalid state');
  }

  try {
    const tokens = await exchangeCode(code);
    // tokens: { access_token, expires_in, refresh_token?, scope, token_type, id_token }

    // If Google didn't return a fresh refresh_token (rare because we send
    // prompt=consent), preserve any existing one we already have for this
    // user so we don't lose offline access.
    let refreshToken = tokens.refresh_token || null;
    if (!refreshToken) {
      const existing = await getConnection(payload.user_id, 'google');
      if (existing && existing.refresh_token) refreshToken = existing.refresh_token;
    }

    const userinfo = await getUserInfo(tokens.access_token);
    const scopes = (tokens.scope || '').split(' ').filter(Boolean);
    const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

    await upsertConnection({
      user_id: payload.user_id,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scopes,
      account_email: userinfo.email || null,
    });

    return redirect(res, payload.return || '/onboard.html', {
      connected: 'gmail',
      email: userinfo.email || '',
    });
  } catch (err) {
    console.error('auth/google/callback error:', err);
    return redirect(res, payload.return || '/onboard.html', {
      oauth_error: err.message || 'Token exchange failed',
    });
  }
}

function redirect(res, path, params) {
  const qs = new URLSearchParams(params).toString();
  const sep = path.includes('?') ? '&' : '?';
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, `${path}${qs ? sep + qs : ''}`);
}
