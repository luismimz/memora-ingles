import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewUnit, reviewUnits } from './preview/previewUnit';
import { vocabularyPreviewPacks } from './preview/vocabularyPacks';
import { grammarTricks, trickStop } from './domain/journeyTricks';
import { recordWordRecall, readWordMemories } from './domain/memory';
import { grammarJourney } from './domain/grammarJourney';
import { lessonForForm } from './domain/grammarLesson';
import { recordLearningActivity } from './domain/learningActivity';
import { recordGrammarAttempt } from './domain/grammarMemory';
import { completeArcadeCadence, pendingAutomaticArcade } from './domain/arcadeCadence';
import { completeLearningMode } from './domain/learningModes';
import { completedTrick, isEquivalentUnit, missingTrickWords } from './domain/journeyTricks';
import { completedVocabularyStop } from './domain/journeyMap';
import { readLearningActivities } from './domain/learningActivity';

const hooks = vi.hoisted(() => ({ cursor: 0, states: new Map<number, unknown>(), refCursor: 0, refs: new Map<number, { current: unknown }>() }));
const api = vi.hoisted(() => ({ loadUnit: vi.fn() }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!hooks.states.has(index)) hooks.states.set(index, typeof initial === 'function' ? initial() : initial);
    return [hooks.states.get(index), (value: unknown) => hooks.states.set(index, typeof value === 'function' ? value(hooks.states.get(index)) : value)];
  },
  useEffect: () => undefined,
  useRef: (initial: unknown) => {
    const index = hooks.refCursor++;
    if (!hooks.refs.has(index)) hooks.refs.set(index, { current: initial });
    return hooks.refs.get(index);
  },
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
  hooks.refCursor = 0; hooks.refs.clear();
  // App's top-level state only; children are not mounted or replaced by fake engines.
  for (const [index, value] of [[2, current], [3, 'vocabulary'], [15, [current, next]], [16, 'learner'], [17, true], [27, 'saved']] as const) hooks.states.set(index, value);
  api.loadUnit.mockReset().mockResolvedValue(next);
});
function game() {
  hooks.cursor = 0;
  hooks.refCursor = 0;
  let root = App() as ReactElement<any>;
  // These are compatibility tests for the retained course; explicitly choose it.
  if (root.props.label === 'Memora') {
    root.props.onBack(); hooks.cursor = 0; hooks.refCursor = 0;
    root = App() as ReactElement<any>;
  }
  const hub = root.props.children?.[0] ?? root;
  if (hub.props.onLegacy) {
    hub.props.onLegacy(); hooks.cursor = 0; hooks.refCursor = 0;
    root = App() as ReactElement<any>;
  }
  return (root.props.children?.[0] ?? root) as ReactElement<Record<string, any>>;
}

