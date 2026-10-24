import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { PREFS_COOKIE } from "@/lib/prefs";
import { decodePrefs } from "@/lib/prefs-server";
import { buildThemeCss } from "@/lib/theme";
import "./globals.css";
import "./widgets.css";

export const metadata: Metadata = {
  title: "Material Mail",
  description:
    "Material Mail is a free, open-source Material You email client for Gmail. No ads, no clutter.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fef7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#141218" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The theme is rendered on the server from the saved preferences, so there is no flash.
  const prefs = decodePrefs((await cookies()).get(PREFS_COOKIE)?.value);
  return (
    <html lang="en" data-motion={prefs.motion ? "on" : "off"}>
      <head>
        <meta name="google-site-verification" content="K03Ae35CJiiBISGu8jljvx4gj0jCN9MtjYM__lcnpPM" />
        <style id="mmail-theme" dangerouslySetInnerHTML={{ __html: buildThemeCss(prefs.seed, prefs.mode) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
