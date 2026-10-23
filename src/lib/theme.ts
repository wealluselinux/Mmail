import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type Scheme,
} from "@material/material-color-utilities";

/** Default Material You seed color (a soft purple, close to the reference mockups). */
export const DEFAULT_SEED = "#7c5cbf";

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
 * Builds the CSS custom properties for a full Material 3 color scheme
 * (light + dark) from a single seed color, the same way Android's
 * Material You derives its dynamic palette.
 */
export function buildThemeCss(seedHex: string = DEFAULT_SEED): string {
  const theme = themeFromSourceColor(argbFromHex(seedHex));
  return (
    `:root{color-scheme:light dark;${block(theme.schemes.light)}}` +
    `@media (prefers-color-scheme: dark){:root{${block(theme.schemes.dark)}}}`
  );
}
