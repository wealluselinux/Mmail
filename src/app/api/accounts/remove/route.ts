import { NextRequest, NextResponse } from "next/server";
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

export const dynamic = "force-dynamic";

/**
 * POST /api/accounts/remove { sub } : signs one account out of this browser.
 * If it was the active account, the next linked account becomes active.
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { sub?: unknown } | null;
  const sub = typeof body?.sub === "string" ? body.sub : "";
  if (!session.subs.includes(sub)) {
    return NextResponse.json({ error: "unknown_account" }, { status: 400 });
  }

  const remaining = session.subs.filter((s) => s !== sub);
  const res = NextResponse.json({ ok: true, empty: remaining.length === 0 });

  if (remaining.length === 0) {
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const active = session.active === sub ? remaining[0] : session.active;
  res.cookies.set(SESSION_COOKIE, createSessionValue(remaining, active), {
    ...cookieBase,
    maxAge: sessionMaxAge,
  });
  if (active !== session.active) {
    const saved = await getStoredSettings(active);
    if (saved) res.cookies.set(PREFS_COOKIE, encodePrefs(saved), prefsCookieOptions);
    else res.cookies.delete(PREFS_COOKIE);
  }
  return res;
}
