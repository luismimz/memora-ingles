import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LearningLibrary, type LibraryBrowseState } from './LearningLibrary';
import { previewUnit } from '../preview/previewUnit';
import type { AtomicUnit } from '../domain/unit';

let tree: ReactTestRenderer;
const open = vi.fn(), back = vi.fn(), write = vi.fn();
const focused: string[] = [];
const units: AtomicUnit[] = Array.from({ length: 45 }, (_, index) => ({
  ...previewUnit, id: `browse-${index}`, kind: 'vocabulary-pack', title: `Tanda · ${index % 2 ? 'Casa' : 'Tecnología'} · ${index}`,
  words: [{ ...previewUnit.words[0], en: index === 44 ? 'farword' : `word${index}`, es: index === 44 ? 'objetivo lejano' : `palabra${index}` }],
}));
function mount(input = units) {
  act(() => { tree = create(<LearningLibrary mode="vocabulary" units={input} userId="browse-only" inspection={false} onOpen={open} onBack={back} onWords={() => {}} />, {
    createNodeMock: (node) => ['h2', 'input'].includes(String(node.type)) ? { focus: () => focused.push(node.type === 'input' ? 'search' : String(node.props.children)) } : null,
  }); });
}
const articles = () => tree.root.findAllByType('article');
const status = () => tree.root.findByProps({ id: 'library-results' }).children.join('');
const more = () => tree.root.findAllByType('button').find((node) => node.children.join('').includes('tandas más'));
const search = (query: string) => act(() => tree.root.findByType('input').props.onChange({ target: { value: query } }));

beforeEach(() => { open.mockClear(); back.mockClear(); write.mockClear(); focused.length = 0; vi.stubGlobal('localStorage', { getItem: () => null, setItem: write }); });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('muestra pocas tandas y el total disponible sin fabricar práctica', () => {
  mount(); expect(articles()).toHaveLength(6); expect(status()).toContain('6 de 45');
  expect(focused).toEqual([]); expect(write).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
  act(() => articles()[0].findByType('button').props.onClick());
  expect(open).toHaveBeenCalledWith(units[0], 'vocabulary'); expect(write).not.toHaveBeenCalled();
});

it('permite revelar todo el catálogo, también más de35, y enfoca la primera tarjeta añadida', () => {
  mount(); act(() => more()!.props.onClick());
  expect(articles()).toHaveLength(12); expect(focused).toEqual([units[6].title]);
  for (let index = 0; index < 6; index++) act(() => more()!.props.onClick());
  expect(articles()).toHaveLength(45); expect(more()).toBeUndefined(); expect(status()).toContain('45 de 45');
  expect(write).not.toHaveBeenCalled();
});

it('busca desde el principio en tarjetas todavía no reveladas, en inglés y en español', () => {
  mount(); search('FARWORD'); expect(articles()).toHaveLength(1); expect(articles()[0].findByType('h2').children).toEqual([units[44].title]);
  search('objetivo lejano'); expect(articles()).toHaveLength(1);
  expect(write).not.toHaveBeenCalled();
});

it('tolera tildes y combina búsqueda y ámbito sin limitar los resultados al primer bloque', () => {
  mount(); search('tecnologia'); expect(status()).toContain('6 de 23');
  act(() => tree.root.findByType('select').props.onChange({ target: { value: 'Casa' } }));
  expect(articles()).toHaveLength(0); expect(status()).toContain('No hay resultados');
  search('word43'); expect(articles()).toHaveLength(1);
});

it('limpiar restaura la vista compacta y devuelve el foco a búsqueda', () => {
  mount(); act(() => more()!.props.onClick()); search('nada coincide');
  const clear = tree.root.findAllByType('button').find((node) => node.children.includes('Limpiar búsqueda y filtros'))!;
  act(() => clear.props.onClick());
  expect(articles()).toHaveLength(6); expect(status()).toContain('6 de 45'); expect(focused.at(-1)).toBe('search');
});

it('no inventa ámbitos vacíos ni continuación con un catálogo vacío', () => {
  mount([{ ...units[0], title: 'Sin ámbito' }]);
  expect(tree.root.findAllByType('select')).toHaveLength(0);
  act(() => tree.unmount()); mount([]);
  expect(articles()).toHaveLength(0); expect(more()).toBeUndefined(); expect(status()).toContain('Aún no hay contenido');
});

it('solo señala intentos del alumno para esa versión, no exposición o registros antiguos', () => {
  const row = { id: 'attempt', at: '2026-10-25T00:00:00Z', unitId: units[0].id, unitTitle: units[0].title, contentVersion: units[0].contentVersion ?? '1', activityId: 'word-choice', skill: 'word0', phase: 'arcade', source: 'learner', modality: 'choice', prompt: 'palabra0', response: 'otra', expected: 'word0', correct: false, helped: true };
  const rows = [row, { ...row, id: 'model', unitId: units[1].id, source: 'authored', correct: null }, { ...row, id: 'old', unitId: units[2].id, contentVersion: 'old-version' }];
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'memora-v2.learning.browse-only' ? JSON.stringify(rows) : null, setItem: write });
  mount();
  expect(articles()[0].findAllByProps({ className: 'learning-library-practiced' })).toHaveLength(1);
  expect(articles()[1].findAllByProps({ className: 'learning-library-practiced' })).toHaveLength(0);
  expect(articles()[2].findAllByProps({ className: 'learning-library-practiced' })).toHaveLength(0);
  expect(write).not.toHaveBeenCalled();
});

it('restaura filtro y tandas mostradas al volver de practicar sin otro almacén de aprendizaje', () => {
  let saved: LibraryBrowseState | undefined;
  const render = () => create(<LearningLibrary mode="vocabulary" units={units} userId="browse-only" inspection={false} initialBrowse={saved} onBrowseChange={(state) => { saved = state; }} onOpen={open} onBack={back} onWords={() => {}} />, { createNodeMock: (node) => node.type === 'h2' ? { focus: () => focused.push(String(node.props.children)) } : null });
  act(() => { tree = render(); });
  search('tecnologia'); act(() => more()!.props.onClick());
  expect(saved).toEqual({ search: 'tecnologia', domain: '', limit: 12 });
  act(() => articles()[9].findByType('button').props.onClick());
  expect(saved?.selectedId).toBe(units[18].id);
  act(() => tree.unmount()); act(() => { tree = render(); });
  expect(tree.root.findByType('input').props.value).toBe('tecnologia'); expect(articles()).toHaveLength(12);
  expect(focused.at(-1)).toBe(units[18].title);
  expect(write).not.toHaveBeenCalled();
});
