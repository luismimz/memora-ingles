import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isConciseMnemonic } from '../../../../shared/mnemonicQuality.mjs';
import { ai, assetUrl, items } from '../../lib/api';
import { prefetchNaturalAudio } from '../../lib/audioPlayer';
import { USES_KEYWORD, useStore } from '../../store';
import { afterExam } from '../../lib/srs';
import type { Mnemonic, Word } from '../../types';
import type {
  DiscoveryAssociation,
  DiscoveryCard,
  DiscoveryQueueOptions,
  DiscoveryQueueResult,
  DiscoveryQueueStatus,
  RecoveryQueueItem,
  RecoveryResolution,
} from './discovery.types';

const DEFAULT_STORAGE_KEY = 'memora.discovery.queue.v2';
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_PRELOAD_AHEAD = 3;
const DEFAULT_MINIMUM_ALTERNATIVES = 2;

function isAlchemyWord(word: Pick<Word, 'kind'>) {
  return word.kind === 'phrasal' || word.kind === 'phrasal_verb' || word.kind === 'compound';
}

interface PreparedWord {
  associations: DiscoveryAssociation[];
  audioReady: boolean;
  error: string | null;
}

interface PersistedQueue {
  version: 1 | 2;
  wordIds: number[];
  cursor: number;
  /** Índice del catálogo desde el que se busca el siguiente lote nuevo. */
  catalogCursor?: number;
  /** Reserva palabras que ya pasaron por Descubrir aunque aún no tengan SRS. */
  seenWordIds?: number[];
  alternativeByWord: Record<string, number>;
  rejectedByWord: Record<string, number[]>;
  recoveryQueue: RecoveryQueueItem[];
}

function readPersisted(key: string): PersistedQueue | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null') as PersistedQueue | null;
    return value && (value.version === 1 || value.version === 2) && Array.isArray(value.wordIds) ? value : null;
  } catch { return null; }
}

function savePersisted(key: string, value: PersistedQueue) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* almacenamiento opcional */ }
}

function associationPriority(mnemonic: Mnemonic, selectedId: number | null) {
  if (mnemonic.id === selectedId) return -1;
  if (mnemonic.source === 'user') return 0;
  if (mnemonic.source === 'seed') return 1;
  return 2;
}

/**
 * Las primeras semillas de Memora fueron más narrativas de lo que pide el
 * método actual. Las compactamos en memoria para que una entrada antigua no
 * bloquee la ronda ni vuelva a mostrar una historia larga. Conservamos la
 * escena hasta la última palabra resaltada (puente + significado) y
 * eliminamos aclaraciones entre paréntesis.
 */
