import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GrammarSituation } from './GrammarSituation';
import { meaningFixture as deskMeaningLesson } from '../test/grammarPracticeFixtures';
const check = deskMeaningLesson.checks[0];
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
  const tree = GrammarSituation({ check, selected: check.answers[0], feedback: 'correct', onAnswer: answer, onListen: listen })!;
  const children = tree.props.children;
  children[1].props.onClick();
  expect(listen).toHaveBeenCalledOnce();
  const buttons = children[2].props.children;
  expect(buttons.every((button: any) => button.props.disabled)).toBe(true);
  expect(buttons.map((button: any) => button.props['aria-pressed'])).toEqual([false, true]);
  const idle = GrammarSituation({ check, selected: '', feedback: 'idle', onAnswer: answer, onListen: listen })!;
  idle.props.children[2].props.children[0].props.onClick();
  idle.props.children[2].props.children[1].props.onClick();
  expect(answer.mock.calls.map(([value]) => value)).toEqual(check.choices);
});
it('el resultado refleja la escena elegida y ofrece reparación sin declarar dominio', () => {
  const wrong = renderToStaticMarkup(<GrammarSituation check={check} selected={check.choices![0]} feedback="help" onAnswer={() => {}} onListen={() => {}} />);
  expect(wrong).toContain('Has dejado el mando guardado');
  expect(wrong).not.toContain('Mensaje entregado');
  const right = renderToStaticMarkup(<GrammarSituation check={check} selected={check.answers[0]} feedback="correct" onAnswer={() => {}} onListen={() => {}} />);
  expect(right).toContain('Mensaje entregado');
  expect(right).not.toMatch(/dominas|aprendido para siempre/i);
});
