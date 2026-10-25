import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LanguageGame } from './LanguageGame';
import { previewUnit } from './preview/previewUnit';
import { initialGame } from './domain/game';
import { readGameCheckpoint, writeGameCheckpoint } from './domain/gameCheckpoint';
import { readLearningActivities } from './domain/learningActivity';
import { initializeJournal } from './domain/progressJournal';
import type { AtomicUnit } from './domain/unit';
import { recalledWordIndex } from './domain/activeRecall';
import { readWordMemories } from './domain/memory';
import { readAttempts, readSessions } from './domain/learningProfile';
import { WordAssembly } from './components/WordAssembly';
import { getPlayableGrammar } from './domain/unit';
import { lessonForForm } from './domain/grammarLesson';
import { recordGrammarAttempt, readGrammarAttempts } from './domain/grammarMemory';
import { playEnglish, playSpanish } from './services/audio';
import { GrammarFallbackLesson } from './components/GrammarFallbackLesson';
import { makeGrammarChecks } from './domain/grammarPractice';
import { GrammarCoach } from './components/GrammarCoach';
import { GameCard } from './components/GameCard';

vi.mock('./services/audio', () => ({ playEnglish: vi.fn(async () => ({ status: 'blocked', source: null })), playSpanish: vi.fn(async () => ({ status: 'blocked', source: null })), prefetchSpeech: vi.fn(), prefetchSpanish: vi.fn(), stopSpeech: vi.fn(), playSnap: vi.fn(), playMiss: vi.fn() }));
vi.mock('./services/directus', () => ({ loadAsset: vi.fn(async () => '') }));
let tree: ReactTestRenderer;
const user = 'vertical-isolated';
const next = vi.fn();
const finished = vi.fn();
const text = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.children ? text(node.children) : '';
const unit: AtomicUnit = { ...previewUnit, activeRecall: false, words: previewUnit.words.map((word, index) => ({ ...word, reconstruction: undefined, ...(index === 1 ? { associationMode: 'cognate' as const } : {}) })) };
const checkpoint = () => readGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1');
async function mount(value = unit, continuous = false) {
  await act(async () => { tree = create(<LanguageGame continuous={continuous} unit={value} userId={user} learningMode="vocabulary" onFinished={finished} onNext={next} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
}
async function swipe(assemble = true) {
  const region = tree.root.findByProps({ role: 'region' });
  const target = { closest: () => null };
  await act(async () => {
    const currentTarget = { scrollTop: 100, scrollHeight: 700, clientHeight: 600 };
    region.props.onTouchStart({ target, currentTarget, touches: [{ clientY: 350 }] });
    region.props.onTouchMove({ target, currentTarget, touches: [{ clientY: 250 }] });
    region.props.onScroll({ currentTarget: { scrollTop: 100, scrollHeight: 700, clientHeight: 600 } });
    vi.advanceTimersByTime(230);
  });
  if (assemble && tree.root.findAllByType(WordAssembly).length) {
    // Play the new guided rehearsal explicitly; gestures never solve its pieces.
    while (tree.root.findAllByProps({ className: 'assembly-bank' }).length) {
      const choices = tree.root.findByProps({ className: 'assembly-bank' }).findAllByType('button').filter((node) => !node.props.disabled).sort((a, b) => Number(a.props['aria-label'].split('pieza ')[1]) - Number(b.props['aria-label'].split('pieza ')[1]));
      await act(async () => choices[0].props.onClick());
    }
    await swipe(false);
  }
}
const button = (label: string) => tree.root.findAllByType('button').find((node) => text(node) === label)!;
beforeEach(() => {
  vi.useFakeTimers(); next.mockClear(); finished.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } });
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {} });
  vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: vi.fn(), matchMedia: () => ({ matches: false }), getSelection: () => null });
  initializeJournal(user);
});
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('una palabra nueva pasa por piezas y no se arma ni se acredita por deslizar', async () => {
  await mount(); await swipe(false);
  expect(tree.root.findAllByType(WordAssembly)).toHaveLength(1);
  expect(checkpoint()).toMatchObject({ phase: 'associate', wordIndex: 0 });
  const before = readLearningActivities(user);
  await swipe(false);
  expect(tree.root.findAllByType(WordAssembly)).toHaveLength(1);
  expect(readLearningActivities(user)).toEqual(before);
});
it('la entrada normal al coach conocido usa slide y no resuelve el orden pendiente al deslizar', async () => {
  writeGameCheckpoint(user, previewUnit.id, previewUnit.contentVersion ?? '1', { ...initialGame, phase: 'grammar' });
  await act(async () => { tree = create(<LanguageGame unit={previewUnit} userId={user} onNext={next} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
  const coach = tree.root.findByType(GrammarCoach);
  expect(coach.props.puzzle).toBe(true); expect(coach.props.repairLimit).toBe(2);
  expect(coach.findByType(GameCard).props.vertical).toBe(true);
  for (let i = 0; i < coach.props.lesson.steps.length; i++) await swipe(false);
  expect(readGameCheckpoint(user, previewUnit.id, previewUnit.contentVersion ?? '1')?.phase).toBe('grammar');
  expect(coach.findByType(GameCard).props.onAdvance).toBeUndefined();
  const before = readLearningActivities(user);
  await swipe(false);
  expect(readLearningActivities(user)).toEqual(before);
  expect(before.filter((row) => row.source === 'learner')).toHaveLength(0);
});
it('una forma sin coach entra en fallback vertical y enlaza al constructor sin cierre ni acierto inventado', async () => {
  // Missing base translation selects the existing compatibility branch; this fixture is never published.
  const value: AtomicUnit = { ...previewUnit, grammar: [previewUnit.grammar[0]], words: previewUnit.words.filter((word) => word.en.toLowerCase() !== previewUnit.grammar[0].englishBase) };
  writeGameCheckpoint(user, value.id, value.contentVersion ?? '1', { ...initialGame, phase: 'grammar' });
  await act(async () => { tree = create(<LanguageGame unit={value} userId={user} onNext={next} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
  expect(tree.root.findByType(GrammarFallbackLesson).props.vertical).toBe(true);
  for (let i = 0; i < 4; i++) await swipe(false);
  const checks = makeGrammarChecks(value.grammar[0]);
  await swipe(false); // Cannot answer an unresolved question with a gesture.
  expect(text(tree.toJSON())).toContain(checks[0].prompt);
  await act(async () => button(checks[0].answer).props.onClick());
  expect(text(tree.toJSON())).toContain('✓ Acertaste');
  await swipe(false); await swipe(false); // Teach the new person before testing.
  await act(async () => button(checks[1].answer).props.onClick());
  await swipe(false);
  expect(tree.root.findAllByType(GrammarFallbackLesson)).toHaveLength(0);
  expect(readGameCheckpoint(user, value.id, value.contentVersion ?? '1')?.phase).toBe('build');
  expect(readLearningActivities(user).filter((row) => row.correct === true)).toHaveLength(0);
});
it('fallback reanuda enseñanza, reparación y resultado en su sitio sin nuevos intentos ni autoplay', async () => {
  const value: AtomicUnit = { ...previewUnit, grammar: [previewUnit.grammar[0]], words: previewUnit.words.filter((word) => word.en.toLowerCase() !== previewUnit.grammar[0].englishBase) };
  const open = async () => { await act(async () => { tree = create(<LanguageGame unit={value} userId={user} onNext={next} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); }); };
  const saved = () => readGameCheckpoint(user, value.id, value.contentVersion ?? '1');
  writeGameCheckpoint(user, value.id, value.contentVersion ?? '1', { ...initialGame, phase: 'grammar' });
  await open(); await swipe(false); await swipe(false);
  expect(saved()?.fallbackLesson?.step).toBe(2);
  act(() => tree.unmount()); vi.mocked(playEnglish).mockClear(); await open();
  expect(saved()?.fallbackLesson?.step).toBe(2); expect(playEnglish).not.toHaveBeenCalled();
  await swipe(false); await swipe(false);
  const check = makeGrammarChecks(value.grammar[0])[0];
  await act(async () => button(check.choices.find((choice) => choice !== check.answer)!).props.onClick());
  expect(saved()?.fallbackLesson?.failures).toBe(1);
  const before = readLearningActivities(user);
  act(() => tree.unmount()); await open();
  expect(text(tree.toJSON())).toContain(check.hint);
  await act(async () => button(check.answer).props.onClick());
  expect(saved()?.fallbackLesson?.outcome).toBe('correct');
  act(() => tree.unmount()); vi.mocked(playEnglish).mockClear(); await open();
  expect(text(tree.toJSON())).toContain('✓ Acertaste'); expect(playEnglish).not.toHaveBeenCalled();
  expect(readLearningActivities(user)).toEqual(before);
  await swipe(false); await swipe(false);
  const last = makeGrammarChecks(value.grammar[0])[1];
  await act(async () => button(last.answer).props.onClick()); await swipe(false);
  expect(saved()?.phase).toBe('build'); expect(saved()?.fallbackLesson).toBeUndefined();
});
it('salir y volver conserva montaje parcial y modelo usado sin repetir historia ni fabricar intento', async () => {
  await mount(); await swipe(false);
  const assembly = tree.root.findByType(WordAssembly);
  const choices = assembly.findByProps({ className: 'assembly-bank' }).findAllByType('button');
  await act(async () => choices.find((node) => node.props['aria-label'].endsWith('pieza 1'))!.props.onClick());
  await act(async () => assembly.findByType('details').props.onToggle({ currentTarget: { open: true } }));
  expect(checkpoint()?.wordAssembly).toMatchObject({ selected: [0], modelUsed: true });
  const before = readLearningActivities(user);
  act(() => tree.unmount()); vi.mocked(playEnglish).mockClear(); vi.mocked(playSpanish).mockClear();
  await mount();
  const restored = tree.root.findByType(WordAssembly);
  expect(restored.findAllByProps({ className: 'is-filled' })).toHaveLength(1);
  expect(playEnglish).not.toHaveBeenCalled(); expect(playSpanish).not.toHaveBeenCalled();
  expect(readLearningActivities(user)).toEqual(before);
  await swipe();
  expect(checkpoint()?.wordIndex).toBe(1);
  expect(checkpoint()?.wordAssembly).toBeUndefined();
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});
it('reanudar un montaje completo no reproduce audio ni vuelve a pedir piezas', async () => {
  await mount(); await swipe(false);
  while (tree.root.findAllByProps({ className: 'assembly-bank' }).length) {
    const available = tree.root.findByProps({ className: 'assembly-bank' }).findAllByType('button').filter((node) => !node.props.disabled).sort((a, b) => Number(a.props['aria-label'].split('pieza ')[1]) - Number(b.props['aria-label'].split('pieza ')[1]));
    await act(async () => available[0].props.onClick());
  }
  act(() => tree.unmount()); vi.mocked(playEnglish).mockClear(); await mount();
  expect(tree.root.findByType(WordAssembly)).toBeTruthy();
  expect(tree.root.findAllByProps({ className: 'assembly-bank' })).toHaveLength(0);
  expect(playEnglish).not.toHaveBeenCalled();
  await swipe(false);
  expect(checkpoint()?.wordIndex).toBe(1);
  expect(checkpoint()?.wordAssembly).toBeUndefined();
});
it('reutilizar una estructura mantiene slide y deja repetir la explicación sin fabricar aciertos', async () => {
  const reviewUnit: AtomicUnit = { ...previewUnit, grammarRole: 'review' };
  const form = getPlayableGrammar(reviewUnit)[0];
  const base = reviewUnit.words.find((word) => word.en.toLowerCase() === form.englishBase?.toLowerCase())?.es.toLowerCase();
  const lesson = lessonForForm(form, base)!;
  expect(lesson).toBeTruthy();
  recordGrammarAttempt(user, { unitId: 'earlier-unit', skill: lesson.id, check: 'isolated', kind: 'choose', correct: true, helped: false, at: new Date().toISOString() });
  writeGameCheckpoint(user, reviewUnit.id, reviewUnit.contentVersion ?? '1', { ...initialGame, phase: 'grammar' });
  await act(async () => { tree = create(<LanguageGame unit={reviewUnit} userId={user} onNext={next} onExit={() => {}} appearance="light" onToggleAppearance={() => {}} />); });
  expect(text(tree.toJSON())).toContain('Una estructura conocida');
  expect(button('Volver a ver el truco')).toBeTruthy();
  expect(button('Usarlo ahora →')).toBeUndefined();
  expect(tree.root.findByType('footer').findByType('button').props['aria-label']).toBe('Montar el mensaje');
  const before = readGrammarAttempts(user);
  await swipe(false);
  expect(readGameCheckpoint(user, reviewUnit.id, reviewUnit.contentVersion ?? '1')?.phase).toBe('build');
  expect(readGrammarAttempts(user)).toEqual(before);
  expect(readLearningActivities(user).filter((event) => event.correct === true)).toHaveLength(0);
});
it('la asociación centra palabra, escena e historia, sin barras, ubicación, leyendas ni escena duplicadas', async () => {
  await mount();
  expect(tree.root.findAllByProps({ className: 'association-word-top' })).toHaveLength(1);
  expect(tree.root.findAllByProps({ className: 'scene-copy' })).toHaveLength(1);
  for (const className of ['play-step-position', 'play-location-label', 'association-location', 'association-instruction', 'card-vertical-memory']) expect(tree.root.findAllByProps({ className })).toHaveLength(0);
  expect(tree.root.findByType('footer').findAllByType('small')).toHaveLength(0);
  expect(tree.root.findAllByType('summary').map(text)).toContain('Ayuda');
  await swipe(false);
  const assembly = tree.root.findByType(WordAssembly);
  expect(assembly.findByType('details').props.open).toBeUndefined();
  expect(assembly.findByProps({ className: 'assembly-model' }).parent!.type).toBe('details');
  expect(assembly.findAllByProps({ 'aria-label': 'Recuerda la imagen aprendida' })).toHaveLength(1);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});
it('el recorrido continuo enlaza tras guardar la tanda sin otra pantalla de listo ni segunda confirmación', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall', recallIndex: unit.words.length - 1, recallAnswered: true, recallOutcome: 'correct', correct: 2 });
  await mount(unit, true);
  expect(next).not.toHaveBeenCalled();
  await swipe(false);
  expect(finished).toHaveBeenCalledOnce();
  expect(next).toHaveBeenCalledOnce();
  expect(text(tree.toJSON())).not.toContain('Palabras listas para practicar.');
  expect(readLearningActivities(user).filter((row) => row.activityId === 'vocabulary-completed')).toHaveLength(1);
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(finished).toHaveBeenCalledOnce(); expect(next).toHaveBeenCalledOnce();
});
it('el mismo gesto recorre asociaciones y cognado, pero nunca responde una pregunta pendiente', async () => {
  await mount();
  for (let index = 0; index < unit.words.length; index++) {
    expect(checkpoint()).toMatchObject({ phase: 'associate', wordIndex: index });
    expect(tree.root.findAllByProps({ className: 'card-advance' })).toHaveLength(0);
    await swipe();
  }
  expect(checkpoint()).toMatchObject({ phase: 'recall', recallAnswered: false });
  await swipe();
  expect(checkpoint()).toMatchObject({ phase: 'recall', recallIndex: 0, recallAnswered: false });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});
it('el recuerdo escrito ofrece salida visible, reanuda su modelo y termina la tanda sin fabricar acierto', async () => {
  const active = { ...unit, activeRecall: true };
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall', recallIndex: unit.words.length - 1 });
  await mount(active);
  const skip = button('Ver palabra y pasar');
  expect(skip).toBeTruthy();
  expect(tree.root.findByProps({ className: 'memory-help' }).findAllByType('button')).not.toContain(skip);
  await act(async () => { vi.advanceTimersByTime(15_000); skip.props.onClick(); });
  const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(attempts).toMatchObject([{ correct: null, helped: true, responseDelayMs: 15_000 }]);
  expect(readWordMemories(user)).toHaveLength(0);
  expect(tree.root.findByProps({ 'aria-label': 'Ver resultado de la tanda' })).toBeTruthy();
  act(() => tree.unmount()); await mount(active);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(attempts);
  await act(async () => { tree.root.findByProps({ 'aria-label': 'Ver resultado de la tanda' }).props.onClick(); vi.advanceTimersByTime(230); });
  expect(text(tree.toJSON())).toMatch(/Respuestas registradas:\s*0/);
  expect(text(tree.toJSON())).toMatch(/modelos consultados:\s*1/);
  expect(readSessions(user)).toMatchObject([{ correct: 0, attempted: 0 }]);
  expect(readWordMemories(user)).toHaveLength(0);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner' && row.phase !== 'completion')).toEqual(attempts);
  expect(readLearningActivities(user).filter((row) => row.phase === 'completion')).toMatchObject([{ correct: null }]);
});

it('el error permanece al leer y recargar; continuar no borra el fallo ni crea otro intento', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall' });
  await mount();
  const choices = tree.root.findByProps({ className: 'recall-choices' }).findAllByType('button');
  const wrong = choices.find((choice) => text(choice) !== unit.words[recalledWordIndex(unit, 0)].en)!;
  await act(async () => { wrong.props.onClick(); });
  const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(attempts).toHaveLength(1); expect(attempts[0].correct).toBe(false);
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()).toMatchObject({ recallIndex: 0, recallOutcome: 'wrong', recallAnswered: true });
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('Vuelve a la escena');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, recallAnswered: false, correct: 0 });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(attempts);
});

it('el resultado legacy sin desenlace muestra el modelo, no reinventa un acierto y espera al alumno', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall', recallAnswered: true, correct: 1 });
  await mount();
  expect(text(tree.toJSON())).toContain('Vuelve a la escena');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, correct: 1 });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});

