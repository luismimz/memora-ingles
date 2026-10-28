import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { PlayGrammarToy } from './PlayGrammarToy';
import { piece } from '../domain/grammarLesson';
import { GrammarOrder } from './GrammarOrder';
let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); });
it('enseña significado antes de encajar; completar revela el modelo, no envía escritura ni ofrece continuar', () => {
  const discover = vi.fn();
  function Toy() {
    const [revealed, setRevealed] = useState(false);
    return <PlayGrammarToy before={{ en: 'I', es: 'yo' }} after={{ en: 'WATER', es: 'agua' }} token={piece('WANT','verb')} meaning="quiero" target="Quiero agua." insight="I WANT: dices qué quieres." revealed={revealed} onDiscover={() => { discover(); setRevealed(true); }} />;
  }
  act(() => { tree = create(<Toy />); });
  const bank = tree.root.findByProps({ className: 'order-bank' }).findByType('button');
  expect(bank.findByType('small').children).toEqual(['quiero']);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  const click = bank.props.onClick;
  act(() => { click({ detail: 0 }); click({ detail: 0 }); });
  expect(discover).toHaveBeenCalledOnce();
  expect(tree.root.findByType(GrammarOrder).props).toMatchObject({ selected: [0], locked: true });
  expect(tree.root.findByProps({ className: 'toy-insight' }).children).toEqual(['I WANT: dices qué quieres.']);
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(0);
});
it('un modelo restaurado queda armado y no vuelve a disparar la revelación', () => {
  const discover = vi.fn();
  act(() => { tree = create(<PlayGrammarToy before={{ en: 'I WANT', es: 'quiero' }} after={{ en: 'COFFEE', es: 'café' }} token={piece('COLD','context')} meaning="frío" target="Quiero café frío." insight="COLD delante de COFFEE." revealed onDiscover={discover} />); });
  expect(tree.root.findByType(GrammarOrder).props.selected).toEqual([0]);
  expect(discover).not.toHaveBeenCalled();
  expect(tree.root.findByProps({ className: 'toy-fixed toy-prefix' })).toBeDefined();
});
