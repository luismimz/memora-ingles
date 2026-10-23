import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import { GrammarSituation } from './GrammarSituation';
import { lessonForForm } from '../domain/grammarLesson';
import { previewUnit } from '../preview/previewUnit';
import { meaningFixture as deskMeaningLesson } from '../test/grammarPracticeFixtures';
const check = deskMeaningLesson.checks[0];
it.each([
  ['brush', 'brushing', 'cepillar', 'cepillando', 'cepillando los dientes', 'El cepillo sigue en su vaso', 'El cepillo sigue en el vaso'],
  ['cook', 'cooking', 'cocinar', 'cocinando', 'removiendo una olla', 'La olla está apartada', 'La olla sigue apartada'],
])('vincula %s con acción física y reparación propias, no un escritorio decorado', (base, action, baseEs, actionEs, active, waiting, help) => {
  const form = { ...previewUnit.grammar[0], englishBase: base, english: action, englishRoot: base, englishNut: 'ing', spanish: actionEs, spanishStem: actionEs.slice(0, -4), spanishEnding: 'ando', subjects: [{ en: "I'm", expandedEn: 'I am', es: 'Yo estoy', phrase: `I'm ${action}` }] };
  const task = lessonForForm(form, baseEs)!.checks[1];
  const html = renderToStaticMarkup(<GrammarSituation check={task} selected="" feedback="idle" onAnswer={() => {}} onListen={() => {}} />);
  expect(html).toContain(active); expect(html).toContain(waiting); expect(html).not.toContain('mando'); expect(html).not.toContain('situation-result');
  const wrong = renderToStaticMarkup(<GrammarSituation check={task} selected={task.choices![1]} feedback="help" onAnswer={() => {}} onListen={() => {}} />);
  expect(wrong).toContain(help); expect(wrong).not.toContain('Mensaje entregado');
  const right = renderToStaticMarkup(<GrammarSituation check={task} selected={task.answers[0]} feedback="correct" onAnswer={() => {}} onListen={() => {}} />);
  expect(right).toContain('Mensaje entregado'); expect(right).toContain('aria-pressed="true"');
});
it('presenta dos escenas accesibles, mensaje inglés y escucha sin temporizador ni respuesta marcada', () => {
  const html = renderToStaticMarkup(<GrammarSituation check={check} selected="" feedback="idle" onAnswer={() => {}} onListen={() => {}} />);
  expect(html).toContain('Una persona está jugando con el mando');
  expect(html).toContain('El mando sigue guardado');
  expect(html).toContain('lang="en"');
  expect(html).toContain('Escuchar el mensaje inglés');
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
  expect(html).not.toContain('situation-result');
});
it('cada elección dispara su propio mensaje y el botón de audio sigue disponible tras responder', () => {
  const answer = vi.fn(); const listen = vi.fn();
  let tree: ReturnType<typeof create>;
  act(() => { tree = create(<GrammarSituation check={check} selected={check.answers[0]} feedback="correct" onAnswer={answer} onListen={listen} />); });
  act(() => tree.root.findByProps({ 'aria-label': 'Escuchar el mensaje inglés' }).props.onClick());
  expect(listen).toHaveBeenCalledOnce();
  const buttons = tree!.root.findAllByType('button').filter((button) => button.props['data-drop-choice']);
  expect(buttons.every((button: any) => button.props.disabled)).toBe(true);
  expect(buttons.filter((button) => button.props['aria-pressed']).map((button) => button.props['data-drop-choice'])).toEqual(check.answers);
  act(() => tree.update(<GrammarSituation check={check} selected="" feedback="idle" onAnswer={answer} onListen={listen} />));
  const idle = tree!.root.findAllByType('button').filter((button) => button.props['data-drop-choice']);
  for (const choice of idle) act(() => choice.props.onClick());
  expect(answer.mock.calls.map(([value]) => value)).toEqual(idle.map((button) => button.props['data-drop-choice']));
  expect(new Set(answer.mock.calls.map(([value]) => value))).toEqual(new Set(check.choices));
  act(() => tree.unmount());
});
it('el resultado refleja la escena elegida y ofrece reparación sin declarar dominio', () => {
  const wrong = renderToStaticMarkup(<GrammarSituation check={check} selected={check.choices![0]} feedback="help" onAnswer={() => {}} onListen={() => {}} />);
  expect(wrong).toContain('Has dejado el mando guardado');
  expect(wrong).not.toContain('Mensaje entregado');
  const right = renderToStaticMarkup(<GrammarSituation check={check} selected={check.answers[0]} feedback="correct" onAnswer={() => {}} onListen={() => {}} />);
  expect(right).toContain('Mensaje entregado');
  expect(right).not.toMatch(/dominas|aprendido para siempre/i);
});
