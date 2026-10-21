import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GrammarOrder } from './GrammarOrder';
import { orderedFixture as deskSequenceLesson } from '../test/grammarPracticeFixtures';
const pieces = deskSequenceLesson.checks[0].ordering!;
it('tocar y quitar piezas no envía respuestas ni obliga a arrastrar', () => {
  const change = vi.fn(); const answer = vi.fn();
  const tree = GrammarOrder({ pieces, selected: [], locked: false, onChange: change, onAnswer: answer });
  expect(tree.props.children[2].props.disabled).toBe(true);
  tree.props.children[1].props.children[1].props.onClick();
  expect(change).toHaveBeenCalledWith([1]); expect(answer).not.toHaveBeenCalled();
  const chosen = GrammarOrder({ pieces, selected: [1, 2], locked: false, onChange: change, onAnswer: answer });
  chosen.props.children[0].props.children[0].props.onClick();
  expect(change).toHaveBeenLastCalledWith([2]);
});
it('envía solo el orden construido y bloquea el envío después del acierto', () => {
  const answer = vi.fn();
  const tree = GrammarOrder({ pieces, selected: [1, 2, 0], locked: false, onChange: () => {}, onAnswer: answer });
  expect(tree.props.children[2].props.disabled).toBe(false);
  tree.props.children[2].props.onClick();
  expect(answer).toHaveBeenCalledWith('I AM PLAYING');
  const html = renderToStaticMarkup(<GrammarOrder pieces={pieces} selected={[1, 2, 0]} locked onChange={() => {}} onAnswer={answer} />);
  expect(html).toContain('Tu mensaje ordenado');
  expect(html).toContain('Quitar I, posición 1');
  expect(html).toContain('práctica con apoyo');
  expect(html).not.toContain('draggable');
});
