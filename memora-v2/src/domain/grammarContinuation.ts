import type { AtomicUnit } from './unit';
import { practicedWordMeaning, type WordMemory } from './memory';
import type { GrammarAttempt } from './grammarMemory';
import { lessonForForm } from './grammarLesson';

/** Selection only: the existing journal/memories remain the evidence source. */
export function preparedGrammarContinuation(unit: AtomicUnit, formId: string, memories: readonly WordMemory[], attempts: readonly GrammarAttempt[]): boolean {
  const plan = unit.grammarContinuation;
  const dialogue = unit.communication?.dialogue;
  if (!plan || plan.status !== 'approved' || plan.formId !== formId || !dialogue) return false;
  const used = new Set(attempts.filter((attempt) => attempt.kind === 'write' && attempt.correct && !attempt.helped).map((attempt) => attempt.skill));
  if (dialogue.partnerLanguage !== 'es' && (!dialogue.questionSkillId || !used.has(dialogue.questionSkillId))) return false;
  return plan.vocabulary.every((en) => {
    const word = unit.words.find((item) => item.en.trim().toLowerCase() === en.trim().toLowerCase());
    return word && memories.some((memory) => practicedWordMeaning(memory, word));
  }) && plan.grammarSkills.every((skill) => used.has(skill));
}

/** Code-authored application of the already generated PLAY contract. This does
 * not approve a catalogue entry, opt an editorial draft in, or invent a unit ID.
 * Only the known English model/pieces are assessed; the partner speaks Spanish. */
export function preparedPlayingPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): AtomicUnit | null {
  if (unit.grammarContinuation || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')) return null;
  const form = unit.grammar.find((item) => item.id === formId);
  const word = unit.words.find((item) => item.en.trim().toLowerCase() === 'play' && item.es.trim().toLowerCase() === 'jugar');
  if (!form || form.lesson || form.englishBase !== 'play' || form.english !== 'playing' || form.spanish !== 'jugando' || !word || !memories.some((memory) => practicedWordMeaning(memory, word))) return null;
  const lesson = lessonForForm(form, word.es);
  if (lesson?.id !== 'present-continuous:play' || !lesson.checks.some((check) => check.ordering && check.answers.includes('I am playing')) || !lesson.checks.some((check) => check.kind === 'write' && check.answers.includes('I am playing'))) return null;
  const partner = unit.communication?.dialogue?.partner ?? unit.communication?.interlocutor ?? 'Nora';
  return {
    ...unit,
    sentence: { en: 'I am playing.', es: 'Yo estoy jugando.', pronunciationTip: 'Escucha el mismo mensaje que acabas de montar.', slots: [
      { en: 'I', es: 'Yo', choices: ['I', 'am'] },
      { en: 'am', es: 'estoy', choices: ['am', 'playing.'] },
      { en: 'playing.', es: 'jugando', choices: ['playing.', 'I'] },
    ] }, practiceSentences: [],
    communication: {
      layer: 'converse', intent: 'Avisar de que estás jugando para que te guarden el siguiente turno.', interlocutor: partner,
      userTurn: 'I am playing.', reply: 'All right. I will save your next turn.', replyMode: 'receptive_chunk',
      dialogue: {
        context: `${partner} organiza la partida. Avísale de que estás jugando para que te guarde el siguiente turno.`,
        partner, partnerLanguage: 'es', continueMode: 'manual',
        turns: [
          { role: 'A', en: 'What are you doing?', es: '¿Qué estás haciendo ahora?', acceptedAnswers: ['What are you doing?'] },
          { role: 'B', en: 'I am playing.', es: 'Estoy jugando.', acceptedAnswers: ['I am playing.', "I'm playing."] },
        ], reply: { en: 'All right. I will save your next turn.', es: '¡Vale! Te guardo el siguiente turno.' },
        rhythmTip: 'Escucha y repite el mensaje si te apetece.',
      },
    },
  };
}
