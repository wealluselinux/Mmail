import { NextRequest, NextResponse } from "next/server";
import { PREFS_COOKIE, sanitizePrefs } from "@/lib/prefs";
import { encodePrefs, prefsCookieOptions } from "@/lib/prefs-server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * PUT /api/settings : saves the user's preferences.
 * They are stored in a cookie (so the theme renders instantly with no flash) and in
 * Supabase (so they follow the user to other devices).
 */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const prefs = sanitizePrefs(body);

  const { error } = await supabase()
    .from("users")
    .update({ settings: prefs })
    .eq("google_sub", user.google_sub);

  const res = NextResponse.json({ ok: true, synced: !error });
  res.cookies.set(PREFS_COOKIE, encodePrefs(prefs), prefsCookieOptions);
  return res;
}
