import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { readLearningActivities } from '../domain/learningActivity';
import { readSentenceMemories } from '../domain/memory';
const hooks = vi.hoisted(() => ({ index: 0, state: new Map<number, unknown>() }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const id = hooks.index++; if (!hooks.state.has(id)) hooks.state.set(id, initial); return [hooks.state.get(id), (value: unknown) => hooks.state.set(id, typeof value === 'function' ? value(hooks.state.get(id)) : value)]; },
  useRef: (current: unknown) => ({ current }), useEffect: () => undefined,
}));
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSpanish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn() }));
import { GrammarCoach } from './GrammarCoach';
const lesson = lessonForForm(previewUnit.grammar[0], 'jugar')!;
const complete = vi.fn();
let nodes: ReactElement<any>[];
function render() {
  hooks.index = 0;
  const tree = GrammarCoach({ lesson, form: previewUnit.grammar[0], userId: 'learner', unitId: previewUnit.id, reviewMode: false, requirePractice: true, schedulePractice: true, onReady: () => {}, onContinue: complete });
  nodes = [];
  function visit(value: any) { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object' && value.props) { nodes.push(value); visit(value.props.children); } }
  visit(tree);
  return renderToStaticMarkup(tree);
}
const button = (text: string) => nodes.find((node) => node.type === 'button' && (node.props.children === text || node.props.children?.props?.text === text))!;
beforeEach(() => {
  hooks.state.clear(); complete.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
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
