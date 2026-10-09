import { useCallback, useEffect, useRef, useState } from 'react';
import { afterReview, hoursSince, isDue } from '../../lib/srs';
import { prefetchNaturalAudio } from '../../lib/audioPlayer';
import { shuffle } from '../../components/common';
import { useStore } from '../../store';
import type { Mnemonic, Progress, Result, Word } from '../../types';
import { sentenceMissionFromWord } from '../sentences/sentenceMission';

export type ArcadeStatus = 'loading' | 'ready' | 'running' | 'finished' | 'empty' | 'error';
export type ArcadePhase = 'audio' | 'reaction' | 'feedback';

export interface ArcadeCard {
  word: Word;
  progress: Progress;
  mnemonic: Mnemonic | null;
  promptWord: string;
  expectedYes: boolean;
}

export interface ArcadeFeedback {
  wordId: number;
  result: Result;
  choice: string;
  correctAnswer: string;
  elapsedMs: number;
  xp: number;
}

export interface ArcadeEngineResult {
  status: ArcadeStatus;
  phase: ArcadePhase;
  current: ArcadeCard | null;
  timeLeftMs: number;
  timeLimitMs: number;
  combo: number;
  maxCombo: number;
  score: number;
  xp: number;
  correct: number;
  answered: number;
  /** Las últimas palabras tocadas, para encadenarlas en el Constructor. */
  recentWords: Word[];
  totalDue: number;
  feedback: ArcadeFeedback | null;
  error: Error | null;
  stimulusTimeLimitMs: number;
  beginReaction(): void;
  start(): void;
  answer(choice: string): void;
  restart(): void;
}

const DEFAULT_TIME_LIMIT = 60_000;
/** Número cerrado de retos que compone una tanda Arcade. */
export const ARCADE_ROUND_SIZE = 15;
/** Una misma palabra puede reaparecer como máximo dos veces por tanda. */
export const MAX_WORD_REPEATS_PER_ROUND = 2;
const FAST_LIMIT = 1_000;
/** Ventana de adaptación para las dos primeras preguntas de cada ráfaga. */
export const BALLISTIC_CALIBRATION_MS = 4_000;
/** Ventana de flujo cuando ya hay una racha real activa. */
export const BALLISTIC_FLOW_MS = 3_000;
export const BALLISTIC_STIMULUS_MS = 3_500;
const FEEDBACK_FREEZE_MS = 600;

// Estas son las únicas cartas permitidas como práctica de respaldo. No son
// un catálogo aleatorio: son las 13 unidades que el usuario puede encontrar
// primero en Misión y que tienen contenido curado completo en Directus.
const CURATED_ARCADE_WORDS = [
  'pull', 'push', 'hold', 'hide', 'explain', 'cook', 'wash',
  'write', 'break', 'catch', 'buy', 'cut', 'set',
];
const CURATED_ARCADE_SET = new Set(CURATED_ARCADE_WORDS);
const UNLOCKED_STATUSES = new Set(['discovered', 'recovering', 'stable', 'mastered', 'learning', 'review']);
const MIN_UNIQUE_WORDS = Math.ceil(ARCADE_ROUND_SIZE / MAX_WORD_REPEATS_PER_ROUND);

function normalizedWord(word: Word): string {
  return word.en.trim().toLowerCase();
}

/** Arcade solo puede evaluar una tarjeta que el usuario pudo descubrir. */
function isMissionReady(word: Word): boolean {
  return Boolean(sentenceMissionFromWord(word));
}

/**
 * La API antigua usa learning/review/mastered y algunas instalaciones nuevas
 * usan discovered/recovering/stable. Aceptamos ambas nomenclaturas, pero no
 * `known` por sí solo: marcar "ya la conocía" no desbloquea un reto Arcade.
 */
function isUnlockedProgress(progress: Progress): boolean {
  const status = String(progress.status ?? '').trim().toLowerCase();
  return UNLOCKED_STATUSES.has(status)
    || progress.step > 0
    || Boolean(progress.learned_at || progress.last_seen);
}

function practiceProgress(word: number): Progress {
  const now = new Date().toISOString();
  return {
    id: 0,
    word,
    status: 'learning',
    study_day: null,
    step: 1,
    learned_at: now,
    due_at: now,
    relearn_at: null,
    reps: 0,
    lapses: 0,
    ok: 0,
    doubt: 0,
    fail: 0,
    avg_ms: null,
    last_seen: null,
    mnemonic: null,
    mnemonic_mode: 'auto',
    next_review_at: now,
    interval_step: 1,
    retention_rate: 0,
  };
}

