import { afterEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import keys from '../content/keys-mission.json';
import examples from '../content/review-examples.json';
import { validateUnit } from './domain/unit';
import { grammarTricks } from './domain/journeyTricks';
import { KeysSituationExperience } from './components/KeysSituationExperience';
import { LanguageGame } from './LanguageGame';
import { initialGame } from './domain/game';
import { readGameCheckpoint, writeGameCheckpoint } from './domain/gameCheckpoint';
import { readLearningActivities, recordLearningActivity } from './domain/learningActivity';
import { keysSituationId, prepareKeysSituation } from './domain/keysSituation';
import { recordSentenceExposure, recordSentenceRecall, recordWordRecall, sentenceKey } from './domain/memory';
import { ConversationPractice } from './components/ConversationPractice';
import { initializeJournal, readJournal } from './domain/progressJournal';
import { completeLearningMode } from './domain/learningModes';
import { JourneyTrickExperience } from './components/JourneyTrickExperience';
import { GrammarCoach } from './components/GrammarCoach';
import { StoryJourney } from './components/StoryJourney';
import { freshZeroJourney, zeroJourney, zeroSteps } from './domain/zeroJourney';
import { readTrickCheckpoint, writeTrickCheckpoint } from './domain/trickCheckpoint';
const unit = validateUnit(keys);
const source = vi.hoisted(() => ({ load: null as null | (() => Promise<unknown>), followup: null as null | ReturnType<typeof validateUnit>, extra: [] as ReturnType<typeof validateUnit>[] }));
vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn(), prefetchSpeech: vi.fn() }));
vi.mock('./services/progressSync', async (original) => ({ ...await original<typeof import('./services/progressSync')>(), startProgressSync: (_id: string, report: (status: string) => void) => { report('saved'); return { stop() {} }; } }));
vi.mock('./services/directus', async (original) => ({ ...await original<typeof import('./services/directus')>(), hasSession: () => true, loadIdentity: async () => ({ id: 'situation-app-isolated', isAdmin: false }), loadPublishedUnitSummaries: async () => [unit, ...source.extra, ...(source.followup ? [source.followup] : [])].map((item) => ({ ...item, hasDialogue: true, grammarTricks: grammarTricks(item) })), loadUnit: async (id: string) => source.load ? source.load() : source.followup?.id === id ? source.followup : source.extra.find((item) => item.id === id) ?? unit, loadKeysPilot: async () => null, loadMirrorPilot: async () => null, loadAsset: async () => '' }));
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const click = async (label: string) => { await act(async () => tree.root.findAllByType('button').find((node) => text(node).trim().startsWith(label))!.props.onClick()); };
async function mount(seed?: () => void, legacy = true) {
  const values = new Map<string, string>();
  const local = { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal('localStorage', local);
  const session = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: local, location: { search: '' }, setTimeout, clearTimeout, setInterval, clearInterval, matchMedia: () => ({ matches: true }), getSelection: () => null }));
  vi.stubGlobal('document', { documentElement: { dataset: {}, style: {} } });
  writeGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!, { ...initialGame, phase: 'build', filledSlots: 1 });
  local.setItem('memora-v2.resume.situation-app-isolated', unit.id);
  local.setItem('memora-v2.resume-mode.situation-app-isolated', 'adventure');
  initializeJournal('situation-app-isolated');
  seed?.();
  const App = (await import('./App')).default;
  await act(async () => { tree = create(<App />); });
  if (legacy) await act(async () => tree.root.findByType(StoryJourney).props.onExit());
}
afterEach(() => { if (tree) act(() => tree.unmount()); source.load = null; source.followup = null; source.extra = []; vi.unstubAllGlobals(); });
it('el nuevo comienzo es la entrada principal; salir conserva la actividad anterior y puede retomarse Play', async () => {
  await mount(undefined, false);
  expect(text(tree.toJSON())).toContain('Tu café acaba de escapar.');
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
  expect(readLearningActivities('situation-app-isolated')).toEqual([]);
  await act(async () => tree.root.findByType(StoryJourney).props.onExit());
  await click('Memora Play · recorrido nuevo');
  expect(text(tree.toJSON())).toContain('Tu café acaba de escapar.');
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
});
it('salir de las historias conserva acceso al recorrido sin abrir una misión por sorpresa', async () => {
  source.followup = validateUnit(examples[0]);
  await mount(undefined, false);
  await act(async () => tree.root.findByType(StoryJourney).props.onExit());
  expect(tree.root.findAllByType(LanguageGame)).toHaveLength(0);
  expect(readLearningActivities('situation-app-isolated')).toEqual([]);
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
});
it('un checkpoint histórico no impide descubrir las nuevas historias ni se sobrescribe', async () => {
  await mount(() => writeTrickCheckpoint('situation-app-isolated', zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: 10, checkId: 'handoff' }), false);
  expect(text(tree.toJSON())).toContain('Tu café acaba de escapar.');
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
  await act(async () => tree.root.findByType(StoryJourney).props.onExit()); await click('Memora Play · recorrido nuevo');
  expect(text(tree.toJSON())).toContain('Tu café acaba de escapar.');
  expect(readTrickCheckpoint('situation-app-isolated', zeroJourney.id, zeroJourney.version)?.checkId).toBe('handoff');
  expect(readLearningActivities('situation-app-isolated')).toEqual([]);
});
it('reabrir las historias no resetea ni reinterpreta la finalización antigua', async () => {
  await mount(() => writeTrickCheckpoint('situation-app-isolated', zeroJourney.id, zeroJourney.version, { ...freshZeroJourney(), stage: zeroSteps.indexOf('complete'), checkId: 'complete' }), false);
  await act(async () => tree.root.findByType(StoryJourney).props.onExit());
  await click('Memora Play · recorrido nuevo');
  expect(text(tree.toJSON())).toContain('Tu café acaba de escapar.');
  expect(readTrickCheckpoint('situation-app-isolated', zeroJourney.id, zeroJourney.version)?.checkId).toBe('complete');
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
  expect(readLearningActivities('situation-app-isolated').filter((event) => event.correct !== null)).toEqual([]);
});
it('Nora prepara las palabras del ordenador y enlaza al coach contextual con Detective, sin enseñar piezas desconocidas', async () => {
  source.followup = validateUnit(examples[0]);
  await mount();
  await click('Entrar en la historia');
  await act(async () => tree.root.findByType(KeysSituationExperience).props.onNext());
  expect(tree.root.findByType(LanguageGame).props.unit.id).toBe('m1-test-desk');
  expect(tree.root.findByType(LanguageGame).props.learningMode).toBe('vocabulary');
  expect(localStorage.getItem('memora-v2.resume.situation-app-isolated')).toBe('m1-test-desk');
  expect(readLearningActivities('situation-app-isolated').filter((event) => event.source === 'learner')).toEqual([]);
  await click('← Recorrido');
  expect(text(tree.root.findByProps({ className: 'home-now' }))).not.toContain('Nora espera. Tus llaves no aparecen.');
  await click('Continuar jugando');
  expect(tree.root.findByType(LanguageGame).props.unit.id).toBe('m1-test-desk');
  expect(tree.root.findByType(LanguageGame).props.learningMode).toBe('vocabulary');
  // Routing contract after the real preparation functions; the complete lexical
  // and coach interactions have their own component tests with isolated data.
  recordLearningActivity('situation-app-isolated', { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion!, activityId: `${keysSituationId}:completed:test-run`, skill: 'looking-for', phase: 'completion', source: 'learner', modality: 'choice', prompt: 'Historia practicada', response: 'Terminado', expected: '', correct: null, helped: false });
  for (const word of source.followup.words) recordWordRecall('situation-app-isolated', word, 'hesitant');
  completeLearningMode('situation-app-isolated', source.followup, 'vocabulary', { correct: 3, attempted: 3, completedAt: new Date().toISOString(), nextReviewAt: new Date(Date.now() + 3600000).toISOString() });
  await act(async () => tree.root.findByType(LanguageGame).props.onFinished());
  await act(async () => tree.root.findByType(LanguageGame).props.onNext());
  expect(tree.root.findByType(JourneyTrickExperience).props.unit.id).toBe('m1-test-desk');
  expect(tree.root.findByType(GrammarCoach).props.lesson.checks.some((check: { id: string }) => check.id === 'computer-repair-am-v1')).toBe(true);
});
it('la portada abre la historia nueva sin resetear el montaje anterior ni inventar aprendizaje', async () => {
  await mount();
  expect(text(tree.toJSON())).toContain('Nora espera. Tus llaves no aparecen.');
  await click('Entrar en la historia');
  expect(tree.root.findByType(KeysSituationExperience).props.unit.id).toBe(unit.id);
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
  expect(readLearningActivities('situation-app-isolated').filter((event) => event.source === 'learner')).toEqual([]);
  await click('← Recorrido');
  await click('Retomar mi actividad anterior');
  expect(tree.root.findByType(LanguageGame).props.unit.id).toBe(unit.id);
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
});
it('el reinicio confirmado desde Perfil vuelve al inicio sin reabrir el checkpoint antiguo', async () => {
  await mount(() => {
    recordLearningActivity('situation-app-isolated', { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion!, activityId: `${keysSituationId}:completed:old`, skill: 'old', phase: 'completion', source: 'learner', modality: 'choice', prompt: 'Historia anterior', response: 'Practicada', expected: '', correct: null, helped: false, at: '2026-10-26T00:00:00Z' });
  });
  expect(readLearningActivities('situation-app-isolated')).toHaveLength(1);
  await import('./components/ProfileView');
  await click('Perfil y ajustes');
  await click('Reiniciar mi progreso');
  expect(readLearningActivities('situation-app-isolated')).toHaveLength(1);
  await click('Sí, empezar de cero');
  expect(text(tree.toJSON())).toContain('Has vuelto al inicio. Guardando tu progreso');
  expect(text(tree.toJSON())).toContain('Nora espera. Tus llaves no aparecen.');
  expect(text(tree.toJSON())).toContain('Entrar en la historia');
  expect(readLearningActivities('situation-app-isolated')).toEqual([]);
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toBeNull();
  expect(localStorage.getItem('memora-v2.resume.situation-app-isolated')).toBeNull();
  expect(readJournal('situation-app-isolated')!.events).toHaveLength(2);
});
it('cancelar una carga no abre después una historia tardía ni cambia la posición antigua', async () => {
  await mount();
  let resolve!: (value: unknown) => void;
  source.load = () => new Promise((done) => { resolve = done; });
  await click('Entrar en la historia');
  await click('Volver sin esperar');
  await act(async () => resolve(unit));
  expect(tree.root.findAllByType(KeysSituationExperience)).toHaveLength(0);
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
});
it('cuando corresponde el repaso real, la portada abre recuperación sin repetir la presentación', async () => {
  await mount(() => {
    recordLearningActivity('situation-app-isolated', { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion!, activityId: `${keysSituationId}:completed:earlier`, skill: 'test', phase: 'completion', source: 'learner', modality: 'choice', prompt: '', response: '', expected: '', correct: null, helped: false });
    recordSentenceExposure('situation-app-isolated', unit.id, prepareKeysSituation(unit)!.phone, new Date(Date.now() - 3600001));
  });
  expect(text(tree.toJSON())).toContain('Nora vuelve a necesitarte.');
  await click('Recuperar la historia');
  expect(tree.root.findByType(KeysSituationExperience).props.recallOnly).toBe(true);
  expect(tree.root.findAllByType(ConversationPractice)).toHaveLength(1);
  expect(readGameCheckpoint('situation-app-isolated', unit.id, unit.contentVersion!)).toMatchObject({ phase: 'build', filledSlots: 1 });
  // A partial review stays resumable even after its only due sentence is answered.
  recordSentenceRecall('situation-app-isolated', sentenceKey(unit.id, prepareKeysSituation(unit)!.phone), 'hesitant');
  await click('← Recorrido');
  await click('Seguir mi historia');
  expect(tree.root.findAllByType(ConversationPractice)).toHaveLength(1);
});
