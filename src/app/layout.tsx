import type { Metadata, Viewport } from "next";
import { buildThemeCss } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mmail",
  description:
    "Mmail is a free, open-source Material You email client for Gmail. No ads, no clutter.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fef7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#141218" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
