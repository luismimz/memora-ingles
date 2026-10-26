import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GrammarReminder } from './GrammarReminder';
import { GrammarCoach } from './GrammarCoach';
import { GameCard } from './GameCard';
import { piece, type GrammarLessonData } from '../domain/grammarLesson';

vi.mock('../services/audio', () => ({ playEnglish: vi.fn(), playSpanish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn() }));
const lesson: GrammarLessonData = {
  id: 'isolated-authored-reminder', title: 'Modelo de prueba', language: 'en',
  steps: [
    { caption: 'Primera pieza enseñada.', es: [piece('yo')], en: [piece('I')] },
    { caption: 'Las piezas juntas.', es: [piece('yo estoy')], en: [piece('I am')] },
  ],
  checks: [{ id: 'pending', kind: 'write', prompt: 'Tarea de prueba', answers: ['I am'], hint: 'Modelo', success: 'Resultado' }],
};
let tree: ReactTestRenderer;
const close = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
beforeEach(() => {
  close.mockClear();
  vi.stubGlobal('window', { setTimeout, clearTimeout, matchMedia: () => ({ matches: true }), getSelection: () => null });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });

it('el recordatorio de una lección authored también enlaza slides y vuelve sin abrir sus ejercicios', async () => {
  await act(async () => { tree = create(<GrammarReminder lesson={lesson} userId="reminder-isolated" unitId="unit" onClose={close} appearance="light" onToggleAppearance={() => {}} />); });
  expect(tree.root.findByType(GameCard).props.vertical).toBe(true);
  expect(text(tree.toJSON())).toContain(lesson.steps[0].caption);
  expect(tree.root.findAllByType('input')).toHaveLength(0);
  await act(async () => tree.root.findByType(GameCard).props.onAdvance());
  expect(text(tree.toJSON())).toContain(lesson.steps[1].caption);
  expect(tree.root.findByType(GameCard).props.advanceLabel).toBe('Volver a mi mensaje');
  expect(close).not.toHaveBeenCalled();
  await act(async () => tree.root.findByType(GameCard).props.onAdvance());
  expect(close).toHaveBeenCalledOnce();
  expect(text(tree.toJSON())).not.toContain('Tarea de prueba');
});

it('no cambia la práctica authored normal ni la habilita como contrato vertical nuevo', async () => {
  await act(async () => { tree = create(<GrammarCoach lesson={lesson} userId="reminder-isolated" unitId="unit" reviewMode puzzle onReady={() => {}} onContinue={close} />); });
  expect(tree.root.findByType(GameCard).props.vertical).toBe(false);
  expect(close).not.toHaveBeenCalled();
});
