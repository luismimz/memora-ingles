import { beforeEach, expect, it, vi } from 'vitest';
import { previewUnit } from '../preview/previewUnit';
import { hasWordDemonstration, recordWordDemonstration } from './wordDemonstration';
import { readLearningActivities } from './learningActivity';
import { readWordMemories } from './memory';
import { readAttempts } from './learningProfile';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
it('presentar cualquier modelo preparado no inventa un acierto y no se repite por reabrir', () => {
  const word = previewUnit.words[0];
  recordWordDemonstration('isolated', previewUnit, word);
  recordWordDemonstration('isolated', previewUnit, word);
  expect(hasWordDemonstration('isolated', previewUnit, word)).toBe(true);
  expect(readLearningActivities('isolated')).toMatchObject([{ source: 'authored', correct: null, helped: true, expected: '', wordSnapshot: { en: word.en, scene: word.scene } }]);
  expect(readLearningActivities('isolated')).toHaveLength(1);
  expect(readWordMemories('isolated')).toEqual([]);
  expect(readAttempts('isolated')).toEqual([]);
  expect(hasWordDemonstration('another', previewUnit, word)).toBe(false);
  expect(hasWordDemonstration('isolated', { ...previewUnit, contentVersion: 'changed' }, word)).toBe(false);
  expect(hasWordDemonstration('isolated', previewUnit, { ...word, scene: 'Otra asociación' })).toBe(false);
});
