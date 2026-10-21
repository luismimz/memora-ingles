/** Synthetic test-only data. No runtime import, catalogue entry or learner writes. */
import { lessonForForm, type GrammarLessonData } from '../domain/grammarLesson';
import { previewUnit } from '../preview/previewUnit';
import { validateUnit } from '../domain/unit';

const base = lessonForForm(previewUnit.grammar[0], 'jugar')!;
export const meaningFixture: GrammarLessonData = {
  ...base, id: 'test:meaning-playing', checks: [
    { id: 'meaning-playing', kind: 'explain', prompt: 'Elige la situación que corresponde al mensaje.',
      choices: ['Todavía no he empezado.', 'Estoy jugando ahora.'], answers: ['Estoy jugando ahora.'],
      situation: { message: "I'm playing.", scenes: [
        { choice: 'Todavía no he empezado.', state: 'waiting' }, { choice: 'Estoy jugando ahora.', state: 'playing' },
      ] }, hint: 'El mensaje cuenta que la acción está ocurriendo ahora.', success: 'Has comprendido el mensaje.' },
    ...base.checks.filter((check) => check.kind === 'write'),
  ],
};
export const orderedFixture: GrammarLessonData = {
  ...meaningFixture, id: 'test:ordered-playing', checks: [base.checks[0], ...meaningFixture.checks],
};
export const preparedFixture = validateUnit({
  ...previewUnit, contentVersion: 'test:preparation',
  sentence: { ...previewUnit.sentence, slots: previewUnit.sentence.slots.map((slot, index) => ({
    ...slot, ...(index === 1 ? { preparation: [
      { en: 'my', es: 'mi', explanation: 'MY indica «mi» delante de la cosa.' },
      { en: 'on my computer', es: 'en mi ordenador', explanation: 'Este bloque indica la actividad en el ordenador.' },
      { en: 'at my desk', es: 'en mi escritorio', explanation: 'Este bloque sitúa a la persona en su puesto.' },
    ] } : {}),
  })) },
});
