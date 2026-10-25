import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ProfileView } from './ProfileView';
import { syncLabels, type SyncStatus } from '../services/progressSync';

let tree: ReactTestRenderer;
let values: Map<string, string>;
const back = vi.fn(), exit = vi.fn(), evolution = vi.fn(), appearance = vi.fn(), manage = vi.fn();
class Reader {
  static instances: Reader[] = [];
  result: string | null = null;
  onload?: () => void;
  onerror?: () => void;
  abort = vi.fn();
  readAsDataURL = vi.fn();
  constructor() { Reader.instances.push(this); }
  finish(value = 'data:image/png;base64,QQ==') { this.result = value; this.onload?.(); }
}
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node).replace(/\s+/gu, ' ').trim() === label)!;
const props = { userId: 'settings-isolated', appearance: 'light' as const, syncStatus: 'saved' as const, onToggleAppearance: appearance, onBack: back, onExit: exit, onEvolution: evolution };
function mount(admin = false) { act(() => { tree = create(<ProfileView {...props} onManageContent={admin ? manage : undefined} />); }); }
function upload(type = 'image/png', size = 100) {
  const target = { files: [{ type, size }], value: 'selected-file' };
  act(() => tree.root.findByType('input').props.onChange({ target }));
  expect(target.value).toBe('');
}
beforeEach(() => {
  vi.clearAllMocks(); Reader.instances = []; values = new Map();
  vi.stubGlobal('localStorage', { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => values.set(key, value)) });
  vi.stubGlobal('FileReader', Reader);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('separa ajustes de aprendizaje, con una sola acción principal y sin leer estadísticas o escribir progreso', () => {
  mount();
  expect(text(tree.toJSON())).toContain('Perfil y ajustes');
  expect(text(tree.toJSON())).not.toContain('El recuerdo sigue fresco');
  expect(text(tree.toJSON())).not.toContain('aciertos al recordar');
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(1);
  expect(vi.mocked(localStorage.getItem).mock.calls.every(([key]) => ['memora-v2.avatar.settings-isolated', 'memora-v2.arcade-cadence.settings-isolated'].includes(key))).toBe(true);
  act(() => { button('Volver a mi recorrido').props.onClick(); button('Ver Mi evolución').props.onClick(); button('Cambiar a modo oscuro').props.onClick(); });
  expect(back).toHaveBeenCalledOnce(); expect(evolution).toHaveBeenCalledOnce(); expect(appearance).toHaveBeenCalledOnce();
  expect(exit).not.toHaveBeenCalled(); expect(values.size).toBe(0);
  expect(text(tree.toJSON())).not.toContain('Gestionar contenido');
});
it('administración y cierre de sesión son secundarios, solo usan los callbacks autorizados', () => {
  mount(true);
  const details = tree.root.findAllByType('details');
  expect(details).toHaveLength(2); expect(details.every((node) => node.props.open === undefined)).toBe(true);
  act(() => button('Gestionar contenido').props.onClick()); expect(manage).toHaveBeenCalledOnce();
  expect(exit).not.toHaveBeenCalled();
  act(() => button('Cerrar sesión').props.onClick()); expect(exit).toHaveBeenCalledOnce();
  expect(values.size).toBe(0);
});
it('el ritmo usa la preferencia compartida, conserva rondas y persiste sin crear aprendizaje', () => {
  const key = 'memora-v2.arcade-cadence.settings-isolated';
  const cadence = { seen: ['word-1'], words: 1, pending: 'grammar', calm: true };
  values.set(key, JSON.stringify(cadence));
  mount();
  const rhythm = () => tree.root.findByProps({ 'aria-label': 'Jugar sin cuenta atrás' });
  expect(rhythm().props['aria-pressed']).toBe(true);
  expect(localStorage.setItem).not.toHaveBeenCalled();
  act(() => rhythm().props.onClick());
  expect(JSON.parse(values.get(key)!)).toEqual({ ...cadence, calm: false });
  expect(text(tree.toJSON())).toContain('Ritmo guardado en este navegador.');
  act(() => tree.unmount()); mount();
  expect(rhythm().props['aria-pressed']).toBe(false);
  act(() => tree.update(<ProfileView {...props} userId="other-settings-isolated" />));
  expect(rhythm().props['aria-pressed']).toBe(false);
  act(() => rhythm().props.onClick());
  expect(JSON.parse(values.get(key)!)).toEqual({ ...cadence, calm: false });
  expect(JSON.parse(values.get('memora-v2.arcade-cadence.other-settings-isolated')!).calm).toBe(true);
  expect([...values.keys()].every((stored) => stored.startsWith('memora-v2.arcade-cadence.'))).toBe(true);
});
it('si falla guardar el ritmo no simula una preferencia persistida', () => {
  mount();
  vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('full'); });
  act(() => tree.root.findByProps({ 'aria-label': 'Jugar sin cuenta atrás' }).props.onClick());
  expect(tree.root.findByProps({ 'aria-label': 'Jugar sin cuenta atrás' }).props['aria-pressed']).toBe(false);
  expect(text(tree.toJSON())).toContain('No se pudo guardar el ritmo.');
  expect(text(tree.toJSON())).not.toContain('Ritmo guardado en este navegador.');
  expect(values.size).toBe(0);
});
it('guarda una foto válida solo en este navegador y conserva límites de tipo y tamaño', () => {
  mount(); upload('image/gif'); upload('image/png', 500_001);
  expect(Reader.instances).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('hasta 500 KB');
  upload('image/png', 500_000);
  expect(text(tree.toJSON())).toContain('Preparando tu foto');
  act(() => Reader.instances[0].finish());
  expect(values.get('memora-v2.avatar.settings-isolated')).toBe('data:image/png;base64,QQ==');
  expect(values.size).toBe(1);
  expect(text(tree.toJSON())).toContain('Foto guardada en este navegador.');
  expect(tree.root.findByType('img').props.src).toBe('data:image/png;base64,QQ==');
});
it('una foto anterior no pisa la nueva ni escribe después de abandonar la pantalla', () => {
  mount(); upload(); const old = Reader.instances[0]; upload(); const current = Reader.instances[1];
  expect(old.abort).toHaveBeenCalledOnce();
  act(() => current.finish('data:image/webp;base64,Qg=='));
  act(() => old.finish());
  expect(values.get('memora-v2.avatar.settings-isolated')).toBe('data:image/webp;base64,Qg==');
  upload(); const late = Reader.instances[2];
  act(() => tree.unmount());
  expect(late.abort).toHaveBeenCalledOnce();
  act(() => late.finish('data:image/png;base64,Qw=='));
  expect(values.get('memora-v2.avatar.settings-isolated')).toBe('data:image/webp;base64,Qg==');
});
it('cambiar de usuario cancela una carga pendiente y no guarda la imagen en otra cuenta', () => {
  mount(); upload(); const old = Reader.instances[0];
  act(() => tree.update(<ProfileView {...props} userId="second-settings-isolated" />));
  act(() => old.finish());
  expect(values.size).toBe(0); expect(tree.root.findAllByType('img')).toHaveLength(0);
});
it('un fallo de lectura o guardado conserva el avatar anterior y da una explicación', () => {
  values.set('memora-v2.avatar.settings-isolated', 'data:image/png;base64,Qg==');
  mount(); upload();
  act(() => Reader.instances[0].onerror?.());
  expect(text(tree.toJSON())).toContain('No se pudo leer esta imagen.');
  upload(); vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('full'); });
  act(() => Reader.instances[1].finish());
  expect(text(tree.toJSON())).toContain('No se pudo guardar la imagen');
  expect(tree.root.findByType('img').props.src).toBe('data:image/png;base64,Qg==');
});
it.each(['offline', 'error', 'storage-full'] as SyncStatus[])('el estado %s sigue visible sin afirmar que está guardado en la cuenta', (status) => {
  act(() => { tree = create(<ProfileView {...props} syncStatus={status} />); });
  expect(text(tree.toJSON())).toContain(syncLabels[status]);
  expect(values.size).toBe(0);
});
it('la revisión no ofrece cerrar una sesión como si fuera una cuenta activa', () => {
  act(() => { tree = create(<ProfileView {...props} syncStatus={undefined} onEvolution={undefined} />); });
  expect(text(tree.toJSON())).toContain('Vista de revisión: no registra aprendizaje.');
  expect(button('Cerrar sesión')).toBeUndefined();
  expect(button('Salir de la revisión')).toBeTruthy();
  expect(text(tree.toJSON())).not.toContain('Mi evolución');
});
