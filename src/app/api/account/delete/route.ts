import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";
import { PREFS_COOKIE } from "@/lib/prefs";
import { encodePrefs, prefsCookieOptions } from "@/lib/prefs-server";
import {
  cookieBase,
  createSessionValue,
  getStoredSettings,
  readSession,
  SESSION_COOKIE,
  sessionMaxAge,
} from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/delete { confirm: "DELETE" }
 * Permanently deletes the active account's stored data (profile, encrypted token,
 * preferences, wallpaper) and revokes Material Mail's access in Google. The JSON body
 * means a cross-site form can't trigger it, and the confirm word guards against misclicks.
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }

  const sub = session.active;
  const db = supabase();

  const { data } = await db
    .from("users")
    .select("encrypted_refresh_token")
    .eq("google_sub", sub)
    .maybeSingle();

  // Best effort: tell Google to revoke the token. If this fails, we still delete our copy.
  if (data?.encrypted_refresh_token) {
    try {
      const token = decrypt(data.encrypted_refresh_token);
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
    } catch {
      /* ignore */
    }
  }

  // The wallpapers table cascades from users.
  const { error } = await db.from("users").delete().eq("google_sub", sub);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  const remaining = session.subs.filter((s) => s !== sub);
  const res = NextResponse.json({ ok: true, empty: remaining.length === 0 });
  if (remaining.length === 0) {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(PREFS_COOKIE);
    return res;
  }
  const next = remaining[0];
  res.cookies.set(SESSION_COOKIE, createSessionValue(remaining, next), {
    ...cookieBase,
    maxAge: sessionMaxAge,
  });
  const saved = await getStoredSettings(next);
  if (saved) res.cookies.set(PREFS_COOKIE, encodePrefs(saved), prefsCookieOptions);
  else res.cookies.delete(PREFS_COOKIE);
  return res;
}
