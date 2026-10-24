/**
 * User preferences. This file is pure (no Node or browser APIs) so the server
 * and the client share one definition and one validator.
 */
export const PREFS_COOKIE = "mmail_prefs";

/** Default Material You seed color (a soft purple, close to the reference mockups). */
export const DEFAULT_SEED = "#7c5cbf";

export type ThemeMode = "system" | "light" | "dark";
export type WidgetKey =
  | "clock"
  | "date"
  | "weather"
  | "unread"
  | "note"
  | "calendar"
  | "search"
  | "compose";
export type WeatherLocation = { name: string; lat: number; lon: number };
export type WidgetPosition = { x: number; y: number };

export type Prefs = {
  seed: string;
  mode: ThemeMode;
  /** Optional status bar across the very top of the app. */
  bar: boolean;
  widgets: Record<WidgetKey, boolean>;
  /** Where each widget sits on the Home board (pixels). Missing = automatic placement. */
  layout: Partial<Record<WidgetKey, WidgetPosition>>;
  /** Also show the enabled widgets in a column beside your mail. */
  dock: boolean;
  /** Version number of the uploaded wallpaper (a timestamp), or 0 for none. */
  wallpaper: number;
  clockStyle: "analog" | "digital";
  weather: WeatherLocation | null;
  units: "f" | "c";
  note: string;
};

export const WIDGET_KEYS: WidgetKey[] = [
  "clock",
  "date",
  "weather",
  "unread",
  "note",
  "calendar",
  "search",
  "compose",
];

export const DEFAULT_PREFS: Prefs = {
  seed: DEFAULT_SEED,
  mode: "system",
  bar: true,
  widgets: {
    clock: true,
    date: true,
    weather: false,
    unread: true,
    note: false,
    calendar: false,
    search: false,
    compose: false,
  },
  layout: {},
  dock: false,
  wallpaper: 0,
  clockStyle: "analog",
  weather: null,
  units: "f",
  note: "",
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const coord = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 5000 ? Math.round(v) : null;

/** Accepts anything and returns a fully valid Prefs, falling back to defaults per field. */
export function sanitizePrefs(input: unknown): Prefs {
  const out: Prefs = structuredClone(DEFAULT_PREFS);
  if (!isObject(input)) return out;

  if (typeof input.seed === "string" && /^#[0-9a-f]{6}$/i.test(input.seed)) {
    out.seed = input.seed.toLowerCase();
  }
  if (input.mode === "system" || input.mode === "light" || input.mode === "dark") {
    out.mode = input.mode;
  }
  if (typeof input.bar === "boolean") out.bar = input.bar;
  if (typeof input.dock === "boolean") out.dock = input.dock;

  if (isObject(input.widgets)) {
    for (const key of WIDGET_KEYS) {
      const v = input.widgets[key];
      if (typeof v === "boolean") out.widgets[key] = v;
    }
  }

  if (isObject(input.layout)) {
    for (const key of WIDGET_KEYS) {
      const pos = input.layout[key];
      if (isObject(pos)) {
        const x = coord(pos.x);
        const y = coord(pos.y);
        if (x !== null && y !== null) out.layout[key] = { x, y };
      }
    }
  }

  if (
    typeof input.wallpaper === "number" &&
    Number.isFinite(input.wallpaper) &&
    input.wallpaper >= 0
  ) {
    out.wallpaper = Math.floor(input.wallpaper);
  }
  if (input.clockStyle === "analog" || input.clockStyle === "digital") {
    out.clockStyle = input.clockStyle;
  }
  if (input.units === "f" || input.units === "c") out.units = input.units;
  if (typeof input.note === "string") out.note = input.note.slice(0, 80);

  const w = input.weather;
  if (
    isObject(w) &&
    typeof w.name === "string" &&
    typeof w.lat === "number" &&
    typeof w.lon === "number" &&
    Math.abs(w.lat) <= 90 &&
    Math.abs(w.lon) <= 180
  ) {
    out.weather = { name: w.name.slice(0, 80), lat: w.lat, lon: w.lon };
  }
  return out;
}
