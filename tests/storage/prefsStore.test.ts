import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '@storage/prefsStore';
import { MemoryStorage } from '../helpers/memoryStorage';

describe('prefsStore', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadPrefs(new MemoryStorage())).toEqual(DEFAULT_PREFS);
  });

  it('round trips saved prefs', () => {
    const storage = new MemoryStorage();
    const prefs = {
      unit: 'inHg',
      rangeDays: 'all',
      mode: 'detail',
      detailRangeMinutes: 30,
    } as const;
    savePrefs(prefs, storage);
    expect(loadPrefs(storage)).toEqual(prefs);
  });

  it('upgrades prefs saved before detail mode existed', () => {
    const storage = new MemoryStorage();
    storage.setItem('pressure-log:prefs', '{"unit":"inHg","rangeDays":5}');
    expect(loadPrefs(storage)).toEqual({
      unit: 'inHg',
      rangeDays: 5,
      mode: 'normal',
      detailRangeMinutes: 180,
    });
  });

  it('migrates the legacy hour based detail range to minutes', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'pressure-log:prefs',
      '{"unit":"hPa","rangeDays":2,"mode":"detail","detailRangeHours":6}'
    );
    expect(loadPrefs(storage).detailRangeMinutes).toBe(360);
  });

  it('falls back to defaults on corrupted JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('pressure-log:prefs', 'not json');
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  it('replaces invalid fields without discarding valid ones', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'pressure-log:prefs',
      '{"unit":"psi","rangeDays":-1,"mode":"detail","detailRangeMinutes":45}'
    );
    expect(loadPrefs(storage)).toEqual({
      unit: 'hPa',
      rangeDays: 2,
      mode: 'detail',
      detailRangeMinutes: 180,
    });
  });
});
