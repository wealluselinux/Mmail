"use client";

import { argbFromHex, hexFromArgb, themeFromSourceColor, type Scheme } from "@material/material-color-utilities";
import { useState } from "react";

const SWATCHES = [
  { name: "Violet", hex: "#7c5cbf" },
  { name: "Ocean", hex: "#0b6e99" },
  { name: "Forest", hex: "#2e7d4f" },
  { name: "Sunset", hex: "#c2410c" },
  { name: "Rose", hex: "#be185d" },
];

const KEYS: [string, keyof Scheme][] = [
  ["primary", "primary"],
  ["on-primary", "onPrimary"],
  ["primary-container", "primaryContainer"],
  ["on-primary-container", "onPrimaryContainer"],
  ["secondary", "secondary"],
  ["on-secondary", "onSecondary"],
  ["secondary-container", "secondaryContainer"],
  ["on-secondary-container", "onSecondaryContainer"],
  ["tertiary", "tertiary"],
  ["on-tertiary", "onTertiary"],
  ["tertiary-container", "tertiaryContainer"],
  ["on-tertiary-container", "onTertiaryContainer"],
  ["surface", "surface"],
  ["on-surface", "onSurface"],
  ["on-surface-variant", "onSurfaceVariant"],
  ["outline-variant", "outlineVariant"],
];

function cssFor(hex: string, dark: boolean): string {
  const { light, dark: darkScheme } = themeFromSourceColor(argbFromHex(hex)).schemes;
  const s = dark ? darkScheme : light;
  const vars = KEYS.map(([n, k]) => `--md-${n}:${hexFromArgb(s[k] as number)};`).join("");
  // The surface "container" tones are derived from surface + primary at :root, so they
  // have to be derived again here for the new colors to reach them.
  const mix = (pct: number) => `color-mix(in srgb, var(--md-surface) ${100 - pct}%, var(--md-primary) ${pct}%)`;
  const containers =
    `--md-surface-container-low:${mix(6)};--md-surface-container:${mix(9)};` +
    `--md-surface-container-high:${mix(12)};--md-surface-container-highest:${mix(15)};`;
  return `.landing{${vars}${containers}}`;
}

/** Color swatches that re-color the whole landing page, as a taste of Customize. */
export function LandingTheme() {
  const [active, setActive] = useState(0);
  const [css, setCss] = useState("");

  function pick(i: number) {
    setActive(i);
    // Match whatever light/dark the page is already using.
    const surface = getComputedStyle(document.documentElement).getPropertyValue("--md-surface").trim();
    const n = parseInt(surface.replace("#", "").slice(0, 6), 16);
    const lum = ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
    setCss(i === 0 ? "" : cssFor(SWATCHES[i].hex, Number.isFinite(lum) && lum < 128));
  }

  return (
    <div className="l-swatches" role="group" aria-label="Try a color">
      <style>{css}</style>
      <span className="l-swatch-label">Try a color</span>
      {SWATCHES.map((s, i) => (
        <button
          key={s.hex}
          type="button"
          className="l-swatch"
          style={{ background: s.hex }}
          aria-label={s.name}
          aria-pressed={i === active}
          title={s.name}
          onClick={() => pick(i)}
        />
      ))}
    </div>
  );
}
