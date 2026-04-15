-- MAWD users + OAuth connections (Layer 1)
-- Run once in Supabase SQL editor.
--
-- Design notes:
--   • mawd_users is keyed by a client-generated UUID (crypto.randomUUID()
--     in the browser) so we can tie OAuth tokens to a stable identity
--     before the user has a password or real account.
--   • mawd_connections stores one row per (user_id, provider). Currently
--     only 'google' is used, but the shape accommodates spotify, stripe,
--     plaid, etc. later.
--   • Tokens are stored in plaintext in the DB. Supabase encrypts at
--     rest at the disk level, but for production you should wrap
--     access_token / refresh_token in pgsodium or a KMS.
--   • No RLS policies yet — we access via the service role key from
--     Vercel functions only. Add RLS before ever exposing this table
--     to anon/authenticated clients.

create extension if not exists pgcrypto;

-- ── Users ───────────────────────────────────────────────────────────
create table if not exists mawd_users (
  id            uuid primary key,
  name          text,
  talent_type   text,
  primary_goal  text,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists mawd_users_email_idx on mawd_users (lower(email));

-- ── OAuth connections ──────────────────────────────────────────────
create table if not exists mawd_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references mawd_users(id) on delete cascade,
  provider        text not null,             -- 'google' | 'spotify' | 'stripe' | ...
  access_token    text not null,
  refresh_token   text,
  expires_at      timestamptz,
  scopes          text[] not null default '{}',
  account_email   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists mawd_connections_user_id_idx
  on mawd_connections (user_id);

create index if not exists mawd_connections_provider_idx
  on mawd_connections (provider);
