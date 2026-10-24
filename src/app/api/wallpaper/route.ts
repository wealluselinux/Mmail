import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_500_000;

const headers = {
  "Content-Type": "image/jpeg",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

/** GET /api/wallpaper : the signed-in account's wallpaper (cached by the ?v= version). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const { data } = await supabase()
    .from("wallpapers")
    .select("data")
    .eq("google_sub", user.google_sub)
    .maybeSingle();
  if (!data?.data) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(data.data, "base64"), {
    headers: { ...headers, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

/**
 * PUT /api/wallpaper : stores a JPEG wallpaper for the signed-in account.
 * The browser resizes and re-encodes the image first, which also strips photo metadata.
 */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  // JPEG files start with FF D8 FF. Anything else is rejected.
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
    return NextResponse.json({ error: "not_jpeg" }, { status: 415 });
  }

  const { error } = await supabase().from("wallpapers").upsert({
    google_sub: user.google_sub,
    data: bytes.toString("base64"),
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/wallpaper : removes the wallpaper. */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { error } = await supabase().from("wallpapers").delete().eq("google_sub", user.google_sub);
  if (error) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
