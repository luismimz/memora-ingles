import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { EvolutionMemoryLibrary } from './EvolutionMemoryLibrary';
import { previewUnit } from '../preview/previewUnit';
import { scheduleWord, type SentenceMemory } from '../domain/memory';

const memories = Array.from({ length: 13 }, (_, index) => scheduleWord(null, { ...previewUnit.words[0], en: `WORD-${index}`, es: index === 12 ? 'árbol final' : `palabra ${index}` }, 'quick', new Date('2026-10-25T05:00:00Z')));
const sentence: SentenceMemory = { key: 'sentence-last', unitId: 'old-unit', sentenceEn: 'I am playing.', sentenceEs: 'Estoy jugando.', firstSeenAt: '', lastAttemptAt: null, nextReviewAt: 'invalid', step: 0, attempts: 0, correct: 0, lapses: 0 };
let tree: ReactTestRenderer;
const listen = vi.fn(); const practice = vi.fn(); const focused: string[] = [];
const text = (node: any): string => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).replace(/\s+/gu, ' ').trim() === label)!;
const rows = () => tree.root.findAllByType('summary').filter((node) => node.props['data-memory-key']);
function mount(empty = false) {
  act(() => { tree = create(<EvolutionMemoryLibrary memories={empty ? [] : memories} sentences={empty ? [] : [sentence]} onListen={listen} onPractice={practice} />, { createNodeMock: (node) => node.type === 'input' ? { focus: () => focused.push('input') } : node.props['data-memory-key'] ? { focus: () => focused.push(node.props['data-memory-key']) } : null }); });
}
beforeEach(() => { vi.clearAllMocks(); focused.length = 0; });
afterEach(() => { if (tree) act(() => tree.unmount()); });
it('muestra tandas de seis hasta el final y enfoca la primera nueva sin escribir ni practicar', () => {
  mount(); expect(rows()).toHaveLength(6);
  act(() => button('Ver 6 recuerdos más').props.onClick());
  expect(rows()).toHaveLength(12); expect(focused.at(-1)).toBe(`word:${memories[6].key}`);
  act(() => button('Ver 2 recuerdos más').props.onClick());
  expect(rows()).toHaveLength(14); expect(focused.at(-1)).toBe(`word:${memories[12].key}`);
  expect(tree.root.findAllByType('button').some((node) => text(node).includes('recuerdos más'))).toBe(false);
  expect(practice).not.toHaveBeenCalled(); expect(listen).not.toHaveBeenCalled();
});
it('busca sobre todos los recuerdos, ignora acentos y conserva la biblioteca al limpiar', () => {
  mount();
  act(() => tree.root.findByType('input').props.onChange({ target: { value: 'ARBOL' } }));
  expect(rows()).toHaveLength(1); expect(text(rows()[0])).toContain('WORD-12');
  act(() => tree.root.findByType('input').props.onChange({ target: { value: 'PLAYING' } }));
  expect(rows()).toHaveLength(1); expect(text(tree.toJSON())).toContain('Sin fecha de repaso registrada.');
  act(() => tree.root.findByProps({ 'aria-label': 'Escuchar recuerdo: I am playing.' }).props.onClick());
  expect(listen).toHaveBeenCalledExactlyOnceWith('I am playing.');
  act(() => button('Limpiar búsqueda de recuerdos').props.onClick());
  expect(rows()).toHaveLength(6); expect(focused.at(-1)).toBe('input');
  expect(tree.root.findByType('input').props.value).toBe('');
});
it('distingue vacío de búsqueda sin coincidencias y mantiene la acción extra existente', () => {
  mount();
  act(() => tree.root.findByType('input').props.onChange({ target: { value: 'inexistente' } }));
  expect(rows()).toHaveLength(0); expect(text(tree.toJSON())).toContain('No hay recuerdos que coincidan.');
  act(() => tree.unmount()); mount(true);
  expect(text(tree.toJSON())).toContain('Aún no hay palabras o frases guardadas');
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  act(() => button('Practicar en Arcade').props.onClick()); expect(practice).toHaveBeenCalledOnce();
});
