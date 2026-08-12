import type { PressureUnit, RangeSelection } from '../utils/types';

const PREFS_KEY = 'pressure-log:prefs';

export interface Prefs {
  unit: PressureUnit;
  rangeDays: RangeSelection;
}

export const DEFAULT_PREFS: Prefs = { unit: 'hPa', rangeDays: 2 };

function isPrefs(value: unknown): value is Prefs {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const unitOk = record.unit === 'hPa' || record.unit === 'inHg';
  const rangeOk =
    record.rangeDays === 'all' ||
    (typeof record.rangeDays === 'number' && record.rangeDays > 0);
  return unitOk && rangeOk;
}

export function loadPrefs(storage: Storage = localStorage): Prefs {
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (raw === null) return { ...DEFAULT_PREFS };
    const parsed: unknown = JSON.parse(raw);
    return isPrefs(parsed) ? parsed : { ...DEFAULT_PREFS };
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