function reactionLimit(answeredCount: number, activeCombo: number): number {
  if (answeredCount < 2) return BALLISTIC_CALIBRATION_MS;
  return activeCombo >= 2 ? BALLISTIC_FLOW_MS : BALLISTIC_STIMULUS_MS;
}

/**
 * Construye una tanda cerrada y barajada.
 *
 * Se trabaja con cartas únicas como entrada y se permite repetir cada ID solo
 * hasta dos veces. Con ocho palabras únicas ya se pueden llenar las quince
 * posiciones sin que ninguna aparezca tres veces. Si el catálogo disponible
 * no alcanza ese mínimo, devolvemos una baraja vacía para que el cargador pueda
 * mostrar el estado de cuenta sin inventar vocabulario.
 */
export function buildArcadeRound(cards: ArcadeCard[]): ArcadeCard[] {
  const uniqueCards = [...new Map(cards.map((card) => [card.word.id, card])).values()];
  if (uniqueCards.length < MIN_UNIQUE_WORDS) return [];

  const counts = new Map<number, number>();
  const round: ArcadeCard[] = [];
  while (round.length < ARCADE_ROUND_SIZE) {
    const available = shuffle(uniqueCards.filter((card) => (counts.get(card.word.id) ?? 0) < MAX_WORD_REPEATS_PER_ROUND));
    if (!available.length) return [];
    // Evita dos apariciones consecutivas cuando todavía hay otra carta válida.
    const previousId = round.at(-1)?.word.id;
    const next = available.find((card) => card.word.id !== previousId) ?? available[0];
    round.push(next);
    counts.set(next.word.id, (counts.get(next.word.id) ?? 0) + 1);
  }
  return round;
}

/**
 * Motor de ráfaga: mantiene una baraja local para que el siguiente estímulo
 * esté disponible en el mismo gesto, pero cada respuesta se escribe en el SRS
 * real mediante afterReview/saveProgress.
 */
