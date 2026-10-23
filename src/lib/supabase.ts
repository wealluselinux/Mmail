import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service-role key.
 * It bypasses Row Level Security, so it must never be imported into client code.
 * The `users` table has RLS enabled with no policies, so the public anon key
 * can never read it.
 */
export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export type UserRow = {
  google_sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  encrypted_refresh_token: string;
};
