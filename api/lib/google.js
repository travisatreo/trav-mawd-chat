// Google OAuth helpers for MAWD.
// No external deps — uses fetch + node:crypto.
//
// Required env vars:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   OAUTH_STATE_SECRET   (any random 32+ char string, used to HMAC-sign state)
//   PUBLIC_BASE_URL      (e.g. https://fanded-mawd-chat.vercel.app)

import crypto from 'node:crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

// Scopes requested for Gmail + Calendar. Keep minimal to reduce consent friction.
//   gmail.readonly  — read mailbox (search, resurface)
//   gmail.modify    — mark read, labels, create drafts (no send without gmail.send)
//   calendar.events — read + write events (scheduling)
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.events',
];

export function getRedirectUri() {
  const base = process.env.PUBLIC_BASE_URL || 'https://fanded-mawd-chat.vercel.app';
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

// ─── Signed state (stateless CSRF + payload) ───────────────────────
// state = base64url(JSON).base64url(HMAC-SHA256)
// Lets us round-trip user_id + return URL through Google without a DB session.

export function signState(payload) {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) throw new Error('OAUTH_STATE_SECRET not configured');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(token) {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) throw new Error('OAUTH_STATE_SECRET not configured');
  const parts = (token || '').split('.');
  if (parts.length !== 2) throw new Error('Malformed state');
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('State signature mismatch');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) throw new Error('State expired');
  return payload;
}

export function buildAuthUrl({ state, scopes = GOOGLE_SCOPES }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',      // get a refresh_token
    prompt: 'consent',           // force refresh_token on re-auth too
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID/SECRET not configured');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return res.json();
  // { access_token, expires_in, refresh_token?, scope, token_type, id_token }
}

export async function refreshAccessToken(refresh_token) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }
  return res.json();
  // { access_token, expires_in, scope, token_type, id_token? }
}

export async function getUserInfo(access_token) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`userinfo failed (${res.status})`);
  return res.json();
  // { sub, email, email_verified, name, picture, ... }
}
