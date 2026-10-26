import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { preparedFixture as deskPreparedUnit } from '../test/grammarPracticeFixtures';
import { previewUnit } from '../preview/previewUnit';
const hooks = vi.hoisted(() => ({ index: 0, states: new Map<number, unknown>() }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => { const id = hooks.index++; if (!hooks.states.has(id)) hooks.states.set(id, initial); return [hooks.states.get(id), (value: unknown) => hooks.states.set(id, typeof value === 'function' ? value(hooks.states.get(id)) : value)]; },
  useRef: (current: unknown) => ({ current }), useEffect: () => {},
}));
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playMiss: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn() }));
import { SentenceBuilderCard } from './SentenceBuilderCard';
const pick = vi.fn(); const attempt = vi.fn(); const next = vi.fn();
let nodes: ReactElement<any>[];
function render(filledSlots = 1, sentence = deskPreparedUnit.sentence, overrides: Partial<Parameters<typeof SentenceBuilderCard>[0]> = {}) {
  hooks.index = 0;
  const tree = SentenceBuilderCard({ sentence, filledSlots, sceneWord: deskPreparedUnit.words[0], processForm: deskPreparedUnit.grammar[0], index: 0, total: 2, choiceSeed: 0, onPick: pick, onAttempt: attempt, onNext: next, ...overrides });
  nodes = [];
  const visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { nodes.push(node); visit(node.props.children); } };
  visit(tree);
  return renderToStaticMarkup(tree);
}
const button = (text: string) => nodes.find((node) => node.type === 'button' && node.props.children === text)!;
beforeEach(() => { hooks.states.clear(); vi.clearAllMocks(); });
it('acerca el objetivo español a las opciones y presenta el modelo antes de explicarlo', () => {
  const preparation = render();
  expect(preparation.indexOf('class="coach-row" lang="es"')).toBeLessThan(preparation.indexOf('class="coach-caption"'));
  render(1, deskPreparedUnit.sentence, { preparationStep: 3 });
  const target = nodes.find((node) => node.props.className === 'builder-target')!;
  expect(target.props.children[1].props.children).toBe(deskPreparedUnit.sentence.slots[1].es);
  expect(nodes.find((node) => node.props.className === 'slot-options')).toBeTruthy();
  expect(pick).not.toHaveBeenCalled(); expect(attempt).not.toHaveBeenCalled();
});
it('un checkpoint controlado vuelve al paso exacto sin evaluar ni repetir las piezas anteriores', () => {
  const change = vi.fn();
  const html = render(1, deskPreparedUnit.sentence, { preparationStep: 2, onPreparationChange: change });
  expect(html).toContain('lang="en">at my desk');
  expect(html).not.toContain('slot-options');
  expect(change).not.toHaveBeenCalled();
  button('Usar estas piezas →').props.onClick();
  expect(change).toHaveBeenCalledWith(3);
  expect(pick).not.toHaveBeenCalled(); expect(attempt).not.toHaveBeenCalled();
  expect(render(1, deskPreparedUnit.sentence, { preparationStep: 3 })).toContain('slot-options');
  expect(render(1, deskPreparedUnit.sentence, { preparationStep: 99 })).toContain('lang="en">my');
});
it('explica una pieza cada vez, sin opciones ni intentos antes de terminar', () => {
  for (const [index, expected] of ['my', 'on my computer', 'at my desk'].entries()) {
    const html = render();
    expect(html).toContain(`lang="en">${expected}`);
    expect(html).not.toContain('slot-options');
    button(index === 2 ? 'Usar estas piezas →' : 'Ver la siguiente pieza →').props.onClick();
    expect(pick).not.toHaveBeenCalled(); expect(attempt).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
  }
  expect(render()).toContain('slot-options');
  button('on my computer.').props.onClick();
  expect(attempt).toHaveBeenCalledWith('on my computer.', true, 1);
  expect(pick).toHaveBeenCalledOnce();
});
it('el constructor vertical anuncia la acción real de cada paso sin saltar preparación ni evaluar por navegar', () => {
  const change = vi.fn();
  for (const step of [0, 1, 2]) {
    const html = render(1, deskPreparedUnit.sentence, { vertical: true, preparationStep: step, onPreparationChange: change });
    expect(nodes[0].props.advanceLabel).toBe(step === 2 ? 'Usar estas piezas →' : 'Ver la siguiente pieza →');
    expect(html).not.toContain('slot-options');
    nodes[0].props.onAdvance();
    expect(change).toHaveBeenLastCalledWith(step + 1);
  }
  expect(render(1, deskPreparedUnit.sentence, { vertical: true, preparationStep: 3 })).toContain('slot-options');
  expect(nodes[0].props.onAdvance).toBeUndefined();
  expect(pick).not.toHaveBeenCalled(); expect(attempt).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
  render(deskPreparedUnit.sentence.slots.length, deskPreparedUnit.sentence, { vertical: true });
  expect(nodes[0].props.advanceLabel).toBe('Siguiente frase →');
  render(deskPreparedUnit.sentence.slots.length, deskPreparedUnit.sentence, { vertical: true, index: 1 });
  expect(nodes[0].props.advanceLabel).toBe('Usar mi frase →');
  nodes[0].props.onAdvance(); expect(next).toHaveBeenCalledOnce();
  expect(attempt).not.toHaveBeenCalled();
});
it('un montaje desde un slot pendiente vuelve a ofrecer su preparación, conservando los slots ya construidos', () => {
  const html = render(1);
  expect(html).toContain('PREPARA ESTA PIEZA');
  expect(html).toContain('is-filled');
  expect(html).not.toContain('slot-options');
  expect(pick).not.toHaveBeenCalled();
});
it('las frases antiguas sin preparación conservan las opciones y el comportamiento', () => {
  const html = render(1, previewUnit.sentence);
  expect(html).not.toContain('slot-preparation');
  expect(html).toContain('slot-options');
  button('on my computer.').props.onClick();
  expect(pick).toHaveBeenCalledOnce();
});

it('explica el error hasta corregir, no solo durante la animación, sin generar intentos por esperar', () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  const sentence = { ...deskPreparedUnit.sentence, en: 'I have a book.', es: 'Yo tengo un libro.', slots: [
    { en: 'I', es: 'Yo', choices: ['I', 'have'] as [string, string] },
    { en: 'have', es: 'tengo', choices: ['a', 'have'] as [string, string] },
    { en: 'a', es: 'un', choices: ['a', 'I'] as [string, string] },
    { en: 'book.', es: 'libro', choices: ['pen.', 'book.'] as [string, string] },
  ] };
  try {
    render(1, sentence); button('a').props.onClick();
    const expected = '«a» corresponde a «un». Aquí necesitas «tengo».';
    expect(render(1, sentence)).toContain(expected);
    vi.advanceTimersByTime(60_000);
    const html = render(1, sentence);
    expect(html).toContain(expected); expect(html).toContain('role="status"');
    expect(html).toContain('lang="en"');
    expect(attempt).toHaveBeenCalledTimes(1); expect(pick).not.toHaveBeenCalled();
    button('have').props.onClick();
    expect(pick).toHaveBeenCalledOnce(); expect(attempt).toHaveBeenCalledTimes(2);
    expect(render(2, sentence)).not.toContain(expected);
  } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
});
