import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import data from '../../content/mirror-now.json';
import keys from '../../content/keys-mission.json';
import { evaluateMirrorAnswer, mirrorHint, mirrorText, nextMirrorHint, validateMirrorLesson } from './mirrorLesson';
import { validateUnit } from './unit';
import { conversationTurns } from './conversation';
import { MirrorQuestion, MirrorRow, mirrorSegments } from '../components/MirrorPieces';
import { MirrorWriteTest } from '../components/MirrorWriteTest';
import { initializeJournal, readJournal } from './progressJournal';
import { recordLearningActivity } from './learningActivity';
import { restoreProgress } from './restoreProgress';
import { dueSentenceMemories, recordSentenceExposure } from './memory';
import { makeDeck } from '../components/DailyArcade';
import { EvolutionView } from '../components/EvolutionView';
// @ts-expect-error Directus JavaScript has no TS declaration.
import { validateProgressBatch } from '../../../backend/extensions/memora-ai/dist/core/progress.js';
const unit = validateUnit(data);
const lesson = unit.mirror!;
describe('ficha espejo completa', () => {
  beforeEach(() => {
    const local = new Map<string, string>(); const session = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), key: (index: number) => [...local.keys()][index] ?? null, get length() { return local.size; } });
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
    initializeJournal('learner');
  });
  it('valida una sola novedad y tres acciones con posiciones estables', () => {
    expect(validateMirrorLesson(data.mirror).examples).toHaveLength(3);
    for (const example of lesson.examples) expect(example.english.map((piece) => piece.role)).toEqual(['person', 'auxiliary', 'action']);
  });
  it('rechaza respuestas no revisadas, sufijos de sustantivos y posiciones incoherentes', () => {
    const missing = structuredClone(data.mirror); missing.examples[1].acceptedAnswers = ["I'm eating"];
    expect(() => validateMirrorLesson(missing)).toThrow();
    const wrongEnding = structuredClone(data.mirror); wrongEnding.examples[0].english[0].ending = 'I';
    expect(() => validateMirrorLesson(wrongEnding)).toThrow();
    const shifted = structuredClone(data.mirror); shifted.examples[1].english.reverse();
    expect(() => validateMirrorLesson(shifted)).toThrow();
  });
  it('acepta expansión, contracción y tipografía, pero no omisiones ni otra acción', () => {
    const example = lesson.examples[1];
    for (const answer of ['I am eating', "I'm eating", 'I’m eating.', ' I AM   EATING! ']) expect(evaluateMirrorAnswer(example, answer)).toBe(true);
    for (const answer of ['I eating', 'I eat', 'am eating', 'I am playing', '']) expect(evaluateMirrorAnswer(example, answer)).toBe(false);
  });
  it('la primera pantalla de prueba no contiene la traducción, letra inicial o modelo oculto', () => {
    const html = renderToStaticMarkup(<MirrorWriteTest unit={unit} lesson={lesson} example={lesson.examples[1]} userId="preview" inspection activityId="test" nextLabel="Seguir" onSuccess={() => {}} />);
    expect(html).toContain('Estoy comiendo.');
    expect(html).not.toContain('I am eating'); expect(html).not.toContain("I&#x27;m eating"); expect(html).not.toContain('P___');
  });
  it('da pistas limitadas sin revelar inmediatamente la frase completa', () => {
    expect(nextMirrorHint(0)).toBe(1); expect(nextMirrorHint(3)).toBe(3);
    for (const level of [1, 2, 3]) { const hint = mirrorHint(lesson, 'I eating', level); expect(hint).not.toContain('I am eating'); expect(hint).not.toContain("I'm eating"); }
  });
  it('usa colores semánticos y conserva exactamente el texto escrito', () => {
    const html = renderToStaticMarkup(<MirrorRow pieces={lesson.examples[0].english} label="Inglés" language="en" />);
    expect(html).toContain('mirror-person'); expect(html).toContain('mirror-auxiliary'); expect(html).toContain('mirror-action'); expect(html).toContain('mirror-ending');
    for (const value of ["I'm WORKING.", 'I’m eating', 'COMPUTER', 'I eating']) expect(mirrorSegments(value, lesson, 'en').map((piece) => piece.text).join('')).toBe(value);
    expect(mirrorSegments('COMPUTER', lesson, 'en')).toEqual([{ text: 'COMPUTER' }]);
  });
  it('la pregunta previa al chat colorea las equivalencias en ambos idiomas', () => {
    const html = renderToStaticMarkup(<MirrorQuestion lesson={lesson} />);
    for (const role of ['question', 'auxiliary', 'action']) expect(html.match(new RegExp(`class="mirror-piece mirror-${role}"`, 'g'))).toHaveLength(2);
    expect(html).toContain('mirror-question">¿Qué'); expect(html).toContain('mirror-question">What');
    expect(html).toContain('mirror-auxiliary">estás'); expect(html).toContain('mirror-auxiliary">are');
    expect(html).toContain('mirror-action">haciendo?'); expect(html).toContain('mirror-action">doing?');
  });
  it('reutiliza el chat sin enseñar todavía la construcción de preguntas; conserva el ciclo de llaves', () => {
    expect(conversationTurns(unit)).toHaveLength(1);
    expect(conversationTurns(unit)[0].prompt?.en).toBe('What are you doing?');
    expect(conversationTurns(unit)[0].expected.en).toBe("I'm working.");
    expect(conversationTurns(validateUnit(keys)).map((turn) => turn.id)).toEqual(['respond', 'transfer']);
  });
  it('errores, pistas y reintentos usan el contrato real de Directus y se restauran sin duplicados', () => {
    const common = { unitId: unit.id, unitTitle: unit.title, contentVersion: '1', activityId: 'mirror-test', skill: lesson.id, phase: 'grammar' as const, source: 'learner' as const, modality: 'writing' as const, prompt: lesson.examples[1].natural, expected: mirrorText(lesson.examples[1].english) };
    const wrong = recordLearningActivity('learner', { ...common, response: 'I eating', correct: false, helped: false, feedback: 'Falta la pieza azul.' });
    recordLearningActivity('learner', { ...common, activityId: 'mirror-test:hint-1', source: 'authored', modality: 'choice', response: 'Busca la pieza azul', correct: null, helped: true, parentAttemptId: wrong.id });
    recordLearningActivity('learner', { ...common, response: "I'm eating", correct: true, helped: true, parentAttemptId: wrong.id });
    const events = readJournal('learner')!.events;
    expect(validateProgressBatch({ course: 'es-en', events })).toHaveLength(3);
    const restored = restoreProgress('learner', [...events, ...events]);
    const records = JSON.parse(restored.get('memora-v2.learning.learner')!);
    expect(records).toHaveLength(3); expect(records[0].response).toBe('I eating'); expect(records[2].parentAttemptId).toBe(wrong.id); expect(records[2].helped).toBe(true);
  });
  it('programa la frase para repaso posterior, sin afirmar retención en la primera práctica', () => {
    const now = new Date('2026-10-12T12:00:00Z'); vi.setSystemTime(now);
    recordSentenceExposure('learner', unit.id, { en: "I'm eating.", es: 'Estoy comiendo.', slots: [], pronunciationTip: '' }, now);
    expect(dueSentenceMemories('learner', now.getTime())).toHaveLength(0);
    const later = new Date('2026-10-12T13:01:00Z'); vi.setSystemTime(later);
    expect(dueSentenceMemories('learner', later.getTime())[0].attempts).toBe(0);
    expect(makeDeck('learner', [unit], false).some((question) => question.sentenceKey && question.answer === "I'm eating.")).toBe(true);
    vi.useRealTimers();
  });
  it('Mi evolución permite leer intentos, pistas y mensajes del personaje sin abrir el juego', () => {
    const base = { unitId: unit.id, unitTitle: unit.title, contentVersion: '1', skill: lesson.id, phase: 'dialogue' as const, modality: 'writing' as const, prompt: 'What are you doing?', expected: "I'm working", helped: false };
    const wrong = recordLearningActivity('learner', { ...base, source: 'learner', activityId: 'turn-respond', response: 'I working', correct: false, feedback: 'Falta la pieza azul.' });
    recordLearningActivity('learner', { ...base, source: 'learner', activityId: 'turn-respond', response: "I'm working", correct: true, helped: true, parentAttemptId: wrong.id });
    recordLearningActivity('learner', { ...base, source: 'authored', activityId: 'partner-reply-0', modality: 'choice', response: "Okay, I'll come back later.", correct: null, feedback: 'Emma: Vale, volveré después.' });
    const reconstructed = restoreProgress('learner', readJournal('learner')!.events);
    reconstructed.forEach((value, key) => localStorage.setItem(key, value));
    const html = renderToStaticMarkup(<EvolutionView userId="learner" units={[unit]} pilot={null} syncStatus="saved" appearance="light" onToggleAppearance={() => {}} onBack={() => {}} onPractice={() => {}} onProfile={() => {}} onExit={() => {}} />);
    expect(html).toContain('I working'); expect(html).toContain('Falta la pieza azul.'); expect(html).toContain('Mensaje del personaje'); expect(html).toContain('Vale, volveré después.'); expect(html).toContain('Nuevo intento');
    expect(html).toContain('0 respuestas escritas admitidas sin ayuda registrada');
  });
  it('la revisión visual del historial no expone ni modifica intentos de una cuenta', () => {
    recordLearningActivity('learner', { unitId: unit.id, unitTitle: unit.title, contentVersion: '1', activityId: 'private-attempt', skill: lesson.id, phase: 'grammar', source: 'learner', modality: 'writing', prompt: 'Estoy comiendo.', response: 'RESPUESTA PRIVADA', expected: 'I am eating', correct: false, helped: false });
    const before = localStorage.getItem('memora-v2.learning.learner');
    const html = renderToStaticMarkup(<EvolutionView userId="learner" units={[unit]} pilot={null} syncStatus="saved" inspectionMode appearance="light" onToggleAppearance={() => {}} onBack={() => {}} onPractice={() => {}} onProfile={() => {}} onExit={() => {}} />);
    expect(html).not.toContain('RESPUESTA PRIVADA'); expect(html).not.toContain('Progreso guardado en tu cuenta');
    expect(html).toContain('no lee ni modifica tu historial'); expect(localStorage.getItem('memora-v2.learning.learner')).toBe(before);
  });
});
