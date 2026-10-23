import { expect, it, vi } from 'vitest';
import { reviewUnits } from '../preview/previewUnit';
import { preparedSearchKeysPractice, searchKeysLesson, searchKeysSkill } from './searchKeysPractice';
import { grammarChecksForExperience, validateGrammarLesson } from './grammarLesson';
import { grammarTricks, missingTrickWords, trickStop } from './journeyTricks';
import { validateUnit } from './unit';
import type { WordMemory } from './memory';
import { writeTrickCheckpoint } from './trickCheckpoint';
const source = reviewUnits.find((unit) => unit.id === 'm1-entry-keys')!;
const memories = source.words.filter((word) => ['KEY', 'PHONE'].includes(word.en)).map((word) => ({ key: word.en.toLowerCase(), correct: 1, word })) as WordMemory[];
it('convierte el bloque exacto de llaves en preparación explícita, puzle y uso sin inflar léxico ni modificar fuente', () => {
  const before = JSON.stringify(source); const lesson = searchKeysLesson(source, 'looking-for')!;
  expect(() => validateGrammarLesson(lesson)).not.toThrow();
  const prepared = preparedSearchKeysPractice(source, 'looking-for', memories)!;
  expect(() => validateUnit(prepared.unit)).not.toThrow();
  expect(prepared.lesson.id).toBe(searchKeysSkill);
  expect(lesson.steps).toHaveLength(6);
  expect(lesson.steps.at(-1)!.en.map((part) => part.text).join('')).toBe('I am looking for my keys');
  expect(JSON.stringify(lesson)).not.toContain('¿Qué falta?');
  expect(JSON.stringify(lesson)).not.toContain('Sobran las llaves');
  expect(prepared.unit.words).toEqual(source.words);
  expect(prepared.unit.contentVersion).toBe(source.contentVersion);
  expect(prepared.unit.grammarContinuation).toBeUndefined();
  expect(prepared.unit.communication!.dialogue!.partnerLanguage).toBe('es');
  expect(grammarChecksForExperience(lesson, ['I am looking for my keys.'], [prepared.unit.sentence.en]).map((check) => check.id)).toEqual(['search-meaning-v1']);
  const pieces = lesson.checks[0].ordering!;
  expect([3, 4, 2, 0, 1].map((index) => pieces[index].text).join(' ')).toBe('I AM LOOKING FOR MY KEYS');
  expect(JSON.stringify(source)).toBe(before);
});
it('exige KEY/PHONE por sentido y versión, no LOOK aislado ni aprobaciones por contador', () => {
  const descriptor = grammarTricks(source)[0];
  expect(descriptor.vocabulary).toEqual(['key', 'phone']);
  expect(descriptor.skill).toBe(searchKeysSkill);
  expect(missingTrickWords(trickStop(source, descriptor), [])).toEqual(['key', 'phone']);
  expect(missingTrickWords(trickStop(source, descriptor), memories)).toEqual([]);
  expect(preparedSearchKeysPractice(source, 'looking-for', [])).toBeNull();
  expect(preparedSearchKeysPractice(source, 'looking-for', memories.slice(0, 1))).toBeNull();
  expect(preparedSearchKeysPractice(source, 'looking-for', memories.map((memory) => ({ ...memory, word: { ...memory.word, es: 'otro sentido' } })))).toBeNull();
});
it('no sustituye otros autores, versiones estructurales ni una continuación editorial pendiente', () => {
  expect(searchKeysLesson({ ...source, id: 'otro' }, 'looking-for')).toBeNull();
  expect(searchKeysLesson({ ...source, grammar: [{ ...source.grammar[0], lesson: { ...source.grammar[0].lesson!, id: 'otro-autor' } }] }, 'looking-for')).toBeNull();
  expect(searchKeysLesson({ ...source, grammarContinuation: { status: 'needs_review', formId: 'looking-for', vocabulary: ['key'], grammarSkills: [] } }, 'looking-for')).toBeNull();
});
it('solo la escritura legacy identificada y de la misma versión retiene el requisito anterior al reanudar', () => {
  const rows = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => rows.set(key, value) });
  try {
    const stop = trickStop(source, grammarTricks(source)[0]);
    const old = [{ key: 'look', correct: 1 }] as WordMemory[];
    expect(missingTrickWords(stop, old, 'legacy')).toEqual(['key', 'phone']);
    writeTrickCheckpoint('legacy', stop.id, source.contentVersion ?? '1', { stage: 2, checkIndex: 1, checkId: 'use', input: "I'm looking", feedback: 'help', helped: true });
    expect(missingTrickWords(stop, old, 'legacy')).toEqual([]);
    expect(missingTrickWords(stop, [], 'legacy')).toEqual(['look']);
    expect(missingTrickWords(stop, old, 'another')).toEqual(['key', 'phone']);
    expect(missingTrickWords({ ...stop, contentVersion: 'changed' }, old, 'legacy')).toEqual(['key', 'phone']);
    writeTrickCheckpoint('legacy', stop.id, source.contentVersion ?? '1', { stage: 2, checkIndex: 1, input: "I'm looking", feedback: 'idle', helped: false });
    expect(missingTrickWords(stop, old, 'legacy')).toEqual([]);
    writeTrickCheckpoint('legacy', stop.id, source.contentVersion ?? '1', { stage: 2, checkIndex: 0, input: '', feedback: 'idle', helped: false });
    expect(missingTrickWords(stop, old, 'legacy')).toEqual(['key', 'phone']);
    writeTrickCheckpoint('legacy', stop.id, source.contentVersion ?? '1', { stage: 2, checkIndex: 0, checkId: 'teach', input: '', feedback: 'idle', helped: false });
    expect(missingTrickWords(stop, old, 'legacy')).toEqual(['key', 'phone']);
  } finally { vi.unstubAllGlobals(); }
});
