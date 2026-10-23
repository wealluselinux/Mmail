import { cookies } from "next/headers";
import { decrypt, sign, unsign } from "./crypto";
import { refreshAccessToken } from "./google";
import { supabase, type UserRow } from "./supabase";

export const SESSION_COOKIE = "mmail_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Creates the signed session cookie value for a user: `sub|expiry`, HMAC signed. */
export function createSessionValue(googleSub: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return sign(`${googleSub}|${exp}`);
}

export const sessionMaxAge = SESSION_TTL_SECONDS;

export type SessionUser = Pick<UserRow, "google_sub" | "email" | "name" | "picture">;

/** Returns the signed-in user, or null. Safe to call from server components and route handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const value = unsign(raw);
  if (!value) return null;
  const [sub, exp] = value.split("|");
  if (!sub || !exp || Number(exp) < Date.now() / 1000) return null;

  const { data } = await supabase()
    .from("users")
    .select("google_sub,email,name,picture")
    .eq("google_sub", sub)
    .maybeSingle();
  return (data as SessionUser | null) ?? null;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Returns a valid Google access token for the user, refreshing it with the
 * stored (encrypted) refresh token when needed. Returns null if the user has
 * revoked access, in which case they need to sign in again.
 */
export async function getAccessToken(googleSub: string): Promise<string | null> {
  const cached = tokenCache.get(googleSub);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const { data } = await supabase()
    .from("users")
    .select("encrypted_refresh_token")
    .eq("google_sub", googleSub)
    .maybeSingle();
  if (!data) return null;

  try {
    const refreshed = await refreshAccessToken(decrypt(data.encrypted_refresh_token));
    tokenCache.set(googleSub, {
      token: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    });
    return refreshed.access_token;
  } catch {
    tokenCache.delete(googleSub);
    return null;
  }
}
