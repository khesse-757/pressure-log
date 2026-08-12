import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '@storage/prefsStore';
import { MemoryStorage } from '../helpers/memoryStorage';

describe('prefsStore', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadPrefs(new MemoryStorage())).toEqual(DEFAULT_PREFS);
  });

  it('round trips saved prefs', () => {
    const storage = new MemoryStorage();
    savePrefs({ unit: 'inHg', rangeDays: 'all' }, storage);
    expect(loadPrefs(storage)).toEqual({ unit: 'inHg', rangeDays: 'all' });
  });

  it('falls back to defaults on corrupted JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('pressure-log:prefs', 'not json');
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  it('falls back to defaults on an unexpected shape', () => {
    const storage = new MemoryStorage();
    storage.setItem('pressure-log:prefs', '{"unit":"psi","rangeDays":-1}');
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });
});