it('el acierto espera el gesto, cierre guarda una vez y el siguiente gesto enlaza sin CTA duplicado', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall', recallIndex: unit.words.length - 1, recallAnswered: true, recallOutcome: 'correct', correct: 2 });
  await mount();
  expect(text(tree.toJSON())).toContain('Acertaste');
  expect(text(tree.toJSON())).not.toContain('¿Cómo se dice');
  await act(async () => { vi.advanceTimersByTime(1100); });
  expect(finished).not.toHaveBeenCalled();
  expect(checkpoint()?.recallAnswered).toBe(true);
  await swipe();
  expect(finished).toHaveBeenCalledOnce(); expect(next).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ className: 'primary-action' })).toHaveLength(0);
  expect(readLearningActivities(user).filter((row) => row.activityId === 'vocabulary-completed')).toHaveLength(1);
  await swipe();
  expect(next).toHaveBeenCalledOnce(); expect(finished).toHaveBeenCalledOnce();
});

it('la historia pasa directamente a armar sin añadir otra pregunta de reconstrucción', async () => {
  const value: AtomicUnit = { ...unit, words: [{ ...unit.words[0], reconstruction: { prompt: 'Reconstruye esta escena', choices: ['La playa', 'El bosque'], answer: 'La playa', cue: 'Imagina la playa' } }, ...unit.words.slice(1)] };
  await mount(value); await swipe(false);
  expect(text(tree.toJSON())).not.toContain('Reconstruye esta escena');
  expect(tree.root.findAllByType(WordAssembly)).toHaveLength(1);
  await swipe(false); expect(checkpoint()?.wordIndex).toBe(0);
  await swipe(); expect(checkpoint()?.wordIndex).toBe(1);
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});

