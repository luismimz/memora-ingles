import { useCallback, useEffect, useRef, useState } from 'react';
import { afterReview, hoursSince, isDue } from '../../lib/srs';
import { prefetchNaturalAudio } from '../../lib/audioPlayer';
import { shuffle } from '../../components/common';
import { useStore } from '../../store';
import type { Mnemonic, Progress, Result, Word } from '../../types';

export type ArcadeStatus = 'loading' | 'ready' | 'running' | 'finished' | 'empty' | 'error';

export interface ArcadeCard {
  word: Word;
  progress: Progress;
  mnemonic: Mnemonic | null;
  options: string[];
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
  start(): void;
  answer(choice: string): void;
  restart(): void;
}

const DEFAULT_TIME_LIMIT = 60_000;
const FAST_LIMIT = 1_500;
const FALLBACK_WORDS = ['really', 'improve', 'actually', 'enough', 'notice', 'borrow'];

/**
 * Motor de ráfaga: mantiene una baraja local para que el siguiente estímulo
 * esté disponible en el mismo gesto, pero cada respuesta se escribe en el SRS
 * real mediante afterReview/saveProgress.
 */
export function useArcadeEngine(timeLimitMs = DEFAULT_TIME_LIMIT): ArcadeEngineResult {
  const store = useStore();
  const [status, setStatus] = useState<ArcadeStatus>('loading');
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
  const [loaded, setLoaded] = useState(false);
  const loading = useRef(false);
  const startedAt = useRef(0);
  const questionStartedAt = useRef(0);
  const locked = useRef(false);
  const statusRef = useRef(status);
  const deckRef = useRef(deck);
  const indexRef = useRef(currentIndex);
  const comboRef = useRef(combo);
  const sessionProgress = useRef(new Map<number, Progress>());

  statusRef.current = status;
  deckRef.current = deck;
  indexRef.current = currentIndex;
  comboRef.current = combo;

  const load = useCallback(async () => {
    if (!store.ready) return;
    setStatus('loading');
    setError(null);
    const due = [...store.progress.values()]
      .filter((progress) => isDue(progress) && progress.status !== 'known')
      .sort((a, b) => Date.parse(a.due_at ?? '') - Date.parse(b.due_at ?? ''));
    if (!due.length) {
      setDeck([]);
      setLoaded(true);
      setStatus('empty');
      return;
    }

    try {
      const ids = due.map((progress) => progress.word);
      const cache = await store.mnemonicsFor(ids);
      const words = due
        .map((progress) => ({ progress, word: store.wordById.get(progress.word) }))
        .filter((entry): entry is { progress: Progress; word: Word } => Boolean(entry.word));
      const pool = words.map((entry) => entry.word).concat(store.words.filter((word) => !ids.includes(word.id)));
      const cards = words.map(({ progress, word }) => makeCard(progress, word, cache.get(word.id)?.[0] ?? null, pool));
      sessionProgress.current = new Map(due.map((progress) => [progress.word, progress]));
      setDeck(shuffle(cards));
      setCurrentIndex(0);
      setTimeLeftMs(timeLimitMs);
      setLoaded(true);
      setStatus('ready');
      // La reproducción no espera a que el usuario llegue a la tarjeta.
      void Promise.all(cards.slice(0, 4).map((card) => prefetchNaturalAudio(card.word.en).catch(() => null)));
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
    setCurrentIndex(0);
    setTimeLeftMs(timeLimitMs);
    setCombo(1);
    setMaxCombo(1);
    setScore(0);
    setXp(0);
    setCorrect(0);
    setAnswered(0);
    setRecentWords([]);
    setFeedback(null);
    statusRef.current = 'running';
    setStatus('running');
  }, [timeLimitMs]);

  const answer = useCallback((choice: string) => {
    if (statusRef.current !== 'running' || locked.current) return;
    const active = deckRef.current[indexRef.current];
    if (!active) return;
    locked.current = true;
    const elapsedMs = Math.max(1, Date.now() - questionStartedAt.current);
    const isCorrect = choice === active.word.en;
    const fast = isCorrect && elapsedMs < FAST_LIMIT;
    const result: Result = !isCorrect ? 'fail' : fast ? 'ok' : 'doubt';
    const nextCombo = fast ? comboRef.current + 1 : 1;
    const gainedXp = fast ? 10 * nextCombo : isCorrect ? 5 : 0;
    const gainedScore = fast ? 100 * nextCombo : isCorrect ? 50 : 0;
    comboRef.current = nextCombo;

    setCombo(nextCombo);
    setMaxCombo((value) => Math.max(value, nextCombo));
    setAnswered((value) => value + 1);
    if (isCorrect) setCorrect((value) => value + 1);
    setXp((value) => value + gainedXp);
    setScore((value) => value + gainedScore);
    setRecentWords((words) => [active.word, ...words.filter((word) => word.id !== active.word.id)].slice(0, 3));
    setFeedback({ wordId: active.word.id, result, choice, correctAnswer: active.word.en, elapsedMs, xp: gainedXp });
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

    const nextIndex = (indexRef.current + 1) % deckRef.current.length;
    indexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    questionStartedAt.current = Date.now();
    window.setTimeout(() => { locked.current = false; }, 190);
    window.setTimeout(() => setFeedback(null), 360);
  }, [store]);

  const restart = useCallback(() => {
    setLoaded(false);
    setDeck([]);
    statusRef.current = 'loading';
    setStatus('loading');
  }, []);

  return {
    status,
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
    start,
    answer,
    restart,
  };
}

function makeCard(progress: Progress, word: Word, mnemonic: Mnemonic | null, pool: Word[]): ArcadeCard {
  const distractors = shuffle(pool
    .filter((candidate) => candidate.id !== word.id && candidate.en.toLowerCase() !== word.en.toLowerCase())
    .map((candidate) => candidate.en))
    .filter((value, index, all) => all.indexOf(value) === index);
  const fallback = FALLBACK_WORDS.filter((value) => value.toLowerCase() !== word.en.toLowerCase());
  // El acierto siempre está presente; solo se barajan los tres distractores.
  const options = shuffle([word.en, ...shuffle([...distractors, ...fallback]).slice(0, 3)]);
  return { word, progress, mnemonic, options };
}