function compactMnemonicText(value: string | null | undefined, maxWords: number) {
  const clean = String(value || '')
    .replace(/\*\*/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/^\s*(?:¡?cuidado!?|imagina|de repente)[,:]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';

  const upper = [...clean.matchAll(/[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9'¡!-]*/g)];
  const end = upper.length ? (upper.at(-1)?.index ?? clean.length) + (upper.at(-1)?.[0].length ?? 0) : clean.length;
  let compact = clean.slice(0, end).trim();
  // Si la palabra resaltada estaba muy avanzada, corta en la primera pausa
  // natural antes de recurrir a un límite duro de palabras.
  if (wordCount(compact) > maxWords) {
    const beforePause = compact.split(/[;:…]/, 1)[0].trim();
    compact = wordCount(beforePause) <= maxWords ? beforePause : compact.split(/\s+/).slice(0, maxWords).join(' ');
  }
  return compact.replace(/[,:;…-]+$/, '').trim() + (/[.!?]$/.test(compact) ? '' : '.');
}

function wordCount(value: string) {
  return (value.match(/[\p{L}\p{N}]+/gu) || []).length;
}

function toAssociations(list: Mnemonic[], selectedId: number | null): DiscoveryAssociation[] {
  const seen = new Set<number>();
  return [...list]
    .filter((mnemonic) => mnemonic.keyword && mnemonic.scene_es)
    .map((mnemonic) => ({
      ...mnemonic,
      scene_es: compactMnemonicText(mnemonic.scene_es, 14),
      story_en: mnemonic.story_en ? compactMnemonicText(mnemonic.story_en, 16) : mnemonic.story_en,
    }))
    .filter((mnemonic) => isConciseMnemonic(mnemonic))
    .sort((a, b) => associationPriority(a, selectedId) - associationPriority(b, selectedId) || a.id - b.id)
    .filter((mnemonic) => {
      if (seen.has(mnemonic.id)) return false;
      seen.add(mnemonic.id);
      return true;
    })
    .map((mnemonic) => ({
      id: mnemonic.id,
      keyword: mnemonic.keyword!,
      sceneEs: mnemonic.scene_es!,
      storyEn: mnemonic.story_en,
      emoji: mnemonic.emoji,
      imageId: mnemonic.image,
      imageUrl: mnemonic.image ? assetUrl(mnemonic.image) : null,
      phoneticScore: mnemonic.phon_score,
      focus: mnemonic.focus,
      source: mnemonic.source,
    }));
}

function preloadImage(url: string | null): Promise<void> {
  if (!url || typeof Image === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(resolve, 8000);
    const done = () => { window.clearTimeout(timer); resolve(); };
    image.onload = done;
    image.onerror = done;
    image.src = url;
  });
}

function publicWord(word: Word) {
  return {
    id: word.id,
    en: word.en,
    es: word.es,
    ipa: word.ipa,
    pronEs: word.pron_es,
    kind: word.kind,
    exampleEn: word.example_en,
  };
}

/**
 * Cerebro de la fase de descubrimiento.
 *
 * - Solo selecciona palabras nuevas que usan el método de palabra clave.
 * - Prepara la tarjeta visible y las siguientes antes de exponerlas a la UI.
 * - Aceptar el truco NO crea progreso: primero debe superarse la recuperación.
 * - Rechazar conserva la misma palabra y cambia a una alternativa ya cargada.
 */
export function useDiscoveryQueue(options: DiscoveryQueueOptions = {}): DiscoveryQueueResult {
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
  const preloadAhead = Math.max(3, options.preloadAhead ?? DEFAULT_PRELOAD_AHEAD);
  const minimumAlternatives = Math.max(1, options.minimumAlternatives ?? DEFAULT_MINIMUM_ALTERNATIVES);
  const startNewBatch = Boolean(options.startNewBatch);
  const store = useStore();
  // La cola pertenece a una cuenta. La versión anterior usaba una clave
  // global y podía presentar en una cuenta nueva recuerdos aceptados por otra.
  const storageKey = options.storageKey ?? `${DEFAULT_STORAGE_KEY}.${store.user?.id ?? 'anonymous'}`;
  const { words, wordById, progress, aiInfo, aiModel, mnemonicsFor, addMnemonic, saveProgress, logAttempts, today } = store;

  const [hydrated, setHydrated] = useState(false);
  const [wordIds, setWordIds] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const [catalogCursor, setCatalogCursor] = useState(0);
  const [seenWordIds, setSeenWordIds] = useState<number[]>([]);
  const [alternativeByWord, setAlternativeByWord] = useState<Record<string, number>>({});
  const [rejectedByWord, setRejectedByWord] = useState<Record<string, number[]>>({});
  const [recoveryQueue, setRecoveryQueue] = useState<RecoveryQueueItem[]>([]);
  const [prepared, setPrepared] = useState<Map<number, PreparedWord>>(new Map());
  const [revision, setRevision] = useState(0);
  const preparing = useRef(new Set<number>());
  const preparedRef = useRef(prepared);
  preparedRef.current = prepared;

  // Reanuda una ronda incompleta o crea un lote real ordenado por utilidad.
  // Cuando una ronda termina no se reutiliza su wordIds: avanzamos un cursor
  // persistente y excluimos tanto SRS como palabras ya vistas en Descubrir.
  useEffect(() => {
    if (hydrated || !words.length) return;
    const saved = readPersisted(storageKey);
    const validSavedIds = saved?.wordIds.filter((id) => wordById.has(id)) ?? [];
    const savedCursor = Math.max(0, saved?.catalogCursor ?? 0);
    const savedSeen = [...new Set(saved?.seenWordIds ?? (saved?.version === 1 ? validSavedIds : []))];
    const savedRecovery = saved?.recoveryQueue ?? [];
    let savedQueueCursor = Math.min(saved?.cursor ?? 0, validSavedIds.length);
    // Si otra pantalla ya consolidó la tarjeta actual mientras esta ronda
    // estaba guardada, la damos por consumida y no la reciclamos.
    while (savedQueueCursor < validSavedIds.length && progress.has(validSavedIds[savedQueueCursor])) savedQueueCursor += 1;
    const resumableIds = [
      ...validSavedIds.slice(0, savedQueueCursor),
      ...validSavedIds.slice(savedQueueCursor).filter((id) => !progress.has(id)),
    ];
    const savedActive = resumableIds.length > 0 && (savedQueueCursor < resumableIds.length || savedRecovery.length > 0);

    if (savedActive && !startNewBatch) {
      setWordIds(resumableIds);
      setCursor(Math.min(savedQueueCursor, resumableIds.length));
      setCatalogCursor(savedCursor);
      setSeenWordIds(savedSeen);
      setAlternativeByWord(saved?.alternativeByWord ?? {});
      setRejectedByWord(saved?.rejectedByWord ?? {});
      setRecoveryQueue(savedRecovery);
      setHydrated(true);
      return;
    }

    const excluded = new Set<number>([
      ...progress.keys(),
      ...savedSeen,
      ...savedRecovery.map((item) => item.wordId),
    ]);
    const freshIds: number[] = [];
    let nextCatalogCursor = Math.min(savedCursor, words.length);
    while (nextCatalogCursor < words.length && freshIds.length < batchSize) {
      const word = words[nextCatalogCursor];
      nextCatalogCursor += 1;
      if (!excluded.has(word.id) && (USES_KEYWORD(word) || isAlchemyWord(word))) freshIds.push(word.id);
    }
    const nextSeen = [...new Set([...savedSeen, ...freshIds])];
    setWordIds(freshIds);
    setCursor(0);
    setCatalogCursor(nextCatalogCursor);
    setSeenWordIds(nextSeen);
    setAlternativeByWord({});
    setRejectedByWord({});
    // Una palabra que falló en un micro-reto sigue viva: se conserva fuera
    // de la baraja nueva y podrá reaparecer cuando su índice de desbloqueo
    // se alcance, en lugar de perderse al encadenar rondas.
    setRecoveryQueue(savedRecovery);
    setHydrated(true);
  }, [batchSize, hydrated, progress, startNewBatch, storageKey, wordById, words]);

  useEffect(() => {
    if (!hydrated) return;
    savePersisted(storageKey, {
      version: 2,
      wordIds,
      cursor,
      catalogCursor,
      seenWordIds,
      alternativeByWord,
      rejectedByWord,
      recoveryQueue,
    });
  }, [alternativeByWord, catalogCursor, cursor, hydrated, recoveryQueue, rejectedByWord, seenWordIds, storageKey, wordIds]);

  const putPrepared = useCallback((wordId: number, value: PreparedWord) => {
    setPrepared((current) => {
      const next = new Map(current).set(wordId, value);
      preparedRef.current = next;
      return next;
    });
  }, []);

  const prepareWord = useCallback(async (wordId: number) => {
    if (preparedRef.current.has(wordId) || preparing.current.has(wordId)) return;
    const word = wordById.get(wordId);
    if (!word) return;
    preparing.current.add(wordId);
    try {
      if (isAlchemyWord(word)) {
        const audioReady = await prefetchNaturalAudio(word.en).then(() => true).catch(() => false);
        putPrepared(wordId, {
          associations: [{
            id: -word.id,
            keyword: word.en,
            sceneEs: `Fusiona las piezas para recordar «${word.es}».`,
            storyEn: word.example_en,
            emoji: word.kind === 'compound' ? '🧩' : '⚗️',
            imageId: null,
            imageUrl: null,
            phoneticScore: null,
            focus: null,
            source: 'seed',
          }],
          audioReady,
          error: null,
        });
        return;
      }
      const selectedId = progress.get(wordId)?.mnemonic ?? null;
      const cache = await mnemonicsFor([wordId], { fill: true });
      const raw = [...(cache.get(wordId) ?? [])];
      let associations = toAssociations(raw, selectedId);

      // Se prepara fuera del gesto. Si el usuario desliza a la izquierda,
      // la segunda asociación ya existe y no se abre una espera en pantalla.
      if (aiInfo.enabled && associations.length < minimumAlternatives) {
        const attempts = minimumAlternatives - associations.length;
        for (let i = 0; i < attempts; i++) {
          try {
            const made = await ai<Mnemonic>('keyword', {
              word: wordId,
              model: aiModel,
              avoid: raw.map((mnemonic) => mnemonic.keyword).filter(Boolean),
            });
            raw.push(made);
            addMnemonic(made);
            associations = toAssociations(raw, selectedId);
          } catch {
            // Cuentas sin permiso de IA pueden usar la asociación compartida.
            // La UI recibirá alternatives-exhausted si intenta rechazar la última.
            break;
          }
        }
      }

      if (!associations.length) {
        putPrepared(wordId, { associations: [], audioReady: false, error: `No hay una asociación breve preparada para “${word.en}”.` });
        return;
      }

      const [audioResult] = await Promise.all([
        prefetchNaturalAudio(word.en).then(() => true).catch(() => false),
        ...associations.map((association) => preloadImage(association.imageUrl)),
      ]);
      putPrepared(wordId, { associations, audioReady: audioResult === true, error: null });
    } catch (cause) {
      putPrepared(wordId, {
        associations: [],
        audioReady: false,
        error: cause instanceof Error ? cause.message : 'No se pudo preparar la tarjeta.',
      });
    } finally {
      preparing.current.delete(wordId);
    }
  }, [addMnemonic, aiInfo.enabled, aiModel, minimumAlternatives, mnemonicsFor, progress, putPrepared, wordById]);

  // Mantiene materializadas la tarjeta actual y, como mínimo, las tres siguientes.
  useEffect(() => {
    if (!hydrated || cursor >= wordIds.length) return;
    for (const wordId of wordIds.slice(cursor, cursor + preloadAhead + 1)) void prepareWord(wordId);
  }, [cursor, hydrated, prepareWord, preloadAhead, revision, wordIds]);

  const cardAt = useCallback((position: number): DiscoveryCard | null => {
    const wordId = wordIds[position];
    const word = wordById.get(wordId);
    const ready = prepared.get(wordId);
    if (!word || !ready?.associations.length) return null;
    const wanted = alternativeByWord[String(wordId)] ?? 0;
    const alternativeIndex = Math.min(wanted, ready.associations.length - 1);
    return {
      unitId: word.id,
      position,
      total: wordIds.length,
      word: publicWord(word),
      association: ready.associations[alternativeIndex],
      alternativeIndex,
      alternativesTotal: ready.associations.length,
      audioText: word.en,
      audioReady: ready.audioReady,
      special: isAlchemyWord(word) ? 'alchemy' : undefined,
    };
  }, [alternativeByWord, prepared, wordById, wordIds]);

  const current = useMemo(() => cardAt(cursor), [cardAt, cursor]);
  const preloaded = useMemo(() => wordIds
    .slice(cursor + 1, cursor + preloadAhead + 1)
    .map((_wordId, offset) => cardAt(cursor + offset + 1))
    .filter((card): card is DiscoveryCard => card !== null), [cardAt, cursor, preloadAhead, wordIds]);

  const expectedPreloaded = Math.min(preloadAhead, Math.max(0, wordIds.length - cursor - 1));
  const currentPrepared = wordIds[cursor] === undefined ? null : prepared.get(wordIds[cursor]);
  const status: DiscoveryQueueStatus = !hydrated
    ? 'idle'
    : !wordIds.length
      ? 'empty'
      : cursor >= wordIds.length
        ? 'complete'
        : currentPrepared?.error || (currentPrepared && !currentPrepared.associations.length)
          ? 'error'
          : current && preloaded.length >= expectedPreloaded
            ? 'ready'
            : 'loading';
  const error = status === 'error' ? new Error(currentPrepared?.error || 'La tarjeta no está preparada.') : null;

  const swipeRight = useCallback(() => {
    if (status !== 'ready' || !current) return { type: 'not-ready' } as const;
    const item: RecoveryQueueItem = {
      unitId: current.unitId,
      wordId: current.word.id,
      associationId: current.association.id,
      en: current.word.en,
      es: current.word.es,
      exampleEn: current.word.exampleEn,
      keyword: current.association.keyword,
      sceneEs: current.association.sceneEs,
      storyEn: current.association.storyEn,
      acceptedAt: new Date().toISOString(),
      unlockAfterIndex: Math.min(wordIds.length, cursor + 3),
    };
    setRecoveryQueue((queue) => [...queue.filter((entry) => entry.wordId !== item.wordId), item]);
    void items.create('mnemonic_feedback', {
      word: current.word.id,
      mnemonic: current.association.id,
      action: 'pick',
    }).catch(() => {});
    const nextCursor = cursor + 1;
    setCursor(nextCursor);
    return {
      type: 'accepted',
      wordId: current.word.id,
      associationId: current.association.id,
      batchComplete: nextCursor >= wordIds.length,
    } as const;
  }, [current, cursor, status, wordIds.length]);

  const resolveRecovery = useCallback(async (wordId: number, result: 'ok' | 'fail', ms: number): Promise<RecoveryResolution> => {
    const item = recoveryQueue.find((entry) => entry.wordId === wordId);
    if (!item) return { type: 'not-found', wordId };

    logAttempts([{
      word: item.wordId,
      study_day: today?.day ?? null,
      step: 0,
      kind: 'rescue',
      mode: 'rescue_keyword',
      result,
      ms,
      hours_since_learned: null,
      mnemonic: item.associationId,
    }]);

    if (result === 'fail') {
      // No la marcamos como aprendida: vuelve a aparecer cuando el usuario
      // haya avanzado al menos una tarjeta más.
      setRecoveryQueue((queue) => queue.map((entry) => entry.wordId === wordId
        ? { ...entry, unlockAfterIndex: cursor + 1 }
        : entry));
      return { type: 'requeued', wordId };
    }

    const now = Date.now();
    await saveProgress(item.wordId, {
      ...afterExam('ok', ms, now),
      study_day: today?.day ?? null,
      mnemonic: item.associationId,
      mnemonic_mode: 'auto',
      last_seen: new Date(now).toISOString(),
    });
    setRecoveryQueue((queue) => queue.filter((entry) => entry.wordId !== wordId));
    return { type: 'recovered', wordId, xp: 10 };
  }, [cursor, logAttempts, recoveryQueue, saveProgress, today?.day]);

  const swipeLeft = useCallback(() => {
    if (status !== 'ready' || !current) return { type: 'not-ready' } as const;
    const key = String(current.word.id);
    const nextIndex = current.alternativeIndex + 1;
    setRejectedByWord((all) => ({
      ...all,
      [key]: [...new Set([...(all[key] ?? []), current.association.id])],
    }));
    void items.create('mnemonic_feedback', {
      word: current.word.id,
      mnemonic: current.association.id,
      action: 'another',
    }).catch(() => {});
    if (nextIndex >= current.alternativesTotal) {
      return {
        type: 'alternatives-exhausted',
        wordId: current.word.id,
        rejectedAssociationId: current.association.id,
      } as const;
    }
    const nextAssociation = prepared.get(current.word.id)!.associations[nextIndex];
    setAlternativeByWord((all) => ({ ...all, [key]: nextIndex }));
    return {
      type: 'alternative',
      wordId: current.word.id,
      rejectedAssociationId: current.association.id,
      nextAssociationId: nextAssociation.id,
    } as const;
  }, [current, prepared, status]);

  const skipCurrent = useCallback(() => {
    if (status !== 'ready' || !current) return { type: 'not-ready' } as const;
    const nextCursor = cursor + 1;
    setCursor(nextCursor);
    return {
      type: 'skipped',
      wordId: current.word.id,
      associationId: current.association.id,
      batchComplete: nextCursor >= wordIds.length,
    } as const;
  }, [current, cursor, status, wordIds.length]);

  const retryPreload = useCallback(() => {
    const wordId = wordIds[cursor];
    if (wordId !== undefined) {
      setPrepared((currentMap) => {
        const next = new Map(currentMap);
        next.delete(wordId);
        preparedRef.current = next;
        return next;
      });
    }
    setRevision((value) => value + 1);
  }, [cursor, wordIds]);

  const completeAlchemy = useCallback(async () => {
    if (status !== 'ready' || !current || current.special !== 'alchemy') return { type: 'not-ready' } as const;
    const nextCursor = cursor + 1;
    setCursor(nextCursor);
    return { type: 'accepted', wordId: current.word.id, associationId: current.association.id, batchComplete: nextCursor >= wordIds.length } as const;
  }, [current, cursor, status, wordIds.length]);

  const readyForRecovery = useMemo(
    () => recoveryQueue.filter((item) => cursor >= item.unlockAfterIndex),
    [cursor, recoveryQueue],
  );

  return {
    status,
    current,
    preloaded,
    recoveryQueue,
    readyForRecovery,
    progress: { current: Math.min(cursor + 1, wordIds.length), total: wordIds.length, accepted: recoveryQueue.length },
    error,
    swipeRight,
    swipeLeft,
    skipCurrent,
    resolveRecovery,
    retryPreload,
    completeAlchemy,
  };
}
