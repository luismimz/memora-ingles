import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { WordAssembly } from './WordAssembly';
import { previewUnit } from '../preview/previewUnit';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSnap: vi.fn(), stopSpeech: vi.fn() }));
vi.mock('../services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
it('construye con letras repetidas, ayuda sin castigar y no permite saltar antes de armar', () => {
  const next = vi.fn(); let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<WordAssembly word={{ ...previewUnit.words[0], en: 'SEE', es: 'ver' }} onContinue={next} />); });
  const piece = (id: number) => tree.root.findByProps({ 'aria-label': `Colocar ${id === 1 ? 'S' : 'E'}, pieza ${id}` });
  expect(tree.root.findAllByProps({ className: 'card-advance' })).toHaveLength(0);
  act(() => piece(2).props.onClick()); expect(tree.root.findByProps({ role: 'status' }).children).toEqual(['Busca «S»']);
  act(() => piece(1).props.onClick()); act(() => piece(3).props.onClick()); act(() => piece(2).props.onClick());
  expect(tree.root.findByProps({ className: 'assembly-line is-complete' })).toBeTruthy();
  expect(tree.root.findAllByProps({ className: 'card-advance' })).toHaveLength(1);
  expect(next).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
