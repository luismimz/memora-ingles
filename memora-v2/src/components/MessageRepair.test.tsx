import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MessageRepair } from './MessageRepair';
import { ExplainBack } from './ExplainBack';
import { prepareKeysSituation } from '../domain/keysSituation';
import { validateUnit } from '../domain/unit';
import keys from '../../content/keys-mission.json';
import { playEnglish } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'played', source: 'kokoro' })), playSpanish: vi.fn() }));
const repair = prepareKeysSituation(validateUnit(keys))!.repair;
const position = vi.fn(), answer = vi.fn();
let tree: ReactTestRenderer;
beforeEach(() => vi.clearAllMocks());
afterEach(() => { if (tree) act(() => tree.unmount()); });

it('ubicar una pieza no responde; el mensaje completo solo se envía al insertar', async () => {
  await act(async () => { tree = create(<MessageRepair {...repair} result="idle" onPosition={position} onAnswer={answer} />); });
  const bank = () => tree.root.findByProps({ 'aria-label': 'Piezas para reparar el mensaje' }).findAllByType('button');
  expect(bank().every((button) => button.props.disabled)).toBe(true);
  await act(async () => tree.root.findByProps({ 'aria-label': 'Insertar después de looking' }).props.onClick());
  expect(position).toHaveBeenCalledWith(3); expect(answer).not.toHaveBeenCalled();
  expect(playEnglish).not.toHaveBeenCalled();
  await act(async () => tree.update(<MessageRepair {...repair} result="idle" position={3} onPosition={position} onAnswer={answer} />));
  await act(async () => bank()[2].props.onClick());
  expect(answer).toHaveBeenCalledExactlyOnceWith('I am looking FOR my keys');
});
it('el borrador incorrecto nunca se pronuncia; el modelo correcto se escucha solo al pedirlo', async () => {
  await act(async () => { tree = create(<MessageRepair {...repair} result="model" onPosition={position} onAnswer={answer} />); });
  expect(tree.root.findAllByProps({ className: 'repair-seam' })).toHaveLength(0);
  expect(playEnglish).not.toHaveBeenCalled();
  await act(async () => tree.root.findByProps({ 'aria-label': 'Escuchar el mensaje reparado' }).props.onClick());
  expect(playEnglish).toHaveBeenLastCalledWith(repair.solution, undefined, true, expect.any(Function));
  expect(answer).not.toHaveBeenCalled();
});
it('la explicación es opcional, se puede cerrar y limita el borrador sin inventar evaluación', async () => {
  const draft = vi.fn(), compare = vi.fn();
  await act(async () => { tree = create(<ExplainBack prompt="¿Para qué sirve?" model="LOOKING FOR significa buscando aquí." draft="Un borrador" compared={false} onDraft={draft} onCompare={compare} />); });
  expect(tree.root.findByType('details').props.open).toBe(true);
  await act(async () => tree.root.findByType('details').props.onToggle({ currentTarget: { open: false } }));
  expect(tree.root.findByType('details').props.open).toBe(false);
  await act(async () => tree.root.findByType('textarea').props.onChange({ target: { value: 'x'.repeat(700) } }));
  expect(draft).toHaveBeenLastCalledWith('x'.repeat(500));
  expect(compare).not.toHaveBeenCalled(); expect(playEnglish).not.toHaveBeenCalled();
});
