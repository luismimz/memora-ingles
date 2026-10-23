import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { readLearningActivities } from '../domain/learningActivity';
import { readSentenceMemories } from '../domain/memory';
import { meaningFixture as deskMeaningLesson, orderedFixture as deskSequenceLesson } from '../test/grammarPracticeFixtures';
import { GrammarSituation } from './GrammarSituation';
import { GrammarOrder } from './GrammarOrder';
import { playSpanish } from '../services/audio';
const hooks = vi.hoisted(() => ({ index: 0, state: new Map<number, unknown>(), refIndex: 0, refs: new Map<number, { current: unknown }>() }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const id = hooks.index++; if (!hooks.state.has(id)) hooks.state.set(id, initial); return [hooks.state.get(id), (value: unknown) => hooks.state.set(id, typeof value === 'function' ? value(hooks.state.get(id)) : value)]; },
  useRef: (current: unknown) => { const id = hooks.refIndex++; if (!hooks.refs.has(id)) hooks.refs.set(id, { current }); return hooks.refs.get(id); }, useEffect: () => undefined,
}));
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSpanish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn() }));
import { GrammarCoach } from './GrammarCoach';
const generatedLesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
// Historical authored fixture: compatibility tests must not dictate the new generator.
const lesson = { ...generatedLesson, checks: [
  { id: 'explain', kind: 'explain' as const, prompt: 'Explica el patrón anterior.', choices: ['AM: I am + verbo con ING.', 'Nada: ING ya lo dice todo.'], answers: ['AM: I am + verbo con ING.'], hint: 'I AM acompaña a PLAYING.', success: 'Explicación revisada.' },
  generatedLesson.checks[2],
] };
const complete = vi.fn();
let nodes: ReactElement<any>[];
function render(overrides: Partial<Parameters<typeof GrammarCoach>[0]> = {}) {
  hooks.index = 0; hooks.refIndex = 0;
  const tree = GrammarCoach({ lesson, form: previewUnit.grammar[0], userId: 'learner', unitId: previewUnit.id, reviewMode: false, requirePractice: true, schedulePractice: true, onReady: () => {}, onContinue: complete, ...overrides });
  nodes = [];
  function visit(value: any) { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object' && value.props) { nodes.push(value); visit(value.props.children); } }
  visit(tree);
  return renderToStaticMarkup(tree);
}
const button = (text: string) => nodes.find((node) => node.type === 'button' && (node.props.children === text || node.props.children?.props?.text === text))!;
beforeEach(() => {
  hooks.state.clear(); hooks.refs.clear(); complete.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
it('corrige el envío real sin borrar el borrador ni su primer error y mantiene la ayuda al corregir', () => {
  const props = { lesson: generatedLesson, checkpoint: { stage: generatedLesson.steps.length, checkIndex: 2, checkId: 'use', input: '', feedback: 'idle' as const, helped: false } };
  render(props);
  const type = (value: string) => { nodes.find((node) => node.type === 'input')!.props.onChange({ target: { value } }); render(props); };
  const submit = () => { nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} }); return render(props); };
  type('I playing');
  expect(submit()).toContain('Falta AM');
  expect(playSpanish).toHaveBeenLastCalledWith(expect.stringContaining('Falta AM'));
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('I playing');
  type('am playing');
  expect(render(props)).toContain('Falta AM'); // Feedback refers to the last submitted answer, not live typing.
  expect(submit()).toContain('Añade quién');
  expect(complete).not.toHaveBeenCalled();
  type('I am playing'); submit();
  const activities = readLearningActivities('learner');
  expect(activities.map(({ correct, helped }) => [correct, helped])).toEqual([[false, false], [false, true], [true, true]]);
  expect(activities[0].feedback).toContain('Falta AM');
  expect(activities[1].feedback).toContain('Añade quién');
  expect(activities[1].parentAttemptId).toBe(activities[0].id);
  expect(activities[2].parentAttemptId).toBe(activities[1].id);
  expect(readSentenceMemories('learner')).toHaveLength(1);
});
it('reanuda la corrección del último envío sin recalcularla sobre texto aún no enviado', () => {
  const props = { lesson: generatedLesson, checkpoint: { stage: generatedLesson.steps.length, checkIndex: 2, checkId: 'use', input: 'I am play', correctionResponse: 'am playing', feedback: 'help' as const, helped: true } };
  expect(render(props)).toContain('Añade quién');
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('I am play');
  expect(readLearningActivities('learner')).toHaveLength(0);
  hooks.state.clear();
  expect(render({ ...props, checkpoint: { ...props.checkpoint, checkId: 'removed-check' } })).not.toContain('Añade quién');
  expect(readLearningActivities('learner')).toHaveLength(0);
});
it('un error de opciones conserva su pista revisada, no activa el diagnóstico de escritura', () => {
  const props = { lesson: generatedLesson, checkpoint: { stage: generatedLesson.steps.length, checkIndex: 1, checkId: 'meaning-now-v1', input: '', feedback: 'idle' as const, helped: false } };
  render(props); nodes.find((node) => node.type === GrammarSituation)!.props.onAnswer(generatedLesson.checks[1].choices![1]);
  expect(render(props)).toContain(generatedLesson.checks[1].hint);
  expect(readLearningActivities('learner')[0].feedback).toBe(generatedLesson.checks[1].hint);
});
it('el primer encuentro generado monta el mensaje y después exige escritura, sin examen de regla', () => {
  const props = { lesson: generatedLesson, startAtPractice: true };
  const html = render(props);
  expect(html).not.toContain('¿Qué falta?');
  expect(nodes.find((node) => node.type === GrammarOrder)).toBeTruthy();
  nodes.find((node) => node.type === GrammarOrder)!.props.onChange([1, 2, 0]); render(props);
  nodes.find((node) => node.type === GrammarOrder)!.props.onAnswer('I AM PLAYING'); render(props);
  expect(readLearningActivities('learner')[0]).toMatchObject({ activityId: 'order-message-v1', modality: 'choice', helped: true });
  expect(readSentenceMemories('learner')).toHaveLength(0);
  button('Seguir →').props.onClick(); render(props);
  nodes.find((node) => node.type === GrammarSituation)!.props.onAnswer(generatedLesson.checks[1].answers[0]); render(props);
  button('Seguir →').props.onClick(); render(props);
  expect(nodes.find((node) => node.type === 'input')).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});
