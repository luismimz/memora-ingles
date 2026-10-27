import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import keys from '../../content/keys-mission.json';
import { previewUnit } from '../preview/previewUnit';
import { validateUnit } from '../domain/unit';
import { grammarTricks } from '../domain/journeyTricks';
import { initialGame } from '../domain/game';
import { writeGameCheckpoint } from '../domain/gameCheckpoint';
import { keysSituationId, prepareKeysSituation, situationCheckpointVersion } from '../domain/keysSituation';
import { recordLearningActivity, readLearningActivities } from '../domain/learningActivity';
import { recordSentenceExposure } from '../domain/memory';
import { writeTrickCheckpoint } from '../domain/trickCheckpoint';
import { JourneyHome } from './JourneyHomeV2';

const nora = validateUnit(keys);
const computer = { ...previewUnit, hasDialogue: true, grammarTricks: grammarTricks(previewUnit) };
const user = 'home-continuity-isolated';
const open = vi.fn(), situation = vi.fn();
let tree: ReactTestRenderer;
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
function mount(resume = computer.id) {
  act(() => { tree = create(<JourneyHome units={[{ ...nora, grammarTricks: grammarTricks(nora) }, computer]} userId={user} resumeUnitId={resume} resumeLearningMode="vocabulary" onOpen={open} onSituation={situation} onConverse={() => {}} onExit={() => {}} onProfile={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
}
function dueStory() {
  recordLearningActivity(user, { unitId: nora.id, unitTitle: nora.title, contentVersion: nora.contentVersion!, activityId: `${keysSituationId}:completed:test`, skill: 'test', phase: 'completion', source: 'learner', modality: 'choice', prompt: '', response: '', expected: '', correct: null, helped: false });
  recordSentenceExposure(user, nora.id, prepareKeysSituation(nora)!.phone, new Date(Date.now() - 7200000));
}
beforeEach(() => {
  vi.clearAllMocks(); const rows = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => rows.set(key, value), removeItem: (key: string) => rows.delete(key) });
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.unstubAllGlobals(); });
it('un repaso de Nora no sustituye una actividad empezada: mismo destino, tarea y escena real', () => {
  dueStory();
  writeGameCheckpoint(user, `${computer.id}:vocabulary`, computer.contentVersion ?? '1', { ...initialGame, phase: 'recall', recallIndex: 1 });
  mount();
  expect(text(tree.root.findByType('h1'))).not.toContain('Nora vuelve');
  expect(text(tree.root.findByProps({ className: 'home-now-place' }))).toBe('Recuerda lo que aprendiste');
  expect(tree.root.findAllByProps({ className: 'home-message-scene' })).toHaveLength(1);
  const before = readLearningActivities(user);
  act(() => tree.root.findByProps({ className: 'primary-action home-continue' }).props.onClick());
  expect(open).toHaveBeenCalledWith(computer); expect(situation).not.toHaveBeenCalled();
  expect(readLearningActivities(user)).toEqual(before);
});
it('la siguiente actividad guardada sin checkpoint tampoco vuelve a imponer la primera historia', () => {
  dueStory(); mount();
  act(() => tree.root.findByProps({ className: 'primary-action home-continue' }).props.onClick());
  expect(open).toHaveBeenCalledWith(computer);
  expect(situation).not.toHaveBeenCalled();
  const optional = tree.root.findAllByType('button').find((node) => text(node) === 'Volver a la historia de Nora')!;
  act(() => optional.props.onClick()); expect(situation).toHaveBeenCalledWith(expect.objectContaining({ id: nora.id }), true);
});
it('una historia no estrenada no secuestra un destino guardado de otra actividad', () => {
  mount();
  act(() => tree.root.findByProps({ className: 'primary-action home-continue' }).props.onClick());
  expect(open).toHaveBeenCalledWith(computer); expect(situation).not.toHaveBeenCalled();
  expect(readLearningActivities(user)).toEqual([]);
});
it('volver expresamente a Nora sí retoma su checkpoint, no lo confunde con la actividad anterior', () => {
  dueStory();
  writeTrickCheckpoint(user, keysSituationId, situationCheckpointVersion(nora.id, nora.contentVersion!), { stage: 11, checkIndex: 0, checkId: 'use', input: '', feedback: 'idle', helped: false, episodeId: 'new-run' });
  mount(nora.id);
  act(() => tree.root.findByProps({ className: 'primary-action home-continue' }).props.onClick());
  expect(situation).toHaveBeenCalledWith(expect.objectContaining({ id: nora.id }), true);
  expect(open).not.toHaveBeenCalled();
});
