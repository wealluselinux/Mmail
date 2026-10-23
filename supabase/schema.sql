-- Mmail database schema. Run this once in the Supabase SQL editor.

create table if not exists public.users (
  google_sub              text primary key,
  email                   text not null,
  name                    text,
  picture                 text,
  -- AES-256-GCM encrypted Google refresh token (encrypted by the app, never plaintext)
  encrypted_refresh_token text not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Lock the table down: with RLS enabled and no policies, only the server's
-- service-role key can read or write it. The public anon key gets nothing.
alter table public.users enable row level security;
