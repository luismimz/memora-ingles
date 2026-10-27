import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { SpeechModelButton } from './SpeechModelButton';
import { preparedFixture as unit } from '../test/grammarPracticeFixtures';
import { playEnglish } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playMiss: vi.fn(), playSnap: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const review = vi.fn(), pick = vi.fn(), attempt = vi.fn(), next = vi.fn();
const render = (filledSlots = 1, compactPreparation = true) => <SentenceBuilderCard vertical compactPreparation={compactPreparation} sentence={unit.sentence} vocabulary={unit.words} sceneWord={unit.words[0]} processForm={unit.grammar[0]} index={0} total={1} filledSlots={filledSlots} choiceSeed={0} onPick={pick} onAttempt={attempt} onNext={next} onPreparationReview={review} />;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const help = () => tree.root.findByProps({ className: 'familiar-piece' }).findAllByType('details')[0];
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }) }); });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('conecta la pieza activa en el mismo tablero, con una explicación exacta y enseñanza completa opcional', async () => {
  await act(async () => { tree = create(render()); });
  const options = tree.root.findByProps({ className: 'slot-options' });
  expect(tree.root.findAllByProps({ 'data-connection-active': true })).toHaveLength(0);
  await act(async () => help().props.onToggle({ currentTarget: { open: true } }));
  expect(review).toHaveBeenCalledOnce();
  expect(tree.root.findByProps({ className: 'slot-options' })).toBe(options);
  const active = tree.root.findByProps({ 'data-connection-active': true });
  expect(text(active)).toContain(unit.sentence.slots[1].es);
  const pair = tree.root.findByProps({ 'aria-label': 'Conexión de la pieza activa' });
  expect(text(pair.findByProps({ lang: 'es' }))).toBe(unit.sentence.slots[1].es);
  expect(text(pair.findByProps({ lang: 'en' }))).toBe(unit.sentence.slots[1].en);
  expect(text(tree.root.findByProps({ className: 'builder-note' }))).toBe('Este bloque indica la actividad en el ordenador.');
  const full = tree.root.findByProps({ className: 'piece-teaching-detail' });
  expect(full.findAllByType('li')).toHaveLength(3);
  expect(tree.root.findByType(SpeechModelButton).props.text).toBe(unit.sentence.en);
  expect(playEnglish).not.toHaveBeenCalled();
  expect(attempt).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
});
it('la consulta no bloquea respuesta ni necesita otra pantalla, y no deja foco de ayuda en otra pieza', async () => {
  await act(async () => { tree = create(render()); });
  await act(async () => help().props.onToggle({ currentTarget: { open: true } }));
  await act(async () => tree.root.findByProps({ className: 'slot-options' }).findAllByType('button').find((button) => button.props.children === unit.sentence.slots[1].en)!.props.onClick({ detail: 0 }));
  expect(attempt).toHaveBeenCalledWith(unit.sentence.slots[1].en, true, 1);
  expect(pick).toHaveBeenCalledOnce();
  await act(async () => tree.update(render(0)));
  expect(tree.root.findAllByProps({ 'data-connection-active': true })).toHaveLength(0);
  expect(tree.root.findAllByProps({ className: 'familiar-piece' })).toHaveLength(0);
  await act(async () => tree.update(render(1)));
  expect(tree.root.findAllByProps({ 'data-connection-active': true })).toHaveLength(0);
  expect(review).toHaveBeenCalledOnce(); expect(next).not.toHaveBeenCalled();
});
it('la preparación nueva conserva todos sus pasos obligatorios, sin ofrecer un atajo a las opciones', async () => {
  await act(async () => { tree = create(render(1, false)); });
  expect(tree.root.findAllByProps({ className: 'familiar-piece' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ className: 'slot-options' })).toHaveLength(0);
  expect(tree.root.findByProps({ className: 'slot-preparation' })).toBeTruthy();
  expect(review).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled(); expect(attempt).not.toHaveBeenCalled();
});