describe('continuidad real desde App', () => {
  it('Inicio abre la enseñanza completa de una escena aunque la posición anterior fuera vocabulario', async () => {
    const source = { ...previewUnit, hasDialogue: true, grammarTricks: grammarTricks(previewUnit) };
    const saved = JSON.stringify({ phase: 'associate', wordAssembly: { selected: [0] } });
    storage.set(`memora-v2.checkpoint.learner.${source.id}:vocabulary`, saved);
    hooks.states.set(2, null); hooks.states.set(7, source.id); hooks.states.set(8, 'vocabulary'); hooks.states.set(15, [source]); hooks.states.set(22, false);
    api.loadUnit.mockResolvedValue(source);
    await game().props.onStartScene(source);
    expect(game().props.learningMode).toBe('adventure');
    expect(game().props.unit.id).toBe(source.id);
    expect(storage.get(`memora-v2.checkpoint.learner.${source.id}:vocabulary`)).toBe(saved);
    expect(readLearningActivities('learner')).toEqual([]);
  });
  it('una escena que pierde conversación al descargar no promete un recorrido inexistente ni cambia el progreso', async () => {
    const source = { ...previewUnit, hasDialogue: true, grammarTricks: grammarTricks(previewUnit) };
    hooks.states.set(2, null); hooks.states.set(15, [source]); hooks.states.set(22, false);
    api.loadUnit.mockResolvedValue({ ...previewUnit, communication: undefined });
    await game().props.onStartScene(source);
    expect(game().props.error).toContain('ya no contiene el recorrido completo');
    expect(hooks.states.get(2)).toBeNull();
    expect(readLearningActivities('learner')).toEqual([]);
  });
  it('revalida el sentido recién descargado y no abre el truco con metadatos antiguos de Inicio', async () => {
    const source = { ...previewUnit, id: 'changing-source' };
    const descriptor = grammarTricks(source)[0];
    const summary = { ...source, grammarTricks: [descriptor] };
    const stop = trickStop(summary, descriptor);
    recordWordRecall('learner', source.words[0], 'quick');
    const before = readWordMemories('learner');
    const changed = { ...source, words: source.words.map((word, index) => index === 0 ? { ...word, es: 'representar una obra' } : word) };
    api.loadUnit.mockResolvedValue(changed);
    hooks.states.set(2, null); hooks.states.set(15, [summary]); hooks.states.set(22, false);
    await game().props.onOpen(stop);
    expect(api.loadUnit).toHaveBeenCalledWith(source.id);
    expect(game().props.error).toContain('necesita palabras');
    expect(hooks.states.get(2)).toBeNull();
    expect(readWordMemories('learner')).toEqual(before);
    expect(readLearningActivities('learner')).toHaveLength(0);
  });
  it('aplica cada acción preparada entre palabras mezcladas, sin esperar cuatro misiones ni mover Gramática', async () => {
    // Synthetic attempts in an isolated Map, not a learner account or a manual/browser playthrough.
    const hotel = vocabularyPreviewPacks.find((candidate) => candidate.words.some((word) => word.en === 'HOTEL'))!;
    const family = vocabularyPreviewPacks.find((candidate) => candidate.words.some((word) => word.en === 'FAMILY'))!;
    const brush = reviewUnits.find((candidate) => candidate.id === 'm1-bathroom-brush')!;
    const sources = [previewUnit, hotel, brush, family, next];
    expect(sources.every(Boolean)).toBe(true);
    expect(new Set(sources.map((candidate) => candidate.id)).size).toBe(5);
    const summaries = sources.map((source) => ({ ...source, grammarTricks: grammarTricks(source) }));
    hooks.states.set(2, sources[0]); hooks.states.set(15, summaries);
    storage.set('memora-v2.grammar-position.learner', 'independent-grammar-position');
    api.loadUnit.mockImplementation((id: string) => {
      const source = sources.find((candidate) => candidate.id === id);
      return source ? Promise.resolve(source) : Promise.reject(new Error(`Unexpected fixture ID: ${id}`));
    });
    const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
    const overlay = () => { hooks.cursor = 0; hooks.refCursor = 0; return (App() as ReactElement<{ children: ReactElement[] }>).props.children[1]; };
    expect(summaries.map(isEquivalentUnit)).toEqual([false, true, false, true, false]);
    const practiced: string[] = [];
    const finishPreparedTrick = async () => {
      const props = game().props;
      const stop = props.stop;
      expect(missingTrickWords(stop, readWordMemories('learner'))).toEqual([]);
      const descriptor = stop.routeTrick;
      practiced.push(descriptor.sourceId);
      const source = sources.find((candidate) => candidate.id === descriptor.sourceId)!;
      const form = source.grammar.find((candidate) => candidate.id === descriptor.formId)!;
      const lesson = lessonForForm(form, source.words[0].es)!;
      recordGrammarAttempt('learner', { unitId: source.id, skill: lesson.id, check: 'meaning-now-v1', kind: 'explain', correct: true, helped: true, at: new Date().toISOString() });
      recordLearningActivity('learner', { unitId: source.id, unitTitle: source.title, contentVersion: source.contentVersion ?? '1', activityId: `trick-completed:${descriptor.formId}`, skill: descriptor.skill, phase: 'completion', source: 'learner', modality: 'writing', prompt: lesson.title, response: 'Synthetic completion fixture', expected: '', correct: null, helped: false });
      expect(props.continuous).toBe(true);
      props.onFinished(); props.onNext(); await flush();
      const arcade = overlay();
      expect((arcade.props as any).initialMode).toBe('grammar');
      expect(completedTrick(stop, readLearningActivities('learner'))).toBe(true);
      (arcade.props as any).onExit(); await flush();
    };
    for (let index = 0; index < 4; index++) {
      const source = sources[index];
      expect(game().props.unit.id).toBe(source.id);
      // Recognition stays labelled as assisted recognition, not independent recall.
      for (const word of source.words) recordWordRecall('learner', word, 'quick', new Date(), 'recognition', undefined, true);
      completeLearningMode('learner', source, 'vocabulary', { correct: source.words.length, attempted: source.words.length, completedAt: new Date().toISOString(), nextReviewAt: new Date(Date.now() + 60000).toISOString() });
      game().props.onFinished();
      await flush();
      if (index < 3) {
        game().props.onNext(); await flush();
        if (index === 2) {
          // Two vocabulary stops now insert a short eligible surprise, without
          // consuming or losing the prepared trick that follows this pack.
          const arcade = overlay(); expect((arcade.props as any).initialMode).toBe('associations');
          (arcade.props as any).onExit(); await flush();
        }
        if (index === 0 || index === 2) await finishPreparedTrick();
        expect(practiced).toHaveLength(index < 2 ? 1 : 2);
      }
    }
    // The intervening grammar Arcades already provided variety; no forced
    // extra round simply because the old route used four vocabulary episodes.
    expect(overlay()).toBeNull();
    expect(pendingAutomaticArcade('learner')).toBeNull();
    expect(summaries.filter((source) => completedVocabularyStop(source, readLearningActivities('learner')))).toHaveLength(4);
    game().props.onNext(); await flush();
    expect(game().props.unit.id).toBe(next.id);
    expect(game().props.learningMode).toBe('vocabulary');
    expect(practiced).toEqual([previewUnit.id, brush.id]);
    expect(completedTrick(grammarJourney(sources).find((stop) => stop.routeTrick?.sourceId === brush.id)!, readLearningActivities('learner'))).toBe(true);
    expect(storage.get('memora-v2.grammar-position.learner')).toBe('independent-grammar-position');
    expect(readLearningActivities('learner').filter((activity) => activity.activityId === 'vocabulary-completed')).toHaveLength(4);
    expect(pendingAutomaticArcade('learner')).toBeNull();
  });
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
  it('el avance automático del hijo abre Arcade tras guardar cuatro misiones y luego sigue', async () => {
    for (const word of current.words) recordWordRecall('learner', word, 'quick');
    for (let index = 1; index <= 4; index++) {
      hooks.states.set(2, { ...current, id: `pack-${index}` });
      game().props.onFinished();
    }
    hooks.states.set(15, [{ ...current, id: 'pack-4' }, next]);
    expect(game().props.nextLabel).not.toBe('Ronda Arcade →');
    expect(game().props.continuous).toBe(true);
    game().props.onNext();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    hooks.cursor = 0;
    hooks.refCursor = 0;
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
    recordGrammarAttempt('learner', { unitId: first.id, skill: lesson.id, check: 'meaning-now-v1', kind: 'explain', correct: true, helped: false, at: new Date().toISOString() });
    playing.onFinished();
    playing.onNext();
    expect(storage.get('memora-v2.grammar-position.learner')).toBe(route[1].id);
    expect(storage.get('memora-v2.resume.learner')).toBe('home-10');
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    hooks.cursor = 0;
    hooks.refCursor = 0;
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
  it('no consume Arcade al abrirlo ni lanza dos rondas por pulsar continuar durante la carga', async () => {
    for (const word of current.words) recordWordRecall('learner', word, 'quick');
    for (let index = 1; index <= 3; index++) completeArcadeCadence('learner', `previous-${index}`, '1', false);
    const props = game().props;
    props.onFinished();
    props.onNext(); props.onNext();
    expect(pendingAutomaticArcade('learner')).toBe('associations');
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    hooks.cursor = 0; hooks.refCursor = 0;
    const overlay = (App() as ReactElement<{ children: ReactElement[] }>).props.children[1];
    expect((overlay.props as any).initialMode).toBe('associations');
    expect(api.loadUnit).not.toHaveBeenCalled();
    expect(hooks.states.get(2)).toBe(current);
    expect(pendingAutomaticArcade('learner')).toBe('associations');
    (overlay.props as any).onExit();
    expect(pendingAutomaticArcade('learner')).toBeNull();
    (overlay.props as any).onExit(); // stale double activation must not advance twice
    await Promise.resolve(); await Promise.resolve();
    expect(hooks.states.get(2)).toBe(next);
    expect(api.loadUnit).toHaveBeenCalledTimes(1);
  });
  it('retoma Arcade interrumpido sobre la siguiente parada guardada sin saltársela', async () => {
    for (const word of current.words) recordWordRecall('learner', word, 'quick');
    for (let index = 1; index <= 4; index++) completeArcadeCadence('learner', `previous-${index}`, '1', false);
    storage.set('memora-v2.resume.learner', next.id);
    hooks.states.set(2, null); hooks.states.set(22, false);
    game().props.onOpen(next);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    hooks.cursor = 0; hooks.refCursor = 0;
    const overlay = (App() as ReactElement<{ children: ReactElement[] }>).props.children[1];
    expect((overlay.props as any).initialMode).toBe('associations');
    expect(pendingAutomaticArcade('learner')).toBe('associations');
    (overlay.props as any).onExit();
    expect(hooks.states.get(2)).toBe(next);
    expect(api.loadUnit).toHaveBeenCalledTimes(1);
    expect(storage.get('memora-v2.resume.learner')).toBe(next.id);
    expect(pendingAutomaticArcade('learner')).toBeNull();
  });
  it('no inventa un repaso si todavía no hay palabras practicadas ni salta la parada reanudada', async () => {
    for (let index = 1; index <= 4; index++) completeArcadeCadence('learner', `previous-${index}`, '1', false);
    hooks.states.set(2, null); hooks.states.set(22, false);
    game().props.onOpen(next);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(hooks.states.get(2)).toBe(next);
    expect(hooks.states.get(14)).toBeNull();
    expect(readWordMemories('learner')).toEqual([]);
    expect(pendingAutomaticArcade('learner')).toBe('associations');
    expect(api.loadUnit).toHaveBeenCalledTimes(1);
  });
  it('salir mientras se prepara Arcade descarta el resultado tardío y conserva la ronda', async () => {
    for (const word of current.words) recordWordRecall('learner', word, 'quick');
    for (let index = 1; index <= 3; index++) completeArcadeCadence('learner', `previous-${index}`, '1', false);
    const props = game().props;
    props.onFinished(); props.onExit();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(hooks.states.get(2)).toBeNull();
    expect(hooks.states.get(14)).toBeNull();
    expect(pendingAutomaticArcade('learner')).toBe('associations');
  });
  it('una petición antigua de misión no reemplaza la selección más reciente', async () => {
    const first = { ...next, id: 'slow-first' };
    const second = { ...next, id: 'fast-second' };
    let resolveFirst!: (unit: typeof first) => void;
    api.loadUnit.mockImplementation((id: string) => id === first.id ? new Promise((resolve) => { resolveFirst = resolve; }) : Promise.resolve(second));
    hooks.states.set(2, null); hooks.states.set(22, false);
    const props = game().props;
    props.onOpen(first); props.onOpen(second);
    await Promise.resolve(); await Promise.resolve();
    expect(hooks.states.get(2)).toBe(second);
    resolveFirst(first);
    await Promise.resolve(); await Promise.resolve();
    expect(hooks.states.get(2)).toBe(second);
    expect(storage.get('memora-v2.resume.learner')).toBe(second.id);
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
