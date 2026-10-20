import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewUnit } from './preview/previewUnit';
import { grammarTricks } from './domain/journeyTricks';
import { recordWordRecall, readWordMemories } from './domain/memory';
import { grammarJourney } from './domain/grammarJourney';
import { lessonForForm } from './domain/grammarLesson';
import { recordLearningActivity } from './domain/learningActivity';
import { recordGrammarAttempt } from './domain/grammarMemory';

const hooks = vi.hoisted(() => ({ cursor: 0, states: new Map<number, unknown>() }));
const api = vi.hoisted(() => ({ loadUnit: vi.fn() }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!hooks.states.has(index)) hooks.states.set(index, typeof initial === 'function' ? initial() : initial);
    return [hooks.states.get(index), (value: unknown) => hooks.states.set(index, typeof value === 'function' ? value(hooks.states.get(index)) : value)];
  },
  useEffect: () => undefined,
}));
vi.mock('./useAppearance', () => ({ useAppearance: () => ({ appearance: 'light', toggleAppearance: vi.fn() }) }));
vi.mock('./services/audio', () => ({ stopSpeech: vi.fn(), prefetchSpeech: vi.fn() }));
vi.mock('./services/directus', async (original) => ({ ...await original<typeof import('./services/directus')>(), hasSession: () => true, loadUnit: api.loadUnit }));
vi.mock('./domain/microArcade', async (original) => ({ ...await original<typeof import('./domain/microArcade')>(), shouldOfferMicroArcade: () => false }));

let App: typeof import('./App').default;
const next = { ...previewUnit, id: 'next-pack', title: 'Más asociaciones', kind: 'vocabulary-pack' as const };
const current = { ...previewUnit, id: 'first-pack', kind: 'vocabulary-pack' as const };
let storage: Map<string, string>;
beforeAll(async () => {
  vi.stubGlobal('window', { location: { search: '' }, dispatchEvent: vi.fn() });
  App = (await import('./App')).default;
});
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  hooks.cursor = 0;
  hooks.states.clear();
  // App's top-level state only; children are not mounted or replaced by fake engines.
  for (const [index, value] of [[2, current], [3, 'vocabulary'], [15, [current, next]], [16, 'learner'], [17, true], [27, 'saved']] as const) hooks.states.set(index, value);
  api.loadUnit.mockReset().mockResolvedValue(next);
});
function game() {
  hooks.cursor = 0;
  const root = App() as ReactElement<{ children: ReactElement[] }>;
  return (root.props.children?.[0] ?? root) as ReactElement<Record<string, any>>;
}