it('un acierto antiguo sin identidad no se traslada al ordenado nuevo; escritura con ID sí se conserva', () => {
  const props = { lesson: generatedLesson, startAtPractice: true };
  render({ ...props, checkpoint: { stage: generatedLesson.steps.length, checkIndex: 0, input: 'AM: I am + verbo con ING.', feedback: 'correct', helped: false } });
  expect(nodes.find((node) => node.type === GrammarOrder)!.props.locked).toBe(false);
  expect(button('Seguir →')).toBeUndefined();
  hooks.state.clear();
  render({ ...props, checkpoint: { stage: generatedLesson.steps.length, checkIndex: 1, checkId: 'use', input: 'I playing', feedback: 'help', helped: true } });
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('I playing');
  expect(readLearningActivities('learner')).toHaveLength(0);
});
it('incluso con estructura practicada monta piezas antes de exigir escritura', () => {
  render({ lesson: generatedLesson, startAtPractice: true, omitGeneratedExplanation: true });
  expect(nodes.find((node) => node.type === 'input')).toBeUndefined();
  nodes.find((node) => node.type === GrammarOrder)!.props.onChange([1, 2, 0]);
  render({ lesson: generatedLesson, startAtPractice: true, omitGeneratedExplanation: true });
  nodes.find((node) => node.type === GrammarOrder)!.props.onAnswer('I AM PLAYING');
  render({ lesson: generatedLesson, startAtPractice: true, omitGeneratedExplanation: true });
  button('Seguir →').props.onClick();
  render({ lesson: generatedLesson, startAtPractice: true, omitGeneratedExplanation: true });
  nodes.find((node) => node.type === GrammarSituation)!.props.onAnswer(generatedLesson.checks[1].answers[0]);
  render({ lesson: generatedLesson, startAtPractice: true, omitGeneratedExplanation: true });
  button('Seguir →').props.onClick();
  render({ lesson: generatedLesson, startAtPractice: true, omitGeneratedExplanation: true });
  expect(nodes.find((node) => node.type === 'input')).toBeTruthy();
});
it('revela primero la persona y nunca muestra una traducción inglesa sin sujeto', () => {
  const first = render();
  expect(first).toContain('¿Quién está jugando?');
  expect(first).not.toContain('coach-language">INGLÉS');
  button('¿Quién está jugando?').props.onClick();
  const revealed = render();
  expect(revealed).toContain('YO'); expect(revealed).toContain('am');
  expect(revealed).toContain('coach-language">INGLÉS');
});
it('reutiliza la estructura generada sin repetir la pregunta, pero exige escribir el nuevo mensaje', () => {
  const html = render({ startAtPractice: true, omitGeneratedExplanation: true });
  expect(html).not.toContain('¿Qué falta?');
  expect(html).toContain(lesson.checks[1].prompt);
  expect(nodes.find((node) => node.type === 'input')).toBeTruthy();
  expect(button('Ver el truco otra vez')).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
  expect(readLearningActivities('learner')).toHaveLength(0);
});
it('al retirar una pregunta anterior restaura por ID la escritura pendiente y su ayuda', () => {
  const props = { startAtPractice: true, omitGeneratedExplanation: true,
    checkpoint: { stage: lesson.steps.length, checkIndex: 1, checkId: 'use', input: 'I playing', feedback: 'help' as const, helped: true } };
  render(props);
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('I playing');
  nodes.find((node) => node.type === 'input')!.props.onChange({ target: { value: 'I am playing' } }); render(props);
  nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} });
  expect(readLearningActivities('learner').at(-1)).toMatchObject({ activityId: 'use', helped: true, correct: true });
});
it('la omisión no retira preguntas de lecciones escritas explícitamente', () => {
  render({ lesson, form: { ...previewUnit.grammar[0], lesson }, startAtPractice: true, omitGeneratedExplanation: true });
  expect(button(lesson.checks[0].answers[0])).toBeTruthy();
  expect(nodes.find((node) => node.type === 'input')).toBeUndefined();
});
it('ordenar, comprender y escribir son evidencias distintas y conserva el primer error', () => {
  const props = { lesson: deskSequenceLesson, startAtPractice: true };
  render(props);
  nodes.find((node) => node.type === GrammarOrder)!.props.onChange([0, 1, 2]); render(props);
  nodes.find((node) => node.type === GrammarOrder)!.props.onAnswer('PLAYING I AM'); render(props);
  nodes.find((node) => node.type === GrammarOrder)!.props.onChange([1, 2, 0]); render(props);
  nodes.find((node) => node.type === GrammarOrder)!.props.onAnswer('I AM PLAYING'); render(props);
  expect(readLearningActivities('learner').map((activity) => [activity.correct, activity.modality, activity.helped])).toEqual([[false, 'choice', true], [true, 'choice', true]]);
  expect(readSentenceMemories('learner')).toHaveLength(0);
  button('Seguir →').props.onClick(); render(props);
  nodes.find((node) => node.type === GrammarSituation)!.props.onAnswer(deskSequenceLesson.checks[1].answers[0]); render(props);
  button('Seguir →').props.onClick(); render(props);
  nodes.find((node) => node.type === 'input')!.props.onChange({ target: { value: "I'm playing" } }); render(props);
  nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} }); render(props);
  const last = readLearningActivities('learner').at(-1)!;
  expect(last.modality).toBe('writing'); expect(last.helped).toBe(false); expect(last.correct).toBe(true);
  expect(readSentenceMemories('learner')).toHaveLength(1);
  expect(complete).not.toHaveBeenCalled();
  button('Seguir →').props.onClick(); expect(complete).toHaveBeenCalledOnce();
});
it('restaura el orden parcial y rechaza índices ajenos a las piezas de la pregunta', () => {
  const check = deskSequenceLesson.checks[0];
  const saved = { stage: deskSequenceLesson.steps.length, checkIndex: 0, checkId: check.id, input: '', feedback: 'idle' as const, helped: false, order: [1, 2] };
  render({ lesson: deskSequenceLesson, checkpoint: saved });
  expect(nodes.find((node) => node.type === GrammarOrder)!.props.selected).toEqual([1, 2]);
  expect(readLearningActivities('learner')).toHaveLength(0);
  hooks.state.clear(); render({ lesson: deskSequenceLesson, checkpoint: { ...saved, order: [7] } });
  expect(nodes.find((node) => node.type === GrammarOrder)!.props.selected).toEqual([]);
});
it('entiendo conduce al reto, no a un completado falso; la frase escrita entra en SRS', () => {
  render(); button('Ya lo entiendo · probarlo').props.onClick(); render();
  expect(complete).not.toHaveBeenCalled();
  expect(nodes.some((node) => node.type === 'button' && node.props.children === 'Pasar este repaso · ir a la frase')).toBe(false);
  button(lesson.checks[0].answers[0]).props.onClick(); render();
  button('Seguir →').props.onClick(); render();
  const input = nodes.find((node) => node.type === 'input')!;
  input.props.onChange({ target: { value: lesson.checks[1].answers[0] } }); render();
  nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} }); render();
  expect(readLearningActivities('learner').filter((activity) => activity.correct)).toHaveLength(2);
  expect(readSentenceMemories('learner')).toHaveLength(1);
  expect(readSentenceMemories('learner')[0].nextReviewAt).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
  button('Seguir →').props.onClick();
  expect(complete).toHaveBeenCalledTimes(1);
});
it('la escena reacciona a comprensión, error y escritura sin borrar el primer intento', () => {
  render(); button('Ya lo entiendo · probarlo').props.onClick();
  expect(render()).not.toContain('is-running');
  button(lesson.checks[0].answers[0]).props.onClick();
  const understood = render();
  expect(understood).toContain('is-connected');
  expect(understood).not.toContain('is-running');
  button('Seguir →').props.onClick(); render();
  nodes.find((node) => node.type === 'input')!.props.onChange({ target: { value: 'I playing' } }); render();
  nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} });
  expect(render()).not.toContain('is-running');
  nodes.find((node) => node.type === 'input')!.props.onChange({ target: { value: 'I am playing' } }); render();
  nodes.find((node) => node.type === 'form')!.props.onSubmit({ preventDefault() {} });
  expect(render()).toContain('is-running');
  const writes = readLearningActivities('learner').filter((activity) => activity.modality === 'writing');
  expect(writes.map((activity) => activity.correct)).toEqual([false, true]);
  expect(writes[1].helped).toBe(true);
  expect(complete).not.toHaveBeenCalled();
});
it('una escritura cedida al diálogo no restaura su acierto sobre otra pregunta ni termina el truco', () => {
  const html = render({ conversationAnswers: lesson.checks[1].answers,
    checkpoint: { stage: lesson.steps.length, checkIndex: 1, checkId: lesson.checks[1].id, input: 'I am playing', feedback: 'correct', helped: false } });
  expect(html).toContain(lesson.checks[0].prompt);
  expect(html).not.toContain('coach-finished');
  expect(button('Seguir →')).toBeUndefined();
  expect(button(lesson.checks[0].answers[0]).props.disabled).toBe(false);
  expect(complete).not.toHaveBeenCalled();
  expect(readLearningActivities('learner')).toHaveLength(0);
});
it('conserva respuesta y ayuda de la misma tarea identificada después de filtrar el diálogo', () => {
  render({ conversationAnswers: lesson.checks[1].answers,
    checkpoint: { stage: lesson.steps.length, checkIndex: 0, checkId: lesson.checks[0].id, input: '', feedback: 'help', helped: true } });
  button(lesson.checks[0].answers[0]).props.onClick();
  expect(readLearningActivities('learner')[0].helped).toBe(true);
});
it('conserva checkpoints antiguos cuando la lista no cambia y descarta aciertos de otra tarea', () => {
  render({ form: { ...previewUnit.grammar[0], lesson }, checkpoint: { stage: lesson.steps.length, checkIndex: 1, input: 'I am playing', feedback: 'help', helped: true } });
  expect(nodes.find((node) => node.type === 'input')!.props.value).toBe('I am playing');
  hooks.state.clear();
  render({ checkpoint: { stage: lesson.steps.length, checkIndex: 1, checkId: 'otra-pregunta', input: 'otra respuesta', feedback: 'correct', helped: false } });
  expect(button(lesson.checks[0].answers[0]).props.disabled).toBe(false);
  expect(button('Seguir →')).toBeUndefined();
  expect(readLearningActivities('learner')).toHaveLength(0);
});
it('la elección mueve una situación sin borrar el error ni convertir opciones en producción', () => {
  const props = { lesson: deskMeaningLesson, startAtPractice: true };
  render(props);
  nodes.find((node) => node.type === GrammarSituation)!.props.onAnswer(deskMeaningLesson.checks[0].choices![0]);
  expect(render(props)).toContain('Has dejado el mando guardado');
  expect(complete).not.toHaveBeenCalled();
  nodes.find((node) => node.type === GrammarSituation)!.props.onAnswer(deskMeaningLesson.checks[0].answers[0]);
  expect(render(props)).toContain('Mensaje entregado');
  const activities = readLearningActivities('learner');
  expect(activities.map((activity) => activity.correct)).toEqual([false, true]);
  expect(activities.every((activity) => activity.modality === 'choice' && activity.helped)).toBe(true);
  expect(readSentenceMemories('learner')).toHaveLength(0);
  button('Seguir →').props.onClick(); render(props);
  expect(nodes.find((node) => node.type === 'input')).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});
it('reanuda la misma escena elegida sin escribir otro intento; inspección no guarda aprendizaje', () => {
  const check = deskMeaningLesson.checks[0];
  const html = render({ lesson: deskMeaningLesson, checkpoint: { stage: deskMeaningLesson.steps.length, checkIndex: 0, checkId: check.id, input: check.answers[0], feedback: 'correct', helped: false } });
  expect(html).toContain('Mensaje entregado');
  expect(readLearningActivities('learner')).toHaveLength(0);
  hooks.state.clear();
  const inspection = { lesson: deskMeaningLesson, startAtPractice: true, reviewMode: true };
  render(inspection);
  nodes.find((node) => node.type === GrammarSituation)!.props.onAnswer(check.answers[0]); render(inspection);
  expect(readLearningActivities('learner')).toHaveLength(0);
  expect(readSentenceMemories('learner')).toHaveLength(0);
});
