import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type Scheme,
} from "@material/material-color-utilities";
import { DEFAULT_SEED, type ThemeMode } from "./prefs";

const ROLES: Record<string, keyof Scheme> = {
  primary: "primary",
  "on-primary": "onPrimary",
  "primary-container": "primaryContainer",
  "on-primary-container": "onPrimaryContainer",
  secondary: "secondary",
  "on-secondary": "onSecondary",
  "secondary-container": "secondaryContainer",
  "on-secondary-container": "onSecondaryContainer",
  tertiary: "tertiary",
  "on-tertiary": "onTertiary",
  "tertiary-container": "tertiaryContainer",
  "on-tertiary-container": "onTertiaryContainer",
  error: "error",
  "on-error": "onError",
  "error-container": "errorContainer",
  "on-error-container": "onErrorContainer",
  background: "background",
  "on-background": "onBackground",
  surface: "surface",
  "on-surface": "onSurface",
  "surface-variant": "surfaceVariant",
  "on-surface-variant": "onSurfaceVariant",
  outline: "outline",
  "outline-variant": "outlineVariant",
  "inverse-surface": "inverseSurface",
  "inverse-on-surface": "inverseOnSurface",
  "inverse-primary": "inversePrimary",
};

function block(scheme: Scheme): string {
  return Object.entries(ROLES)
    .map(([name, key]) => `--md-${name}:${hexFromArgb(scheme[key] as number)};`)
    .join("");
}

/**
 * Builds the CSS custom properties for a full Material 3 color scheme from a
 * single seed color, the same way Android's Material You derives its dynamic
 * palette. `mode` picks light, dark, or follows the operating system.
 */
export function buildThemeCss(
  seedHex: string = DEFAULT_SEED,
  mode: ThemeMode = "system",
): string {
  const { light, dark } = themeFromSourceColor(argbFromHex(seedHex)).schemes;
  if (mode === "light") return `:root{color-scheme:light;${block(light)}}`;
  if (mode === "dark") return `:root{color-scheme:dark;${block(dark)}}`;
  return (
    `:root{color-scheme:light dark;${block(light)}}` +
    `@media (prefers-color-scheme: dark){:root{${block(dark)}}}`
  );
}
