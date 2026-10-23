import { recordLearningActivity, readLearningActivities, type LearningActivity } from './learningActivity';
import { recordWordRecall, recordSentenceRecall } from './memory';
import { recordAttempt } from './learningProfile';
import type { MicroRound } from './microArcade';

export function commitMicroAttempt(userId: string, round: MicroRound, stage: 'word' | 'phrase', response: string, correct: boolean, helped: boolean, recognition: boolean, id: string, sessionId: string, parentAttemptId?: string): LearningActivity {
  const existing = readLearningActivities(userId).find((event) => event.id === id);
  if (existing) return existing;
  const at = new Date();
  const activity = recordLearningActivity(userId, { id, at: at.toISOString(), unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:${stage}`, skill: stage === 'word' ? round.word.en : round.phrase.en, phase: 'arcade', source: 'learner', modality: recognition ? 'choice' : 'writing', prompt: stage === 'word' ? round.word.es : round.phrase.es, response, expected: stage === 'word' ? round.word.en : round.phrase.en, correct, helped: helped || recognition, parentAttemptId, feedback: correct ? recognition ? 'Reconocimiento con opciones: no es recuperación autónoma.' : helped ? 'Respuesta con apoyo. Volveremos a intentarlo sin pistas.' : 'Recuperación sin pistas en esta fase; la retención se comprueba después.' : stage === 'word' ? round.word.scene : 'Vuelve a la expresión enseñada y prueba otra vez.' });
  if (stage === 'word') {
    const direction = recognition ? 'recognition' : 'recall';
    recordWordRecall(userId, round.word, !correct ? 'missed' : helped || recognition ? 'hesitant' : 'quick', at, direction, correct ? undefined : recognition ? 'meaning' : 'writing', helped || recognition);
    recordAttempt(userId, { unitId: round.unit.id, wordId: round.word.id, word: round.word.en, correct, at: at.toISOString(), direction });
  } else recordSentenceRecall(userId, round.phrase.key, !correct ? 'missed' : helped ? 'hesitant' : 'quick', at);
  return activity;
}

/** Expiry means no answer, not a wrong written answer or an independent recall. */
export function commitMicroTimeout(userId: string, round: MicroRound, id: string, sessionId: string, recognition = true): LearningActivity {
  const existing = readLearningActivities(userId).find((event) => event.id === id);
  if (existing) return existing;
  const at = new Date();
  const activity = recordLearningActivity(userId, { id, at: at.toISOString(), unitId: round.unit.id, unitTitle: round.unit.title, contentVersion: round.unit.contentVersion ?? '1', activityId: `micro:${sessionId}:timeout`, skill: round.word.en, phase: 'arcade', source: 'learner', modality: recognition ? 'choice' : 'writing', prompt: round.word.es, response: '(sin respuesta antes de la siguiente ronda)', expected: round.word.en, correct: null, helped: true, feedback: round.word.scene });
  return activity;
}
