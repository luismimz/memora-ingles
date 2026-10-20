import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import keys from '../../content/keys-mission.json';
import mirror from '../../content/mirror-now.json';
import { validateUnit } from './unit';
import { completeLearningMode, missingGrammarWords } from './learningModes';
import { recalledWordIndex, recordActiveWordAttempt } from './activeRecall';
import { readWordMemories, recordWordRecall } from './memory';
import { readUnitProgress } from './journey';
import { readLearningActivities, recordLearningActivity } from './learningActivity';
import { initializeJournal, readJournal } from './progressJournal';
import { restoreProgress } from './restoreProgress';
import { writtenConversationCorrection } from './conversation';
import { ActiveRecallCard } from '../components/ActiveRecallCard';
import { eligibleMixedUnits } from '../components/ArcadeExperience';
import { recordGrammarAttempt } from './grammarMemory';
import { arcadeCheckpointDue } from '../components/useArcadeClock';
import { commitMicroTimeout } from './microArcadeProgress';
// @ts-expect-error The Directus extension is JavaScript.
import { validateProgressBatch } from '../../../backend/extensions/memora-ai/dist/core/progress.js';

const unit = validateUnit(keys);
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } });
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {} });
  initializeJournal('learner');
});
describe('modos conectados con el progreso real', () => {
  it('hace la pausa después de quince rondas y no la repite tras aceptar continuar', () => {
    expect(arcadeCheckpointDue(14, 0)).toBe(false);
    expect(arcadeCheckpointDue(15, 0)).toBe(true);
    expect(arcadeCheckpointDue(15, 15)).toBe(false);
    expect(arcadeCheckpointDue(16, 15)).toBe(false);
    expect(arcadeCheckpointDue(30, 15)).toBe(true);
  });
  it('un vencimiento de tiempo se conserva una sola vez sin inventar una respuesta incorrecta', () => {
    const round = { unit, word: unit.words[0], phrase: { en: unit.sentence.en, es: unit.sentence.es, key: '' }, options: [], due: false };
    const id = crypto.randomUUID();
    const first = commitMicroTimeout('learner', round, id, 'round-one');
    expect(commitMicroTimeout('learner', round, id, 'round-one').id).toBe(first.id);
    expect(first.correct).toBeNull();
    expect(readWordMemories('learner')[0].attempts).toBe(1);
    expect(readWordMemories('learner')[0].capabilities?.recognition?.independentCorrect).toBe(0);
  });
  it('terminar palabras o gramática conserva la práctica sin completar la misión', () => {
    const result = { correct: 2, attempted: 4, completedAt: new Date().toISOString(), nextReviewAt: new Date().toISOString() };
    completeLearningMode('learner', unit, 'vocabulary', result);
    completeLearningMode('learner', unit, 'grammar', result);
    expect(readUnitProgress('learner', unit.id)).toBeNull();
    expect(readLearningActivities('learner').map((activity) => activity.activityId)).toEqual(['vocabulary-completed', 'grammar-completed']);
    completeLearningMode('learner', unit, 'adventure', result);
    expect(readUnitProgress('learner', unit.id)).toEqual(result);
  });
  it('no basta conocer PLAY para evaluar EAT y WORK en la ficha espejo', () => {
    const ficha = validateUnit(mirror);
    recordWordRecall('learner', ficha.words[0], 'quick');
    expect(missingGrammarWords(ficha, readWordMemories('learner'))).toEqual(['eat', 'work']);
    expect(missingGrammarWords({ ...ficha, grammarPrerequisites: undefined }, readWordMemories('learner'))).toEqual(['eat', 'work']);
    expect(missingGrammarWords(unit, [])).toEqual(['key', 'phone', 'pocket', 'lock', 'look']);
  });
  it('la mezcla de Arcade exige vocabulario practicado y una estructura preparada', () => {
    for (const word of unit.words) recordWordRecall('learner', word, 'quick');
    recordWordRecall('learner', { ...unit.words[0], en: 'LOOK', es: 'mirar' }, 'quick');
    expect(eligibleMixedUnits('learner', [unit])).toEqual([]);
    recordGrammarAttempt('learner', { skill: 'looking-for-now', unitId: unit.id, check: 'teach', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
    expect(eligibleMixedUnits('learner', [unit])).toEqual([]);
    recordLearningActivity('learner', { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: 'respond', skill: 'respond', phase: 'dialogue', source: 'learner', modality: 'writing', prompt: unit.communication!.dialogue!.turns[0].en, response: unit.communication!.dialogue!.turns[1].en, expected: unit.communication!.dialogue!.turns[1].en, correct: true, helped: false });
    expect(eligibleMixedUnits('learner', [unit])).toEqual([unit]);
  });
  it('recuerdo independiente, error y reintento ayudado se restauran sin duplicados', () => {
    const word = unit.words[0];
    const wrong = recordActiveWordAttempt('learner', unit, word, 'phone', 'writing', false);
    const retry = recordActiveWordAttempt('learner', unit, word, 'key', 'writing', true, wrong.id);
    expect(retry.parentAttemptId).toBe(wrong.id);
    expect(readWordMemories('learner')[0].capabilities?.recall?.independentCorrect).toBe(0);
    const events = readJournal('learner')!.events;
    for (let index = 0; index < events.length; index += 25) expect(validateProgressBatch({ course: 'es-en', events: events.slice(index, index + 25) })).toHaveLength(events.slice(index, index + 25).length);
    const restored = restoreProgress('learner', [...events, ...events]);
    const memories = JSON.parse(restored.get('memora-v2.memory.learner')!);
    expect(memories[0].attempts).toBe(2);
    expect(JSON.parse(restored.get('memora-v2.learning.learner')!)).toHaveLength(2);
  });
  it('al pasar se programa repaso y no se inventa un acierto', () => {
    const attempt = recordActiveWordAttempt('learner', unit, unit.words[0], '', 'skip', true);
    expect(attempt.correct).toBeNull();
    expect(readWordMemories('learner')[0].correct).toBe(0);
    expect(readWordMemories('learner')[0].nextReviewAt).toBeTruthy();
  });
  it('la primera recuperación no contiene la escena, el puente ni la respuesta', () => {
    const html = renderToStaticMarkup(<ActiveRecallCard unit={unit} word={unit.words[0]} choices={unit.words.slice(0, 3)} position={0} userId="preview" inspection onFinish={() => {}} />);
    expect(html).not.toContain('KIWI'); expect(html).not.toContain('>KEY<'); expect(html).not.toContain(unit.words[0].scene);
    expect(recalledWordIndex(unit, 0)).toBe(3);
  });
  it('corrige AM o FOR sin confundir la forma larga con la contracción', () => {
    expect(writtenConversationCorrection('I looking for my keys', "I'm looking for my keys.")).toContain('Falta AM');
    expect(writtenConversationCorrection('I am looking my keys', "I'm looking for my keys.")).toContain('falta FOR');
    expect(writtenConversationCorrection('I am looking for my phone', "I'm looking for my keys.")).toContain('keys');
  });
});
