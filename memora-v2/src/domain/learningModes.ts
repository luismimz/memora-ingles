import type { AtomicUnit } from './unit';
import type { WordMemory } from './memory';
import { practicedWordMeaning } from './memory';
import type { LearningMode } from './game';
import { recordUnitProgress, type UnitProgress } from './journey';
import { recordSession } from './learningProfile';
import { recordLearningActivity } from './learningActivity';
import { getPlayableGrammar } from './unit';
import type { UnitSummary } from '../services/directus';

/** A published scene with a prepared structure opens the whole teaching loop.
 * Word-only packs and explicit library choices remain vocabulary practice. */
export function journeyEntryMode(unit?: UnitSummary): LearningMode {
  if (unit?.routeTrick) return 'grammar';
  return unit && unit.kind !== 'vocabulary-pack' && unit.kind !== 'grammar-lesson' && unit.hasDialogue && unit.sentence?.es && unit.grammarTricks?.length ? 'adventure' : 'vocabulary';
}

/** Reuse previously practiced, unchanged word models; still ask for retrieval.
 * This removes repeated spelling setup, never establishes mastery or a score. */
export function canReuseSceneVocabulary(unit: AtomicUnit, memories: WordMemory[]): boolean {
  return Boolean(unit.communication?.dialogue && getPlayableGrammar(unit).length && unit.words.length
    && unit.words.every((word) => memories.some((memory) => practicedWordMeaning(memory, word)
      && memory.word.scene === word.scene && memory.word.bridge === word.bridge
      && memory.word.associationMode === word.associationMode)));
}

/** Readiness means prior successful practice, not a promise of long-term mastery. */
export function missingGrammarWords(unit: AtomicUnit, memories: WordMemory[]): string[] {
  const required = requiredGrammarWords(unit);
  const practiced = new Set(memories.filter((memory) => memory.correct > 0).map((memory) => memory.key));
  return [...new Set(required.map((word) => word.trim().toLocaleLowerCase('en')))].filter((word) => {
    const senses = unit.words.filter((item) => item.en.trim().toLocaleLowerCase('en') === word);
    return senses.length ? senses.some((sense) => !memories.some((memory) => practicedWordMeaning(memory, sense))) : !practiced.has(word);
  });
}

export function requiredGrammarWords(unit: AtomicUnit): string[] {
  // Existing Directus copies of this authored pilot predate prerequisite metadata.
  const legacyMirror = unit.mirror?.id === 'present-now-01' ? ['play', 'eat', 'work'] : [];
  return [...new Set([...(unit.grammarPrerequisites?.vocabulary ?? [...unit.words.map((word) => word.en), ...legacyMirror]), ...getPlayableGrammar(unit).map((form) => form.englishBase ?? form.englishRoot)].map((word) => word.trim().toLocaleLowerCase('en')))];
}

export function completeLearningMode(userId: string, unit: AtomicUnit, mode: LearningMode, result: UnitProgress) {
  if (mode === 'adventure') recordUnitProgress(userId, unit.id, result);
  recordSession(userId, { unitId: unit.id, completedAt: result.completedAt, correct: result.correct, attempted: result.attempted });
  recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `${mode}-completed`, skill: mode, phase: 'completion', source: 'learner', modality: 'choice', prompt: unit.communication?.intent ?? unit.title, response: mode === 'vocabulary' ? 'Palabras practicadas' : mode === 'grammar' ? 'Truco practicado' : 'Misión completada', expected: '', correct: null, helped: false });
}
