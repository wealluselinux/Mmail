import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { appUrl, exchangeCode, fetchProfile, GMAIL_MODIFY_SCOPE } from "@/lib/google";
import { PREFS_COOKIE, sanitizePrefs } from "@/lib/prefs";
import { encodePrefs, prefsCookieOptions } from "@/lib/prefs-server";
import {
  cookieBase,
  createSessionValue,
  MAX_ACCOUNTS,
  parseSessionCookie,
  SESSION_COOKIE,
  sessionMaxAge,
} from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function fail(reason: string) {
  const res = NextResponse.redirect(`${appUrl()}/login?error=${encodeURIComponent(reason)}`);
  res.cookies.delete("mmail_oauth_state");
  res.cookies.delete("mmail_oauth_verifier");
  return res;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  if (params.get("error")) return fail("access_denied");

  const code = params.get("code");
  const state = params.get("state");
  const savedState = req.cookies.get("mmail_oauth_state")?.value;
  const verifier = req.cookies.get("mmail_oauth_verifier")?.value;
  if (!code || !state || !savedState || !verifier || state !== savedState) {
    return fail("invalid_state");
  }

  try {
    const tokens = await exchangeCode(code, verifier);

    // Material Mail is useless without Gmail access, so insist on the Gmail scope.
    const granted = tokens.scope.split(" ");
    if (!granted.includes(GMAIL_MODIFY_SCOPE)) return fail("missing_gmail_scope");

    const profile = await fetchProfile(tokens.access_token);
    const db = supabase();

    let encryptedRefresh: string | null = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;
    if (!encryptedRefresh) {
      // Google only sends a refresh token on consent; fall back to the one we already have.
      const { data: existing } = await db
        .from("users")
        .select("encrypted_refresh_token")
        .eq("google_sub", profile.sub)
        .maybeSingle();
      encryptedRefresh = existing?.encrypted_refresh_token ?? null;
    }
    if (!encryptedRefresh) return fail("no_refresh_token");

    const { error } = await db.from("users").upsert({
      google_sub: profile.sub,
      email: profile.email,
      name: profile.name ?? null,
      picture: profile.picture ?? null,
      encrypted_refresh_token: encryptedRefresh,
      updated_at: new Date().toISOString(),
    });
    if (error) return fail("database_error");

    const res = NextResponse.redirect(`${appUrl()}/mail`);
    // Signing in while already signed in adds this account to the ones linked in this
    // browser and makes it the active one.
    const existing = parseSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
    const linked = [...(existing?.subs ?? []).filter((s) => s !== profile.sub), profile.sub];
    if (linked.length > MAX_ACCOUNTS) return fail("too_many_accounts");
    res.cookies.set(SESSION_COOKIE, createSessionValue(linked, profile.sub), {
      ...cookieBase,
      maxAge: sessionMaxAge,
    });
    // Restore saved preferences on this device. If the settings column doesn't exist
    // yet, the query just errors and we skip it.
    const { data: saved } = await db
      .from("users")
      .select("settings")
      .eq("google_sub", profile.sub)
      .maybeSingle();
    if (saved?.settings && Object.keys(saved.settings).length > 0) {
      res.cookies.set(PREFS_COOKIE, encodePrefs(sanitizePrefs(saved.settings)), prefsCookieOptions);
    } else {
      res.cookies.delete(PREFS_COOKIE);
    }
    res.cookies.delete("mmail_oauth_state");
    res.cookies.delete("mmail_oauth_verifier");
    return res;
  } catch {
    return fail("sign_in_failed");
  }
}