export function useArcadeEngine(timeLimitMs = DEFAULT_TIME_LIMIT): ArcadeEngineResult {
  const store = useStore();
  const [status, setStatus] = useState<ArcadeStatus>('loading');
  const [phase, setPhase] = useState<ArcadePhase>('audio');
  const [deck, setDeck] = useState<ArcadeCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(timeLimitMs);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [recentWords, setRecentWords] = useState<Word[]>([]);
  const [feedback, setFeedback] = useState<ArcadeFeedback | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [stimulusTimeLimitMs, setStimulusTimeLimitMs] = useState(BALLISTIC_CALIBRATION_MS);
  const [loaded, setLoaded] = useState(false);
  const loading = useRef(false);
  const startedAt = useRef(0);
  const questionStartedAt = useRef(0);
  const locked = useRef(false);
  const statusRef = useRef(status);
  const deckRef = useRef(deck);
  const indexRef = useRef(currentIndex);
  const comboRef = useRef(combo);
  const answeredRef = useRef(answered);
  const stimulusTimeLimitRef = useRef(stimulusTimeLimitMs);
  const phaseRef = useRef(phase);
  const feedbackTimer = useRef<number | null>(null);
  const sessionProgress = useRef(new Map<number, Progress>());

  statusRef.current = status;
  deckRef.current = deck;
  indexRef.current = currentIndex;
  comboRef.current = combo;
  answeredRef.current = answered;
  stimulusTimeLimitRef.current = stimulusTimeLimitMs;
  phaseRef.current = phase;

  const load = useCallback(async () => {
    if (!store.ready) return;
    setStatus('loading');
    setPhase('audio');
    setError(null);
    try {
      // Arcade nunca descubre vocabulario nuevo. Primero prioriza cartas
      // vencidas; si aún no hay vencimientos, practica únicamente cartas ya
      // desbloqueadas en Misión. El respaldo solo puede salir del pack curado.
      const unlocked = [...new Map([...store.progress.values()]
        .filter(isUnlockedProgress)
        .map((progress) => [progress.word, progress] as const))
        .values()]
        .map((progress) => ({ progress, word: store.wordById.get(progress.word) }))
        .filter((entry): entry is { progress: Progress; word: Word } => Boolean(entry.word && isMissionReady(entry.word)));
      const due = unlocked
        .filter((entry) => isDue(entry.progress))
        .sort((a, b) => Date.parse(a.progress.next_review_at ?? a.progress.due_at ?? '') - Date.parse(b.progress.next_review_at ?? b.progress.due_at ?? ''));
      // Seleccionamos como máximo quince palabras únicas; después la tanda se
      // completa con repeticiones controladas (nunca más de dos por palabra).
      const unlockedSource = due.length ? due : unlocked;
      const selected = [...unlockedSource.slice(0, ARCADE_ROUND_SIZE)];
      if (selected.length < MIN_UNIQUE_WORDS) {
        const selectedIds = new Set(selected.map((entry) => entry.word.id));
        const curated = store.words
          .filter((word) => CURATED_ARCADE_SET.has(normalizedWord(word)) && isMissionReady(word))
          .map((word) => ({ progress: store.progress.get(word.id) ?? practiceProgress(word.id), word }))
          .filter((entry) => !selectedIds.has(entry.word.id));
        // Ocho palabras únicas es el mínimo matemático para llenar 15 huecos
        // con un máximo de dos apariciones. El respaldo sigue limitado al pack
        // curado y nunca recurre a palabras residuales del catálogo general.
        selected.push(...curated.slice(0, Math.max(0, MIN_UNIQUE_WORDS - selected.length)));
      }
      if (!selected.length) {
        setDeck([]);
        setLoaded(true);
        setStatus('empty');
        return;
      }

      const ids = selected.map((entry) => entry.word.id);
      const cache = await store.mnemonicsFor(ids);
      // Los distractores también pertenecen al arsenal desbloqueado/curado.
      // Nunca usamos palabras aleatorias del resto de `words`.
      const pool = selected.map((entry) => entry.word);
      const uniqueCards = selected.map(({ progress, word }) => makeCard(
        progress,
        word,
        cache.get(word.id)?.[0] ?? null,
        pool,
      ));
      const cards = buildArcadeRound(uniqueCards);
      if (!cards.length) {
        setDeck([]);
        setLoaded(true);
        setStatus('empty');
        return;
      }
      sessionProgress.current = new Map(selected.map(({ progress, word }) => [word.id, progress]));
      setDeck(cards);
      indexRef.current = 0;
      setCurrentIndex(0);
      setTimeLeftMs(timeLimitMs);
      setStimulusTimeLimitMs(BALLISTIC_CALIBRATION_MS);
      setLoaded(true);
      setStatus('ready');
      // La reproducción no espera a que el usuario llegue a la tarjeta.
      void Promise.all([...new Map(cards.map((card) => [card.word.id, card])).values()]
        .slice(0, 4)
        .map((card) => prefetchNaturalAudio(card.word.en, undefined, card.word.audio_url).catch(() => null)));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('No se pudo cargar el repaso Arcade.'));
      setLoaded(true);
      setStatus('error');
    }
  }, [store, timeLimitMs]);

  useEffect(() => {
    if (loaded || !store.ready || loading.current) return;
    loading.current = true;
    void load().finally(() => { loading.current = false; });
  }, [load, loaded, store.ready]);

  const current = deck[currentIndex] ?? null;

  useEffect(() => {
    if (status !== 'running') return undefined;
    const timer = window.setInterval(() => {
      const left = Math.max(0, timeLimitMs - (Date.now() - startedAt.current));
      setTimeLeftMs(left);
      if (left <= 0) {
        statusRef.current = 'finished';
        setStatus('finished');
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [status, timeLimitMs]);

  const start = useCallback(() => {
    if (!deckRef.current.length || (statusRef.current !== 'ready' && statusRef.current !== 'finished')) return;
    const now = Date.now();
    startedAt.current = now;
    questionStartedAt.current = now;
    locked.current = false;
    comboRef.current = 1;
    indexRef.current = 0;
    setCurrentIndex(0);
    setTimeLeftMs(timeLimitMs);
    setCombo(1);
    setMaxCombo(1);
    setScore(0);
    setXp(0);
    setCorrect(0);
    setAnswered(0);
    answeredRef.current = 0;
    setRecentWords([]);
    setFeedback(null);
    setStimulusTimeLimitMs(BALLISTIC_CALIBRATION_MS);
    setPhase('audio');
    statusRef.current = 'running';
    setStatus('running');
  }, [timeLimitMs]);

  const beginReaction = useCallback(() => {
    if (statusRef.current !== 'running' || phaseRef.current !== 'audio' || !deckRef.current[indexRef.current]) return;
    questionStartedAt.current = Date.now();
    const nextLimit = reactionLimit(answeredRef.current, comboRef.current);
    stimulusTimeLimitRef.current = nextLimit;
    setStimulusTimeLimitMs(nextLimit);
    locked.current = false;
    phaseRef.current = 'reaction';
    setPhase('reaction');
  }, []);

  const advance = useCallback(() => {
    feedbackTimer.current = null;
    if (statusRef.current !== 'running') return;
    const nextIndex = indexRef.current + 1;
    setFeedback(null);
    locked.current = false;
    if (nextIndex >= deckRef.current.length) {
      indexRef.current = nextIndex;
      phaseRef.current = 'audio';
      setPhase('audio');
      statusRef.current = 'finished';
      setStatus('finished');
      return;
    }
    indexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    questionStartedAt.current = 0;
    phaseRef.current = 'audio';
    setPhase('audio');
  }, []);

  const answer = useCallback((choice: string) => {
    if (statusRef.current !== 'running' || phaseRef.current !== 'reaction' || locked.current) return;
    const active = deckRef.current[indexRef.current];
    if (!active) return;
    locked.current = true;
    const elapsedMs = Math.max(1, Date.now() - questionStartedAt.current);
    const isCorrect = choice !== 'timeout' && (choice === 'yes') === active.expectedYes;
    const fast = isCorrect && elapsedMs < FAST_LIMIT;
    const result: Result = !isCorrect ? 'fail' : fast ? 'ok' : 'doubt';
    const nextCombo = fast ? comboRef.current + 1 : 1;
    const gainedXp = fast ? 10 * nextCombo : isCorrect ? 5 : 0;
    const gainedScore = fast ? 100 * nextCombo : isCorrect ? 50 : 0;
    comboRef.current = nextCombo;

    setCombo(nextCombo);
    setMaxCombo((value) => Math.max(value, nextCombo));
    setAnswered((value) => value + 1);
    answeredRef.current += 1;
    if (isCorrect) setCorrect((value) => value + 1);
    setXp((value) => value + gainedXp);
    setScore((value) => value + gainedScore);
    setRecentWords((words) => [active.word, ...words.filter((word) => word.id !== active.word.id)].slice(0, 3));
    setFeedback({ wordId: active.word.id, result, choice, correctAnswer: active.expectedYes ? 'YES' : 'NO', elapsedMs, xp: gainedXp });
    void store.addXp(gainedXp);

    const previous = sessionProgress.current.get(active.word.id) ?? active.progress;
    const next = afterReview(previous, result, elapsedMs);
    sessionProgress.current.set(active.word.id, { ...previous, ...next });
    store.logAttempts([{
      word: active.word.id,
      study_day: previous.study_day,
      step: previous.step,
      kind: 'review',
      mode: 'arcade',
      result,
      ms: elapsedMs,
      hours_since_learned: hoursSince(previous.learned_at),
      mnemonic: active.mnemonic?.id ?? previous.mnemonic,
    }]);
    void store.saveProgress(active.word.id, { ...next, last_seen: new Date().toISOString() }).catch((cause) => {
      setError(cause instanceof Error ? cause : new Error('No se pudo guardar este repaso.'));
    });

    phaseRef.current = 'feedback';
    setPhase('feedback');
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(advance, FEEDBACK_FREEZE_MS);
  }, [advance, store]);

  // La cuenta atrás existe únicamente en REACTION. Durante AUDIO y FEEDBACK
  // no hay respuesta posible y el estímulo no puede consumir tiempo.
  useEffect(() => {
    if (status !== 'running' || phase !== 'reaction' || !current) return undefined;
    const timer = window.setTimeout(() => answer('timeout'), stimulusTimeLimitMs);
    return () => window.clearTimeout(timer);
  }, [answer, current?.word.id, phase, status, stimulusTimeLimitMs]);

  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  const restart = useCallback(() => {
    setLoaded(false);
    setDeck([]);
    statusRef.current = 'loading';
    setStimulusTimeLimitMs(BALLISTIC_CALIBRATION_MS);
    setStatus('loading');
  }, []);

  return {
    status,
    phase,
    current,
    timeLeftMs,
    timeLimitMs,
    combo,
    maxCombo,
    score,
    xp,
    correct,
    answered,
    recentWords,
    totalDue: deck.length,
    feedback,
    error,
    stimulusTimeLimitMs,
    beginReaction,
    start,
    answer,
    restart,
  };
}

function makeCard(progress: Progress, word: Word, mnemonic: Mnemonic | null, pool: Word[]): ArcadeCard {
  const alternatives = shuffle(pool.filter((candidate) => candidate.id !== word.id && candidate.en.toLowerCase() !== word.en.toLowerCase()));
  const alternative = alternatives[0]?.en;
  // Con una única carta no inventamos un distractor: la pregunta es afirmativa
  // y el usuario sigue entrenando la recuperación sin ruido externo.
  const expectedYes = alternative ? Math.random() >= 0.5 : true;
  return {
    word,
    progress,
    mnemonic,
    promptWord: expectedYes ? word.en : alternative ?? word.en,
    expectedYes,
  };
}
