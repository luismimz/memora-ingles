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

const actionContexts = {
  play: { action: 'playing', verbEs: 'jugar', actionEs: 'jugando', intent: 'Avisar de que estás jugando para que te guarden el siguiente turno.', context: 'organiza la partida. Avísale de que estás jugando para que te guarde el siguiente turno.', question: { en: 'What are you doing?', es: '¿Qué estás haciendo ahora?' }, reply: { en: 'All right. I will save your next turn.', es: '¡Vale! Te guardo el siguiente turno.' } },
  brush: { action: 'brushing', verbEs: 'cepillar', actionEs: 'cepillando', intent: 'Avisar de que estás cepillándote para que esperen fuera del baño.', context: 'quiere entrar al baño que estás usando. Estás cepillándote: avísale para que espere fuera.', question: { en: 'What are you doing in there?', es: '¿Qué estás haciendo ahí dentro?' }, reply: { en: 'All right. I will wait outside.', es: '¡Vale! Espero fuera del baño hasta que termines.' } },
  cook: { action: 'cooking', verbEs: 'cocinar', actionEs: 'cocinando', intent: 'Avisar de que estás cocinando para que el personaje prepare la mesa.', context: 'va a recoger la mesa. Estás cocinando: avísale para que deje los platos preparados para la comida.', question: { en: 'What are you doing in the kitchen?', es: '¿Qué estás haciendo en la cocina?' }, reply: { en: 'All right. I will set the table.', es: '¡Entendido! No recojo todavía: preparo los platos para la comida.' } },
} as const;

/** Code-authored applications of exact, already generated action contracts. This does
 * not approve a catalogue entry, opt an editorial draft in, or invent a unit ID.
 * Only the known English model/pieces are assessed; the partner speaks Spanish. */
export function preparedActionPractice(unit: AtomicUnit, formId: string, memories: readonly WordMemory[]): AtomicUnit | null {
  if (unit.grammarContinuation || unit.mirror || ['vocabulary-pack', 'grammar-lesson'].includes(unit.kind ?? '')) return null;
  const form = unit.grammar.find((item) => item.id === formId);
  const base = form?.englishBase;
  if (!form || form.lesson || !base || !Object.hasOwn(actionContexts, base)) return null;
  const context = actionContexts[base as keyof typeof actionContexts];
  const word = unit.words.find((item) => item.en.trim().toLowerCase() === base && item.es.trim().toLowerCase() === context.verbEs);
  if (form.english !== context.action || form.spanish !== context.actionEs || !word || !memories.some((memory) => practicedWordMeaning(memory, word))) return null;
  const lesson = lessonForForm(form, word.es);
  const message = `I am ${context.action}`;
  if (lesson?.id !== `present-continuous:${base}` || !lesson.checks.some((check) => check.ordering && check.answers.includes(message)) || !lesson.checks.some((check) => check.kind === 'write' && check.answers.includes(message))) return null;
  const partner = unit.communication?.dialogue?.partner ?? unit.communication?.interlocutor ?? 'Nora';
  return {
    ...unit,
    sentence: { en: `${message}.`, es: `Yo estoy ${context.actionEs}.`, pronunciationTip: 'Escucha el mismo mensaje que acabas de montar.', slots: [
      { en: 'I', es: 'Yo', choices: ['I', 'am'] },
      { en: 'am', es: 'estoy', choices: ['am', `${context.action}.`] },
      { en: `${context.action}.`, es: context.actionEs, choices: [`${context.action}.`, 'I'] },
    ] }, practiceSentences: [],
    communication: {
      layer: 'converse', intent: context.intent, interlocutor: partner,
      userTurn: `${message}.`, reply: context.reply.en, replyMode: 'receptive_chunk',
      dialogue: {
        context: `${partner} ${context.context}`,
        partner, partnerLanguage: 'es', continueMode: 'manual',
        turns: [
          { role: 'A', ...context.question, acceptedAnswers: [context.question.en] },
          { role: 'B', en: `${message}.`, es: `Estoy ${context.actionEs}.`, acceptedAnswers: [`${message}.`, `I'm ${context.action}.`] },
        ], reply: context.reply,
        rhythmTip: 'Escucha y repite el mensaje si te apetece.',
      },
    },
  };
}
