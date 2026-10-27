import { expect, it, vi } from 'vitest';
import keys from '../../content/keys-mission.json';
import { validateUnit } from './unit';
import { computerSituationSource, hasPreparedSituationSubject, keysSituationSkill, keysSituationSource, keysSituationStages, prepareKeysSituation, resumeKeysSituation, situationReviewDue } from './keysSituation';
import { recordSentenceExposure, recordSentenceRecall, sentenceKey } from './memory';
import type { LearningActivity } from './learningActivity';
import { conversationTurns } from './conversation';
import { normalizeSentenceAnswer } from './sentenceAnswer';
const unit = validateUnit(keys);
it('inserta Detective sin mover una escucha o conversación empezada a otro reto', () => {
  const base = { checkIndex: 0, input: 'borrador', feedback: 'idle' as const, helped: false };
  expect(resumeKeysSituation({ ...base, stage: 9, checkId: 'sound' })).toMatchObject({ stage: keysSituationStages.indexOf('sound'), checkId: 'sound', input: 'borrador' });
  expect(resumeKeysSituation({ ...base, stage: 10, checkId: 'use' })).toMatchObject({ stage: keysSituationStages.indexOf('use'), checkId: 'use' });
  expect(resumeKeysSituation({ ...base, stage: 6, checkId: 'build', order: [3, 4] })?.order).toEqual([3, 4]);
  expect(resumeKeysSituation({ ...base, stage: 9, checkId: 'repair', order: [1, 3] })).toBeNull();
});
it('solo propone el siguiente contexto con los tres sentidos y el mensaje preparado publicados', () => {
  const desk = { ...unit, id: 'm1-test-desk', sentence: { ...unit.sentence, en: "I'm playing on my computer." }, words: [{ en: 'PLAY', es: 'jugar' }, { en: 'COMPUTER', es: 'ordenador' }, { en: 'DESK', es: 'escritorio' }] };
  expect(computerSituationSource([unit, desk])?.id).toBe(desk.id);
  expect(computerSituationSource([{ ...desk, kind: 'vocabulary-pack' }])).toBeUndefined();
  expect(computerSituationSource([{ ...desk, words: desk.words.slice(0, 2) }])).toBeUndefined();
  expect(computerSituationSource([{ ...desk, sentence: { ...desk.sentence, en: 'Another message.' } }])).toBeUndefined();
  expect(computerSituationSource([unit])).toBeUndefined();
});
it('el repaso usa las fechas SRS existentes y deja de estar pendiente tras una recuperación real', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  try {
    const now = Date.now(), message = prepareKeysSituation(unit)!.phone;
    recordSentenceExposure('spaced-isolated', unit.id, message, new Date(now));
    expect(situationReviewDue('spaced-isolated', unit.id, now + 3599000)).toBe(false);
    expect(situationReviewDue('spaced-isolated', unit.id, now + 3600000)).toBe(true);
    expect(situationReviewDue('spaced-isolated', 'another-source', now + 3600000)).toBe(false);
    recordSentenceRecall('spaced-isolated', sentenceKey(unit.id, message), 'hesitant', new Date(now + 3600000));
    expect(situationReviewDue('spaced-isolated', unit.id, now + 3600000)).toBe(false);
  } finally { vi.unstubAllGlobals(); }
});
it('solo reutiliza I AM tras escribir el mensaje real sin ayuda; no confunde elegir, repetir un modelo o fallar con producir', () => {
  const event: LearningActivity = { id: 'isolated', unitId: unit.id, unitTitle: unit.title, contentVersion: 'test', activityId: 'turn-respond', skill: keysSituationSkill, phase: 'dialogue', source: 'learner', modality: 'writing', prompt: 'Estoy buscando mi móvil.', response: "I'm looking for my phone.", expected: 'I am looking for my phone.', correct: true, helped: false, at: new Date().toISOString() };
  expect(hasPreparedSituationSubject([event])).toBe(true);
  for (const change of [{ helped: true }, { correct: false }, { source: 'authored' as const }, { modality: 'choice' as const }, { modality: 'oral' as const }, { phase: 'completion' as const }, { skill: 'other' }, { expected: 'I have a phone.' }, { response: 'I looking for phone' }]) expect(hasPreparedSituationSubject([{ ...event, ...change }])).toBe(false);
});
it('usa los dos sentidos publicados sin depender del piloto o de gramática antigua; no inventa una palabra ausente', () => {
  const pack = { ...unit, id: 'published-word-pack', kind: 'vocabulary-pack' as const };
  expect(keysSituationSource([pack])?.id).toBe(pack.id);
  expect(prepareKeysSituation(pack)?.conversation.id).toBe(pack.id);
  expect(prepareKeysSituation({ ...unit, words: unit.words.filter((word) => word.en !== 'PHONE') })).toBeNull();
  expect(prepareKeysSituation({ ...unit, words: unit.words.map((word) => word.en === 'PHONE' ? { ...word, status: 'needs_review' } : word) })).toBeNull();
});
it('enseña todas las piezas antes de montarlas y conserva dos sentidos, no cuenta KEYS como una palabra nueva', () => {
  const before = JSON.stringify(unit), data = prepareKeysSituation(unit)!;
  expect(data.words.map((word) => word.en)).toEqual(['KEY', 'PHONE']);
  expect(normalizeSentenceAnswer(data.teaching[2].en.map((piece) => piece.text).join(''))).toBe(normalizeSentenceAnswer(data.keys.en));
  expect(data.modelOrder.map((index) => data.pieces[index].text).join(' ').toLowerCase()).toBe(normalizeSentenceAnswer(data.keys.en));
  expect(conversationTurns(data.conversation).map((turn) => normalizeSentenceAnswer(turn.expected.en))).toEqual([normalizeSentenceAnswer(data.phone.en), normalizeSentenceAnswer(data.keys.en)]);
  expect(() => validateUnit(data.conversation)).not.toThrow();
  expect(JSON.stringify(unit)).toBe(before);
});
