import { previewUnit } from '../preview/previewUnit';
import { validateUnit, type AtomicUnit } from '../domain/unit';

/** Synthetic acceptance data only. Never imported by runtime/catalogue and not
 * an approved editorial/media package or a write to any learner account. */
export const contextualProcessFixture: AtomicUnit = validateUnit({
  ...previewUnit, contentVersion: 'test-contextual-episode-1',
  grammarContinuation: { formId: 'ing', vocabulary: ['play'], grammarSkills: [], status: 'approved' },
  sentence: { en: 'I am playing.', es: 'Yo estoy jugando.', pronunciationTip: 'Escucha el mensaje.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'playing.'] },
    { en: 'am', es: 'estoy', choices: ['am', 'I'] },
    { en: 'playing.', es: 'jugando', choices: ['playing.', 'am'] },
  ] }, practiceSentences: [],
  communication: {
    layer: 'converse', intent: 'Avisar a Nora para que te guarde el siguiente turno.', interlocutor: 'Nora',
    userTurn: 'I am playing.', reply: 'I will save your turn.', replyMode: 'receptive_chunk',
    dialogue: {
      context: 'Nora organiza la mesa de al lado. Estás jugando: avísala para que te guarde el siguiente turno.',
      partner: 'Nora', partnerLanguage: 'es', continueMode: 'manual',
      turns: [
        { role: 'A', en: 'What are you doing?', es: '¿Qué estás haciendo ahora?', acceptedAnswers: ['What are you doing?'] },
        { role: 'B', en: 'I am playing.', es: 'Estoy jugando.', acceptedAnswers: ['I am playing.', "I'm playing."] },
      ], reply: { en: 'I will save your turn.', es: '¡Vale! Te guardo el siguiente turno.' },
      rhythmTip: 'Escucha y repite si te apetece.',
    },
  },
});
