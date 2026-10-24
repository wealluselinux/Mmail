/** Everyday personal mail providers: a sender here is a person, not a brand, so no logo. */
const PERSONAL_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "fastmail.com",
  "hey.com",
]);

/** Country suffixes that have two parts, so "shop.example.co.uk" reduces to "example.co.uk". */
const TWO_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.jp", "co.nz",
  "co.in", "co.za", "com.br", "com.mx", "com.ar", "com.tr", "com.cn", "com.sg", "com.hk",
  "co.kr", "co.id", "com.ph", "com.my", "com.tw",
]);

export const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/**
 * The brand domain for a sender address, used to look up a logo.
 * "no-reply@mail.cash.app" gives "cash.app". Returns null for personal mail providers.
 */
export function brandDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const host = email.slice(at + 1).trim().toLowerCase();
  if (!DOMAIN_PATTERN.test(host) || host.length > 100) return null;

  const labels = host.split(".");
  let base = labels.slice(-2).join(".");
  if (labels.length >= 3 && TWO_PART_SUFFIXES.has(base)) base = labels.slice(-3).join(".");
  return PERSONAL_MAIL.has(base) ? null : base;
}
