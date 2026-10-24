import { WIDGET_KEYS, type Prefs, type WidgetKey, type WidgetPosition } from "./prefs";

/** Rough on-screen size of each widget, used to place them without overlapping. */
const SIZES: Record<WidgetKey, { w: number; h: number }> = {
  clock: { w: 180, h: 180 },
  date: { w: 180, h: 180 },
  weather: { w: 320, h: 176 },
  unread: { w: 270, h: 84 },
  note: { w: 320, h: 56 },
  calendar: { w: 300, h: 318 },
  search: { w: 320, h: 56 },
  compose: { w: 220, h: 64 },
};

export function sizeOf(key: WidgetKey, prefs: Prefs): { w: number; h: number } {
  if (key === "clock" && prefs.clockStyle === "digital") return { w: 232, h: 124 };
  return SIZES[key];
}

const GAP = 20;
const PAD = 24;

export function enabledKeys(prefs: Prefs): WidgetKey[] {
  return WIDGET_KEYS.filter((k) => prefs.widgets[k]);
}

/**
 * Where every enabled widget sits. Widgets the user has dragged keep their saved
 * spot; the rest flow left to right, wrapping to a new row at the board's width.
 */
export function resolveLayout(
  prefs: Prefs,
  width: number,
): Partial<Record<WidgetKey, WidgetPosition>> {
  const out: Partial<Record<WidgetKey, WidgetPosition>> = {};
  let x = PAD;
  let y = 16;
  let rowHeight = 0;
  const usable = Math.max(width, 320);

  for (const key of enabledKeys(prefs)) {
    const { w, h } = sizeOf(key, prefs);
    if (x + w > usable - PAD && x > PAD) {
      x = PAD;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    out[key] = prefs.layout[key] ?? { x, y };
    x += w + GAP;
    rowHeight = Math.max(rowHeight, h);
  }
  return out;
}

/** Enabled widgets in reading order (top to bottom, then left to right), for the side dock. */
export function orderedKeys(prefs: Prefs): WidgetKey[] {
  const pos = resolveLayout(prefs, 1000);
  return enabledKeys(prefs).sort((a, b) => {
    const pa = pos[a]!;
    const pb = pos[b]!;
    return pa.y - pb.y || pa.x - pb.x;
  });
}
