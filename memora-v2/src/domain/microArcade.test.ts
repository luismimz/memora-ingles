import { beforeEach, describe, expect, it, vi } from 'vitest';
import examples from '../../content/review-examples.json';
import { validateUnit } from './unit';
import { arcadeCandidateIds, microRounds, shouldOfferMicroArcade } from './microArcade';
import { commitMicroAttempt, commitMicroTimeout } from './microArcadeProgress';
import { recordSentenceExposure, recordWordRecall, readWordMemories, readSentenceMemories, isKnownForDirection } from './memory';
import { initializeJournal, readJournal } from './progressJournal';
import { readLearningActivities, recordLearningActivity } from './learningActivity';
import { restoreProgress } from './restoreProgress';
import { projectConversations } from './conversationHistory';
// @ts-expect-error Shared Directus JavaScript contract.
import { validateProgressBatch } from '../../../backend/extensions/memora-ai/dist/core/progress.js';

const unit = validateUnit(examples[0]);
const at = new Date('2026-10-12T12:00:00Z');
function teach() {
  recordWordRecall('learner', unit.words[0], 'hesitant', at, 'recognition', undefined, true);
  recordSentenceExposure('learner', unit.id, unit.sentence, at);
  return microRounds('learner', [unit], at.getTime())[0];
}
beforeEach(() => {
  const local = new Map<string, string>(); const session = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), key: (index: number) => [...local.keys()][index] ?? null, get length() { return local.size; } });
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
  initializeJournal('learner');
});
describe('Arcade: preparar antes de pedir y guardar evidencia real', () => {
  it('el catálogo por sí solo no habilita preguntas', () => {
    expect(microRounds('learner', [unit])).toEqual([]);
    recordWordRecall('learner', unit.words[0], 'hesitant', at, 'recognition', undefined, true);
    expect(microRounds('learner', [unit]).map((round) => round.word.en)).toEqual(['PLAY']);
  });
  it('usa una expresión enseñada, su verbo flexionado y solo opciones conocidas', () => {
    const round = teach();
    expect(round.word.en).toBe('PLAY'); expect(round.phrase.en).toBe(unit.sentence.en);
    expect(round.options).toEqual([]);
    expect(microRounds('learner', [unit]).map((item) => item.word.en)).not.toContain('COMPUTER');
    recordWordRecall('learner', unit.words[1], 'hesitant', at, 'recognition', undefined, true);
    expect(microRounds('learner', [unit])[0].options.sort()).toEqual(['COMPUTER', 'PLAY']);
  });
  it('no evalúa una asociación nueva que el alumno todavía no ha visto', () => {
    teach(); const changed = structuredClone(unit); changed.words[0].scene += ' Otra versión.';
    expect(microRounds('learner', [changed])).toEqual([]);
  });
  it('una palabra en dos misiones aparece una vez en la ronda', () => {
    teach();
    expect(microRounds('learner', [unit, { ...unit, id: 'another-mission' }])).toHaveLength(1);
  });
  it('prioriza recuerdos vencidos y lo recién practicado, sin depender del orden del catálogo', () => {
    const summaries = Array.from({ length: 25 }, (_, index) => ({ id: `u${index}`, title: 'Misión', words: [{ en: `WORD${index}`, es: 'palabra' }] }));
    teach();
    const template = readWordMemories('learner')[0];
    const memories = summaries.map((summary, index) => ({ ...template, key: summary.words[0].en.toLowerCase(), nextReviewAt: new Date(at.getTime() + (index < 8 ? -10000 + index : 10000)).toISOString() }));
    const sample = recordLearningActivity('learner', { unitId: 'u23', unitTitle: 'Misión', contentVersion: '1', activityId: 'word', skill: 'WORD23', source: 'learner', phase: 'arcade', modality: 'writing', prompt: 'palabra', response: 'WORD23', expected: 'WORD23', correct: true, helped: false, at: at.toISOString() });
    const activities = summaries.map((summary) => ({ ...sample, unitId: summary.id, at: summary.id === 'u23' ? at.toISOString() : new Date(at.getTime() - 5000).toISOString() }));
    const ids = arcadeCandidateIds(summaries, memories, activities, 'u24', at.getTime());
    expect(ids[0]).toBe('u24');
    expect(ids.slice(1, 7)).toEqual(['u0', 'u1', 'u2', 'u3', 'u4', 'u5']);
    expect(ids).toContain('u23');
    expect(new Set(ids).size).toBe(12);
    expect(arcadeCandidateIds([...summaries].reverse(), memories, activities, 'u24', at.getTime())).toEqual(ids);
    expect(arcadeCandidateIds(summaries, [], [], undefined, at.getTime())).toEqual([]);
    expect(arcadeCandidateIds(summaries, memories, [], undefined, at.getTime())).toEqual([]);
  });
  it('el tiempo agotado de escritura no se inventa como respuesta ni acierto', () => {
    const round = teach();
    const before = readWordMemories('learner');
    const attempt = commitMicroTimeout('learner', round, crypto.randomUUID(), 'writing-clock', false);
    expect(attempt.modality).toBe('writing');
    expect(attempt.correct).toBeNull();
    expect(readWordMemories('learner')).toEqual(before);
  });
  it('la omisión por reloj conserva exactamente memoria, demora y capacidad existentes, una sola vez', () => {
    const round = teach();
    commitMicroAttempt('learner', round, 'word', round.word.en, true, false, false, crypto.randomUUID(), 'known');
    const before = readWordMemories('learner');
    const sentenceBefore = readSentenceMemories('learner');
    const id = crypto.randomUUID();
    const activity = commitMicroTimeout('learner', round, id, 'clock');
    commitMicroTimeout('learner', round, id, 'clock');
    expect(activity.correct).toBeNull();
    expect(readWordMemories('learner')).toEqual(before);
    expect(readSentenceMemories('learner')).toEqual(sentenceBefore);
    expect(readLearningActivities('learner').filter((row) => row.id === id)).toHaveLength(1);
  });
  it('reconocimiento, ayuda y recuperación independiente no otorgan el mismo dominio', () => {
    const round = teach();
    commitMicroAttempt('learner', round, 'word', 'PLAY', true, false, true, crypto.randomUUID(), 'choice');
    expect(readWordMemories('learner')[0].capabilities?.recall).toBeUndefined();
    commitMicroAttempt('learner', round, 'word', 'PLAY', true, true, false, crypto.randomUUID(), 'hint');
    expect(readWordMemories('learner')[0].capabilities?.recall?.independentCorrect).toBe(0);
    commitMicroAttempt('learner', round, 'word', 'PLAY', true, false, false, crypto.randomUUID(), 'plain');
    expect(readWordMemories('learner')[0].capabilities?.recall?.independentCorrect).toBe(1);
    expect(isKnownForDirection(readWordMemories('learner')[0], 'recall')).toBe(false);
  });
  it('un envío repetido no duplica intentos ni repaso; el contrato de Directus los restaura', () => {
    const round = teach(); const id = crypto.randomUUID();
    commitMicroAttempt('learner', round, 'word', 'PLAY', true, false, false, id, 'session');
    const count = readWordMemories('learner')[0].attempts;
    commitMicroAttempt('learner', round, 'word', 'PLAY', true, false, false, id, 'session');
    expect(readWordMemories('learner')[0].attempts).toBe(count);
    expect(readLearningActivities('learner')).toHaveLength(1);
    commitMicroAttempt('learner', round, 'phrase', round.phrase.en, true, false, false, crypto.randomUUID(), 'session');
    expect(readSentenceMemories('learner')[0].attempts).toBe(1);
    const events = readJournal('learner')!.events;
    expect(validateProgressBatch({ course: 'es-en', events })).toHaveLength(events.length);
    const restored = restoreProgress('learner', [...events, ...events]);
    expect(JSON.parse(restored.get('memora-v2.learning.learner')!)).toHaveLength(2);
  });
  it('ofrece una ronda por contexto, no por reloj ni ventanas emergentes', () => {
    teach(); expect(shouldOfferMicroArcade('learner', unit.id, at.getTime())).toBe(false);
    recordLearningActivity('learner', { unitId: unit.id, unitTitle: unit.title, contentVersion: '1', activityId: 'constructed', skill: 'play', phase: 'construction', source: 'learner', modality: 'writing', prompt: unit.sentence.es, response: unit.sentence.en, expected: unit.sentence.en, correct: true, helped: false, at: at.toISOString() });
    expect(shouldOfferMicroArcade('learner', unit.id, at.getTime())).toBe(true);
  });
});
describe('Mi evolución: conversación continua, sin destruir evidencia', () => {
  function chat(response: string, extra: Record<string, unknown> = {}) {
    return recordLearningActivity('learner', { unitId: unit.id, unitTitle: unit.title, contentVersion: '1', activityId: 'turn-respond', skill: 'respond', phase: 'dialogue', source: 'learner', modality: 'writing', prompt: 'What are you doing?', response, expected: "I'm playing", correct: true, helped: false, conversationId: 'person:emma', speaker: 'Tú', ...extra });
  }
  it('agrupa repeticiones y varias misiones con Emma, conserva todos los originales', () => {
    const first = chat("I'm playing"); chat("I'm playing"); chat("I'm eating", { unitId: 'other' });
    const raw = readLearningActivities('learner'); const before = JSON.stringify(raw);
    const threads = projectConversations([...raw, first], { [unit.id]: 'Emma', other: 'Emma' });
    expect(threads).toHaveLength(1); expect(threads[0].title).toBe('Emma');
    expect(threads[0].messages.filter((item) => item.who === 'partner')).toHaveLength(1);
    expect(threads[0].messages.find((item) => item.text === "I'm playing")?.attempts).toHaveLength(2);
    expect(JSON.stringify(raw)).toBe(before); expect(raw).toHaveLength(3);
  });
  it('no oculta errores, reintentos, ayudas o contracciones diferentes', () => {
    const wrong = chat('I playing', { correct: false, feedback: 'Falta AM.' });
    chat("I'm playing", { helped: true, parentAttemptId: wrong.id }); chat("I'm playing"); chat('I am playing');
    const messages = projectConversations(readLearningActivities('learner'), { [unit.id]: 'Emma' })[0].messages.filter((item) => item.who === 'learner');
    expect(messages).toHaveLength(4); expect(messages[0].feedback).toBe('Falta AM.'); expect(messages[1].parentAttemptId).toBe(wrong.id);
  });
  it('mantiene la práctica Arcade separada de una conversación y acepta metadatos del personaje', () => {
    chat("I'm playing"); commitMicroAttempt('learner', teach(), 'word', 'PLAY', true, false, false, crypto.randomUUID(), 'session');
    expect(projectConversations(readLearningActivities('learner'), { [unit.id]: 'Emma' }).map((item) => item.title)).toEqual(['Emma', 'Mi práctica']);
    const events = readJournal('learner')!.events;
    expect(validateProgressBatch({ course: 'es-en', events })).toHaveLength(events.length);
    const restored = restoreProgress('learner', events);
    expect(JSON.parse(restored.get('memora-v2.learning.learner')!).find((record: { conversationId?: string }) => record.conversationId === 'person:emma')?.speaker).toBe('Tú');
  });
});