it('el recuerdo sin ayudas no admite scroll como respuesta y conserva el intento al reanudar su resultado', async () => {
  const value = { ...unit, activeRecall: true };
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, phase: 'recall' });
  await mount(value); await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 0, recallAnswered: false });
  const answer = value.words[recalledWordIndex(value, 0)].en;
  await act(async () => { tree.root.findByType('input').props.onChange({ target: { value: answer } }); });
  await act(async () => { tree.root.findByType('form').props.onSubmit({ preventDefault: () => {} }); });
  const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(attempts).toHaveLength(1); expect(attempts[0]).toMatchObject({ correct: true, helped: false });
  act(() => tree.unmount()); await mount(value);
  expect(text(tree.toJSON())).toContain('¡Te has acordado sin pistas!');
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, correct: 1 });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(attempts);
});

const sceneButtons = () => tree.root.findAllByType('button').filter((node) => node.props['data-drop-choice']);

it('tanda nueva enseña primero y conecta inglés con dos escenas conocidas sin responder al desplazar', async () => {
  await mount();
  expect(checkpoint()?.recognitionStyle).toBe('scene-delivery-v1');
  for (const _word of unit.words) await swipe();
  expect(text(tree.toJSON())).toContain('¿A qué escena va?');
  const targets = sceneButtons();
  expect(targets).toHaveLength(2);
  expect(targets.map((node) => node.props['data-drop-choice'])).toContain(unit.words[0].en);
  for (const node of targets) {
    const word = unit.words.find((item) => item.en === node.props['data-drop-choice'])!;
    expect(text(node)).toContain(word.es);
  }
  await swipe();
  expect(checkpoint()).toMatchObject({ phase: 'recall', recallIndex: 0, recallAnswered: false });
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toHaveLength(0);
});