describe('continuidad real desde App', () => {
  it('Inicio prepara las palabras de una misión antes de exigir su gramática o conversación', async () => {
    const source = { ...previewUnit, id: 'word-first-story' };
    hooks.states.set(2, null); hooks.states.set(15, [source]); hooks.states.set(22, false);
    api.loadUnit.mockResolvedValue(source);
    game().props.onOpen(source);
    await Promise.resolve(); await Promise.resolve();
    expect(game().props.learningMode).toBe('vocabulary');
    expect(storage.get('memora-v2.resume-mode.learner')).toBe('vocabulary');
    expect(readWordMemories('learner')).toEqual([]);
  });
  it('recalcula el truco con las palabras acertadas DURANTE la misión, no las del render anterior', () => {
    const descriptor = grammarTricks(previewUnit)[0];
    const summaries = [
      { ...current, id: 'pack-one', words: [{ en: 'BRUSH', es: 'cepillar' }], grammarTricks: [{ ...descriptor, sourceId: 'brush-source', vocabulary: ['brush'], skill: 'brush', formId: 'brush' }] },
      { ...current, id: 'pack-two', words: [{ en: 'HOTEL', es: 'hotel' }] },
      { ...current, id: 'pack-three', words: [{ en: 'INFORMATION', es: 'información' }] },
      { ...current, id: 'pack-four', grammarTricks: [{ ...descriptor, sourceId: 'pack-four' }] }, next,
    ];
    hooks.states.set(2, { ...current, id: 'pack-four' }); hooks.states.set(15, summaries);
    const props = game().props;
    recordWordRecall('learner', current.words[0], 'quick');
    props.onFinished();
    expect(storage.get('memora-v2.resume.learner')).toBe(`trick:pack-four:${descriptor.formId}`);
  });
  it('abre Arcade por sorpresa tras cuatro misiones SIN pulsar continuar y luego sigue', async () => {
    for (const word of current.words) recordWordRecall('learner', word, 'quick');
    for (let index = 1; index <= 4; index++) {
      hooks.states.set(2, { ...current, id: `pack-${index}` });
      game().props.onFinished();
    }
    hooks.states.set(15, [{ ...current, id: 'pack-4' }, next]);
    expect(game().props.nextLabel).not.toBe('Ronda Arcade →');
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    hooks.cursor = 0;
    const overlay = (App() as ReactElement<{ children: ReactElement[] }>).props.children[1];
    expect((overlay.props as any).initialMode).toBe('associations');
    expect(hooks.states.get(2)).toMatchObject({ id: 'pack-4' });
    (overlay.props as any).onExit();
    await Promise.resolve(); await Promise.resolve();
    expect(hooks.states.get(2)).toBe(next);
    expect(game().props.nextLabel).not.toBe('Ronda Arcade →');
  });
  it('prepara las palabras reales desde Gramática y entra al truco sin mover Inicio', async () => {
    const source = { ...previewUnit, id: 'grammar-preparation' };
    const stop = grammarJourney([source])[0];
    storage.set('memora-v2.resume.learner', 'home-10');
    hooks.states.set(2, null); hooks.states.set(4, 'grammar'); hooks.states.set(5, [source]); hooks.states.set(15, [source]); hooks.states.set(22, false);
    api.loadUnit.mockResolvedValue(source);
    game().props.onPrepare(stop);
    await Promise.resolve(); await Promise.resolve();
    expect(api.loadUnit).toHaveBeenCalledWith(source.id);
    expect(game().props.learningMode).toBe('vocabulary');
    expect(game().props.positionLabel).toBe('PREPARA EL TRUCO');
    expect(readWordMemories('learner')).toEqual([]);
    for (const en of stop.routeTrick!.vocabulary) recordWordRecall('learner', { ...source.words[0], en }, 'quick');
    const prepared = game().props;
    expect(prepared.nextLabel).toBe('Entrar al truco →');
    prepared.onFinished(); prepared.onNext();
    expect(game().props.stop.id).toBe(stop.id);
    expect(storage.get('memora-v2.resume.learner')).toBe('home-10');
    expect(hooks.states.get(4)).toBe('grammar');
  });
  it('explica una ficha ausente sin fingir aprendizaje ni dejar el botón sin respuesta', () => {
    const source = { ...previewUnit, id: 'grammar-unavailable' };
    const stop = grammarJourney([source])[0];
    hooks.states.set(2, null); hooks.states.set(4, 'grammar'); hooks.states.set(5, [source]); hooks.states.set(15, []); hooks.states.set(22, false);
    game().props.onPrepare(stop);
    expect(game().props.notice).toContain('aún no están disponibles');
    expect(hooks.states.get(2)).toBeNull();
    expect(api.loadUnit).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
  });
  it('intercala Arcade tras un truco y reanuda Gramática sin perder la posición de Inicio', async () => {
    const first = { ...previewUnit, id: 'grammar-first', grammar: [previewUnit.grammar[0]] };
    const second = { ...first, id: 'grammar-next', grammar: [{ ...first.grammar[0], lesson: { ...lessonForForm(first.grammar[0], 'jugar')!, id: 'next-grammar-pattern' } }] };
    const route = grammarJourney([first, second]);
    for (const en of route[0].routeTrick!.vocabulary) recordWordRecall('learner', { ...first.words[0], en }, 'quick');
    storage.set('memora-v2.resume.learner', 'home-10');
    hooks.states.set(2, null); hooks.states.set(4, 'grammar'); hooks.states.set(5, [first, second]); hooks.states.set(22, false);
    game().props.onOpen(route[0]);
    const playing = game().props;
    expect(playing.stop.id).toBe(route[0].id);
    recordLearningActivity('learner', { unitId: first.id, unitTitle: first.title, contentVersion: first.contentVersion ?? '1', activityId: `trick-completed:${route[0].routeTrick!.formId}`, skill: route[0].routeTrick!.skill, phase: 'completion', source: 'learner', modality: 'writing', prompt: '', response: '', expected: '', correct: null, helped: false });
    const lesson = lessonForForm(first.grammar[0], 'jugar')!;
    recordGrammarAttempt('learner', { unitId: first.id, skill: lesson.id, check: lesson.checks[0].id, kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
    playing.onFinished();
    expect(storage.get('memora-v2.grammar-position.learner')).toBe(route[1].id);
    expect(storage.get('memora-v2.resume.learner')).toBe('home-10');
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    hooks.cursor = 0;
    const overlay = (App() as ReactElement<{ children: ReactElement[] }>).props.children[1];
    expect((overlay.props as any).initialMode).toBe('grammar');
    (overlay.props as any).onExit();
    expect(game().props.stop.id).toBe(route[1].id);
    expect(hooks.states.get(4)).toBe('grammar');
    expect(api.loadUnit).not.toHaveBeenCalled();
    game().props.onExit();
    expect(game().props.resumeId).toBe(route[1].id);
    expect(hooks.states.get(4)).toBe('grammar');
  });
  it('encadena la cuarta misión con un truco publicado y conserva su posición separada', async () => {
    const source = { ...previewUnit, id: 'trick-source' };
    const descriptor = grammarTricks(source)[0];
    const fourth = { ...current, id: 'fourth-pack' };
    const summaries = [{ ...source, grammarTricks: [descriptor] }, { ...current, id: 'pack-two' }, { ...current, id: 'pack-three' }, fourth, next];
    for (const en of descriptor.vocabulary) recordWordRecall('learner', { ...source.words[0], en }, 'quick');
    hooks.states.set(2, fourth); hooks.states.set(15, summaries);
    api.loadUnit.mockResolvedValue(source);
    const props = game().props;
    props.onFinished();
    expect(storage.get('memora-v2.resume.learner')).toBe(`trick:${source.id}:${descriptor.formId}`);
    expect(storage.get('memora-v2.resume-mode.learner')).toBe('grammar');
    props.onNext();
    await Promise.resolve(); await Promise.resolve();
    expect(api.loadUnit).toHaveBeenCalledWith(source.id);
    expect(hooks.states.get(2)).toBe(source);
    expect(game().props.stop.routeTrick.skill).toBe(descriptor.skill);
  });
  it('una cuenta admin jugando desde Home guarda como alumno, no como revisión', () => {
    expect(game().props.reviewMode).toBe(false);
    expect(game().props.syncStatus).toBe('saved');
  });
  it('guarda la siguiente parada al completar antes de pulsar continuar o salir', () => {
    game().props.onFinished();
    expect(storage.get('memora-v2.resume.learner')).toBe(next.id);
    expect(storage.get('memora-v2.resume-mode.learner')).toBe('vocabulary');
    expect(hooks.states.get(2)).toBe(current);
  });
  it('continúa del paquete 1 al 2 directamente, sin abrir Home o la biblioteca', async () => {
    const props = game().props;
    expect(props.nextLabel).toBe('Continuar jugando →');
    props.onNext();
    expect(hooks.states.get(22)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(api.loadUnit).toHaveBeenCalledWith(next.id);
    expect(hooks.states.get(2)).toBe(next);
    expect(hooks.states.get(4)).toBeNull();
    expect(hooks.states.get(3)).toBe('vocabulary');
  });
  it('continúa también dentro de Palabras sin volver a elegir un paquete', () => {
    hooks.states.set(4, 'vocabulary'); hooks.states.set(5, [current, next]);
    game().props.onNext();
    expect(hooks.states.get(2)).toBe(next);
    expect(api.loadUnit).not.toHaveBeenCalled();
  });
  it('la revisión editorial explícita sigue sin cambiar la posición del alumno', () => {
    hooks.states.set(18, true);
    const props = game().props;
    expect(props.reviewMode).toBe(true);
    props.onFinished();
    expect(storage.size).toBe(0);
  });
  it('no vuelve al primer paquete cuando no hay más contenido', () => {
    recordLearningActivity('learner', { unitId: current.id, unitTitle: current.title, contentVersion: current.contentVersion ?? '1', activityId: 'vocabulary-completed', skill: 'vocabulary', phase: 'completion', source: 'learner', modality: 'choice', prompt: '', response: 'Palabras practicadas', expected: '', correct: null, helped: false });
    hooks.states.set(2, next);
    const props = game().props;
    expect(props.nextLabel).toBe('Volver al recorrido →');
    props.onNext();
    expect(hooks.states.get(2)).toBeNull();
    expect(api.loadUnit).not.toHaveBeenCalled();
  });
});
