// Supabase helpers for MAWD users + OAuth connections.
// Uses the shared supabaseQuery from ../supabase.js (PostgREST, service role key).
//
// Tables (see sql/001_mawd_users_and_connections.sql):
//   mawd_users        — one row per MAWD user
//   mawd_connections  — one row per (user_id, provider) pair

import { supabaseQuery } from '../supabase.js';

// ── Users ───────────────────────────────────────────────────────────

export async function upsertUser({ id, name, talent_type, primary_goal, email }) {
  if (!id) throw new Error('upsertUser: id required');
  const row = {
    id,
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) row.name = name;
  if (talent_type !== undefined) row.talent_type = talent_type;
  if (primary_goal !== undefined) row.primary_goal = primary_goal;
  if (email !== undefined) row.email = email;

  const res = await supabaseQuery(
    `mawd_users?on_conflict=id`,
    {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [row],
    }
  );
  return Array.isArray(res) ? res[0] : res;
}

export async function getUser(id) {
  if (!id) return null;
  const rows = await supabaseQuery(
    `mawd_users?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  return rows[0] || null;
}

// ── Connections (OAuth tokens per provider) ─────────────────────────

export async function upsertConnection({
  user_id,
  provider,
  access_token,
  refresh_token,
  expires_at,       // Date | number (ms) | ISO string
  scopes = [],
  account_email,
}) {
  if (!user_id || !provider) throw new Error('upsertConnection: user_id and provider required');

  const row = {
    user_id,
    provider,
    access_token,
    scopes,
    account_email: account_email || null,
    updated_at: new Date().toISOString(),
  };
  if (refresh_token) row.refresh_token = refresh_token;
  if (expires_at) {
    row.expires_at =
      typeof expires_at === 'string'
        ? expires_at
        : new Date(expires_at).toISOString();
  }

  const res = await supabaseQuery(
    `mawd_connections?on_conflict=user_id,provider`,
    {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [row],
    }
  );
  return Array.isArray(res) ? res[0] : res;
}

export async function getConnection(user_id, provider) {
  if (!user_id || !provider) return null;
  const rows = await supabaseQuery(
    `mawd_connections?user_id=eq.${encodeURIComponent(user_id)}&provider=eq.${encodeURIComponent(provider)}&select=*&limit=1`
  );
  return rows[0] || null;
}

export async function deleteConnection(user_id, provider) {
  if (!user_id || !provider) return null;
  return supabaseQuery(
    `mawd_connections?user_id=eq.${encodeURIComponent(user_id)}&provider=eq.${encodeURIComponent(provider)}`,
    { method: 'DELETE' }
  );
}