it.each([true, false])('entrega nueva acierto=%s espera, reanuda elección y registra exactamente un reconocimiento ayudado', async (correct) => {
  await mount();
  for (const _word of unit.words) await swipe();
  const before = sceneButtons().map((node) => node.props['data-drop-choice']);
  expect(before).toHaveLength(2);
  const choice = sceneButtons().find((node) => (node.props['data-drop-choice'] === unit.words[0].en) === correct)!;
  const response = choice.props['data-drop-choice'];
  await act(async () => { choice.props.onClick(); choice.props.onClick(); });
  const attempts = readLearningActivities(user).filter((row) => row.source === 'learner');
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({ activityId: `word-scene-v1:${unit.words[0].en}`, prompt: unit.words[0].en, response: unit.words.find((word) => word.en === response)!.es, expected: unit.words[0].es, correct, helped: true, modality: 'choice' });
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()).toMatchObject({ recallIndex: 0, recallAnswered: true, recallChoice: response });
  act(() => tree.unmount()); await mount();
  expect(sceneButtons()).toHaveLength(0);
  expect(text(tree.toJSON())).not.toContain('¿A qué escena va?');
  expect(text(tree.toJSON())).not.toContain('Lleva este mensaje');
  expect(text(tree.toJSON())).toContain(correct ? '✓ Conectada' : 'Esta es la conexión');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, recallAnswered: false, correct: Number(correct) });
  expect(checkpoint()?.recallChoice).toBeUndefined();
  expect(readLearningActivities(user).filter((row) => row.source === 'learner')).toEqual(attempts);
});

