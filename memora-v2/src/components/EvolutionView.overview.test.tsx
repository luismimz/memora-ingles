import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { EvolutionView } from './EvolutionView';
import { previewUnit } from '../preview/previewUnit';
import { recordLearningActivity, type LearningActivity } from '../domain/learningActivity';
import { recordWordRecall } from '../domain/memory';
import { stopSpeech } from '../services/audio';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSpanish: vi.fn(), stopSpeech: vi.fn() }));
const user = 'evolution-overview-isolated';
let tree: ReactTestRenderer;
let values: Map<string, string>;
const back = vi.fn(); const practice = vi.fn();
const text = (node: any): string => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
async function mount(inspectionMode = false) {
  await act(async () => { tree = create(<EvolutionView userId={user} units={[{ id: previewUnit.id, title: previewUnit.title, words: previewUnit.words }]} pilot={null} syncStatus="saved" inspectionMode={inspectionMode} onBack={back} onPractice={practice} onProfile={() => {}} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
}
function record(overrides: Partial<LearningActivity> = {}) {
  return recordLearningActivity(user, { unitId: previewUnit.id, unitTitle: previewUnit.title, contentVersion: '1', activityId: 'respond', skill: 'message', phase: 'dialogue', source: 'learner', modality: 'writing', prompt: 'Tu mensaje', response: 'I am playing', expected: 'I am playing', correct: true, helped: false, at: '2026-10-25T05:00:00.000Z', ...overrides });
}
const counts = () => tree.root.findByProps({ className: 'evolution-evidence' }).findAllByType('dd').map(text);
beforeEach(() => {
  values = new Map(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-25T06:00:00.000Z'));
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('orienta desde un historial vacío con una sola acción principal y el archivo secundario cerrado', async () => {
  await mount();
  expect(counts()).toEqual(['0', '0', '0']);
  expect(text(tree.toJSON())).toContain('Tu primer paso empieza en el recorrido.');
  const primary = tree.root.findAllByProps({ className: 'primary-action' });
  expect(primary).toHaveLength(1); expect(text(primary[0])).toBe('Ir a mi recorrido');
  expect(tree.root.findByProps({ className: 'evolution-section' }).props.open).toBeUndefined();
  expect(tree.root.findAllByProps({ className: 'history-log' })).toHaveLength(0);
  const before = [...values];
  await act(async () => primary[0].props.onClick());
  expect(back).toHaveBeenCalledOnce(); expect(practice).not.toHaveBeenCalled();
  expect([...values]).toEqual(before);
});
it('cuenta respuestas reales y repetidas, separa apoyo/opciones y no convierte modelos o cierres en aprendizaje', async () => {
  record(); record();
  record({ correct: false, response: 'I playing' });
  record({ helped: true });
  record({ modality: 'choice', helped: false }); // Legacy choices are still support.
  record({ source: 'authored', activityId: 'partner-hi', response: 'Hola', correct: null });
  record({ correct: null, activityId: 'model', at: '2026-10-25T05:50:00.000Z', unitTitle: 'No es la última respuesta' });
  record({ correct: null, phase: 'completion', at: '2026-10-25T05:55:00.000Z' });
  record({ correct: false, unitTitle: 'La última práctica real', at: '2026-10-25T05:30:00.000Z' });
  const before = [...values];
  await mount();
  expect(counts()).toEqual(['6', '2', '2']);
  expect(text(tree.root.findByProps({ className: 'evolution-last' }))).toContain('La última práctica real');
  expect(text(tree.toJSON())).toContain('no palabras nuevas ni dominio');
  expect([...values]).toEqual(before);
});
it('usa los repasos existentes y conserva recuerdos legacy sin inventar respuestas detalladas', async () => {
  recordWordRecall(user, previewUnit.words[0], 'missed', new Date('2026-10-24T06:00:00.000Z'));
  const before = [...values];
  await mount();
  expect(counts()).toEqual(['0', '0', '0']);
  expect(text(tree.toJSON())).toContain('Tus recuerdos anteriores siguen aquí.');
  expect(text(tree.root.findByProps({ className: 'evolution-next' }))).toContain('1 repaso sugerido');
  expect([...values]).toEqual(before);
  act(() => tree.unmount()); expect(stopSpeech).toHaveBeenCalled();
});
it('la revisión no lee datos personales y el buscador/archivo no escriben progreso', async () => {
  record(); const before = [...values];
  const reads = vi.spyOn(localStorage, 'getItem');
  await mount(true);
  expect(reads).not.toHaveBeenCalled();
  expect(counts()).toEqual(['0', '0', '0']);
  expect(tree.root.findAllByType('time')).toHaveLength(0);
  expect(text(tree.toJSON())).toContain('no lee ni modifica tu historial');
  await act(async () => tree.root.findByProps({ className: 'evolution-section' }).props.onToggle({ currentTarget: { open: true } }));
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'inexistente' } }));
  expect(text(tree.toJSON())).toContain('No hay coincidencias.');
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: '' } }));
  expect(text(tree.toJSON())).toContain('Tus conversaciones aparecerán aquí.');
  expect([...values]).toEqual(before);
});
it('una oportunidad futura no impide seguir aprendiendo ni se convierte en dominio', async () => {
  recordWordRecall(user, previewUnit.words[0], 'quick', new Date('2026-10-25T06:00:00.000Z'));
  await mount();
  const next = text(tree.root.findByProps({ className: 'evolution-next' }));
  expect(next).toContain('Próxima oportunidad sugerida:');
  expect(next).toContain('Puedes seguir aprendiendo antes.');
  expect(next).not.toContain('repasos sugeridos entre');
  expect(counts()).toEqual(['0', '0', '0']);
  expect(tree.root.findByProps({ className: 'primary-action' }).props.disabled).toBeUndefined();
});
it('monta el archivo solo al abrirlo y conserva búsqueda, correcciones e historial al cerrar y volver', async () => {
  const wrong = record({ correct: false, response: 'I playing', feedback: 'Añade AM.' });
  record({ helped: true, parentAttemptId: wrong.id });
  record({ source: 'authored', activityId: 'partner-reply', response: 'Tu mensaje llegó.', responseLanguage: 'es', correct: null, speaker: 'Emma' });
  const before = [...values];
  await mount();
  const toggle = (open: boolean) => tree.root.findByProps({ className: 'evolution-section' }).props.onToggle({ currentTarget: { open } });
  expect(tree.root.findAllByProps({ className: 'history-log' })).toHaveLength(0);
  await act(async () => toggle(true));
  expect(text(tree.toJSON())).toContain('Añade AM.');
  expect(text(tree.toJSON())).toContain('Nuevo intento');
  expect(text(tree.toJSON())).toContain('Tu mensaje llegó.');
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'inexistente' } }));
  await act(async () => toggle(false));
  expect(stopSpeech).toHaveBeenCalled();
  expect(tree.root.findAllByProps({ className: 'history-log' })).toHaveLength(0);
  await act(async () => toggle(true));
  expect(tree.root.findByType('input').props.value).toBe('inexistente');
  expect(text(tree.toJSON())).toContain('No hay coincidencias.');
  await act(async () => tree.root.findByType('input').props.onChange({ target: { value: '' } }));
  expect(text(tree.toJSON())).toContain('Añade AM.');
  expect([...values]).toEqual(before);
});
