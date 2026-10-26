import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { isAssociationRejected, rememberAssociationPreference } from './associationPreference';
import { previewUnit } from '../preview/previewUnit';
const word = previewUnit.words[0];
beforeEach(() => {
  const data = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key), setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());
it('reutiliza la preferencia existente, aislada por alumno/palabra y reversible sin tocar el contenido', () => {
  const original = structuredClone(word);
  localStorage.setItem(`memora-v2.rejected-association.one.${word.en.toLowerCase()}`, '1');
  expect(isAssociationRejected('one', word)).toBe(true);
  expect(isAssociationRejected('two', word)).toBe(false);
  rememberAssociationPreference('one', word, false);
  expect(isAssociationRejected('one', word)).toBe(false);
  expect(word).toEqual(original);
});
it('un almacenamiento bloqueado no impide continuar ni inventa una preferencia', () => {
  vi.stubGlobal('localStorage', { getItem() { throw Error(); }, setItem() { throw Error(); } });
  expect(isAssociationRejected('one', word)).toBe(false);
  expect(() => rememberAssociationPreference('one', word, true)).not.toThrow();
});
