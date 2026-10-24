import { cookies } from "next/headers";
import { cache } from "react";
import { decrypt, sign, unsign } from "./crypto";
import { refreshAccessToken } from "./google";
import { sanitizePrefs, type Prefs } from "./prefs";
import { supabase, type UserRow } from "./supabase";

export const SESSION_COOKIE = "mmail_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const MAX_ACCOUNTS = 5;

export const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const sessionMaxAge = SESSION_TTL_SECONDS;

/** The accounts linked in this browser, and which one is showing. */
export type SessionData = { active: string; subs: string[] };

const SUB_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Creates the signed session cookie value: `v2|expiry|activeSub|sub1,sub2,...`. */
export function createSessionValue(subs: string[], active: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return sign(`v2|${exp}|${active}|${subs.join(",")}`);
}

/** Parses a raw session cookie. Also accepts the older single-account format. */
export function parseSessionCookie(raw: string | undefined): SessionData | null {
  if (!raw) return null;
  const value = unsign(raw);
  if (!value) return null;

  const parts = value.split("|");
  let exp: number;
  let active: string;
  let subs: string[];
  if (parts[0] === "v2" && parts.length === 4) {
    exp = Number(parts[1]);
    active = parts[2];
    subs = parts[3].split(",").filter(Boolean);
  } else if (parts.length === 2) {
    active = parts[0];
    exp = Number(parts[1]);
    subs = [active];
  } else {
    return null;
  }

  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  if (subs.length === 0 || subs.length > MAX_ACCOUNTS) return null;
  if (!subs.every((s) => SUB_PATTERN.test(s)) || !subs.includes(active)) return null;
  return { active, subs };
}

export const readSession = cache(async (): Promise<SessionData | null> => {
  const store = await cookies();
  return parseSessionCookie(store.get(SESSION_COOKIE)?.value);
});

export type SessionUser = Pick<UserRow, "google_sub" | "email" | "name" | "picture">;

const USER_COLUMNS = "google_sub,email,name,picture";

/** Returns the signed-in (active) user, or null. Safe in server components and route handlers. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const { data } = await supabase()
    .from("users")
    .select(USER_COLUMNS)
    .eq("google_sub", session.active)
    .maybeSingle();
  return (data as SessionUser | null) ?? null;
});

/** Every account linked in this browser, in the order they were added. */
export const getLinkedAccounts = cache(async (): Promise<SessionUser[]> => {
  const session = await readSession();
  if (!session) return [];

  const { data } = await supabase()
    .from("users")
    .select(USER_COLUMNS)
    .in("google_sub", session.subs);
  const rows = (data as SessionUser[] | null) ?? [];
  return session.subs
    .map((sub) => rows.find((r) => r.google_sub === sub))
    .filter((r): r is SessionUser => !!r);
});

/**
 * The preferences saved on an account. Returns null if none are saved or the
 * settings column doesn't exist yet (so the app still works before the SQL update).
 */
export const getStoredSettings = cache(async (googleSub: string): Promise<Prefs | null> => {
  const { data, error } = await supabase()
    .from("users")
    .select("settings")
    .eq("google_sub", googleSub)
    .maybeSingle();
  if (error || !data?.settings || Object.keys(data.settings).length === 0) return null;
  return sanitizePrefs(data.settings);
});

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
