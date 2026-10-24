import { NextRequest, NextResponse } from "next/server";
import { DOMAIN_PATTERN } from "@/lib/logo";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 150_000;
const CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

type Entry = { at: number; body: ArrayBuffer | null; type: string };
const cache = new Map<string, Entry>();

/**
 * Where logos come from, in order. Material Mail fetches them on the server so your
 * browser never contacts these services and who you email isn't tied to your IP.
 */
const SOURCES = (domain: string) => [
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&url=${encodeURIComponent(`https://${domain}`)}&size=128`,
  `https://icons.duckduckgo.com/ip3/${domain}.ico`,
];

async function fetchLogo(domain: string): Promise<Entry> {
  for (const url of SOURCES(domain)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (!res.ok) continue;
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      // Raster images only. SVG can carry scripts, so it is never served.
      if (!["image/png", "image/jpeg", "image/gif", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"].includes(type)) continue;
      const body = await res.arrayBuffer();
      if (body.byteLength === 0 || body.byteLength > MAX_BYTES) continue;
      return { at: Date.now(), body, type };
    } catch {
      // try the next source
    }
  }
  return { at: Date.now(), body: null, type: "" };
}

/** GET /api/logo?d=cash.app : the sender's brand logo, or 404 if none exists. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const domain = (req.nextUrl.searchParams.get("d") ?? "").toLowerCase();
  if (!DOMAIN_PATTERN.test(domain) || domain.length > 100) {
    return new NextResponse(null, { status: 400 });
  }

  let entry = cache.get(domain);
  if (!entry || Date.now() - entry.at > CACHE_MS) {
    entry = await fetchLogo(domain);
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(domain, entry);
  }

  if (!entry.body) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, max-age=86400" },
    });
  }
  return new NextResponse(entry.body, {
    headers: {
      "Content-Type": entry.type,
      "Cache-Control": "private, max-age=604800",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