it('la tanda anterior conserva sus opciones escritas aunque estuviese todavía en la enseñanza', async () => {
  writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...initialGame, wordIndex: unit.words.length - 1 });
  await mount(); await swipe();
  expect(checkpoint()?.recognitionStyle).toBeUndefined();
  expect(tree.root.findAllByProps({ className: 'recall-choices' })).toHaveLength(1);
  expect(sceneButtons()).toHaveLength(0);
});

it('sin dos significados distintos no inventa una escena ni un distractor externo', async () => {
  const single: AtomicUnit = { ...unit, words: [unit.words[0]] };
  await mount(single); await swipe();
  expect(sceneButtons()).toHaveLength(0);
  expect(tree.root.findByProps({ className: 'recall-choices' }).findAllByType('button')).toHaveLength(1);
});

it('consultar la conexión antes de responder no inventa fallo, acierto ni memoria y se reanuda sin duplicarse', async () => {
  await mount();
  for (const _word of unit.words) await swipe();
  const before = readWordMemories(user);
  const model = button('No me sale: ver la conexión');
  await act(async () => { model.props.onClick(); model.props.onClick(); });
  const records = readLearningActivities(user);
  expect(records.filter((row) => row.source === 'learner')).toHaveLength(0);
  expect(records.filter((row) => row.activityId === `word-scene-model-v1:${unit.words[0].en}`)).toHaveLength(1);
  expect(records.find((row) => row.activityId.startsWith('word-scene-model-v1:'))).toMatchObject({ source: 'authored', correct: null, helped: true, expected: '' });
  expect(readWordMemories(user)).toEqual(before);
  expect(checkpoint()).toMatchObject({ recallAnswered: true, recallOutcome: 'modeled', correct: 0 });
  act(() => tree.unmount()); await mount();
  expect(text(tree.toJSON())).toContain('Conexión con modelo');
  expect(text(tree.toJSON())).not.toContain('¿A qué escena va?');
  expect(sceneButtons()).toHaveLength(0);
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(checkpoint()?.recallIndex).toBe(0);
  await swipe();
  expect(checkpoint()).toMatchObject({ recallIndex: 1, recallAnswered: false, correct: 0 });
  expect(readLearningActivities(user)).toEqual(records);
  expect(readWordMemories(user)).toEqual(before);
});

it('el cierre excluye también las consultas de modelo del denominador de intentos de sesión', async () => {
  await mount();
  for (const _word of unit.words) await swipe();
  for (let index = 0; index < unit.words.length; index++) {
    await act(async () => button('No me sale: ver la conexión').props.onClick());
    if (index === 0) {
      const saved = checkpoint()!;
      // Simulate the briefly served model checkpoint before the session counter.
      writeGameCheckpoint(user, `${unit.id}:vocabulary`, unit.contentVersion ?? '1', { ...saved, recognitionModels: undefined });
      act(() => tree.unmount()); await mount();
    }
    expect(checkpoint()?.recognitionModels).toBe(index + 1);
    await swipe();
  }
  expect(readSessions(user)).toHaveLength(1);
  expect(readSessions(user)[0]).toMatchObject({ correct: 0, attempted: 0 });
  expect(readAttempts(user)).toHaveLength(0);
  expect(readWordMemories(user)).toHaveLength(0);
  expect(finished).toHaveBeenCalledOnce();
});
