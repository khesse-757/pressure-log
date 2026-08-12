import { DETAIL_RANGES_MINUTES } from '../utils/constants';
import type { ChartMode, PressureUnit, RangeSelection } from '../utils/types';

const PREFS_KEY = 'pressure-log:prefs';

export interface Prefs {
  unit: PressureUnit;
  rangeDays: RangeSelection;
  mode: ChartMode;
  detailRangeMinutes: number;
}

export const DEFAULT_PREFS: Prefs = {
  unit: 'hPa',
  rangeDays: 2,
  mode: 'normal',
  detailRangeMinutes: 180,
};

/** Prefs saved when the detail range was stored in hours. */
function legacyDetailMinutes(record: Record<string, unknown>): number | null {
  if (typeof record.detailRangeHours !== 'number') return null;
  const minutes = record.detailRangeHours * 60;
  return (DETAIL_RANGES_MINUTES as readonly number[]).includes(minutes)
    ? minutes
    : null;
}

/** Field by field validation, so prefs saved by an older version of
 * the app upgrade cleanly with defaults for fields it did not have. */
function normalizePrefs(value: unknown): Prefs {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_PREFS };
  const record = value as Record<string, unknown>;
  const rangeOk =
    record.rangeDays === 'all' ||
    (typeof record.rangeDays === 'number' && record.rangeDays > 0);
  const detailOk =
    typeof record.detailRangeMinutes === 'number' &&
    (DETAIL_RANGES_MINUTES as readonly number[]).includes(
      record.detailRangeMinutes
    );
  return {
    unit: record.unit === 'inHg' ? 'inHg' : 'hPa',
    rangeDays: rangeOk
      ? (record.rangeDays as RangeSelection)
      : DEFAULT_PREFS.rangeDays,
    mode: record.mode === 'detail' ? 'detail' : 'normal',
    detailRangeMinutes: detailOk
      ? (record.detailRangeMinutes as number)
      : (legacyDetailMinutes(record) ?? DEFAULT_PREFS.detailRangeMinutes),
  };
}

export function loadPrefs(storage: Storage = localStorage): Prefs {
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (raw === null) return { ...DEFAULT_PREFS };
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs, storage: Storage = localStorage): void {
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable in private browsing; prefs are optional.
  }
}
