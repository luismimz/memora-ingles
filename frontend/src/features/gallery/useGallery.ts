import { useCallback, useEffect, useRef, useState } from 'react';
import { assetUrl, items as apiItems } from '../../lib/api';
import { CHECKPOINTS_H, MASTERED_STEP, STEP_LABEL } from '../../lib/srs';
import { useStore } from '../../store';
import type { Mnemonic, Progress, Word } from '../../types';

export type GalleryState = 'discovered' | 'stable' | 'mastered';
export type GalleryStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface GalleryItem {
  id: number;
  word: Word;
  progress: Progress;
  association: Mnemonic | null;
  state: GalleryState;
  stateLabel: string;
  checkpointLabel: string;
  intervalHours: number;
  imageUrl: string | null;
  emoji: string;
  keyword: string | null;
  sceneEs: string | null;
  storyEn: string | null;
  learnedAt: string | null;
  recentFailures: number;
}

export interface GalleryResult {
  status: GalleryStatus;
  items: GalleryItem[];
  counts: Record<GalleryState, number>;
  error: Error | null;
  /** Exposiciones de Descubrir (o feedback histórico en cuentas antiguas). */
  repeatTotal: number;
  repeatedWords: { wordId: number; count: number }[];
  retry(): void;
}

/** Convierte el calendario SRS en una colección que se puede ver y completar. */
export function useGallery(): GalleryResult {
  const store = useStore();
  const [status, setStatus] = useState<GalleryStatus>('loading');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [repeatTotal, setRepeatTotal] = useState(0);
  const [repeatedWords, setRepeatedWords] = useState<{ wordId: number; count: number }[]>([]);
  const [revision, setRevision] = useState(0);
  const loadedRevision = useRef<number | null>(null);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (!store.ready || loading.current) return;
    loading.current = true;
    setStatus('loading');
    setError(null);
    try {
      const progressList = [...store.progress.values()]
        .filter((progress) => store.wordById.has(progress.word))
        .sort((a, b) => Date.parse(b.learned_at ?? '') - Date.parse(a.learned_at ?? ''));
      if (!progressList.length) {
        setItems([]);
        setRepeatTotal(0);
        setRepeatedWords([]);
        setStatus('empty');
        loadedRevision.current = revision;
        return;
      }
      const [cache, exposureHistory, feedbackHistory] = await Promise.all([
        store.mnemonicsFor(progressList.map((progress) => progress.word)),
        apiItems.list<{ word: number }>('attempts', { fields: 'word', filter: { kind: { _eq: 'expose' } } }).catch(() => []),
        apiItems.list<{ word: number }>('mnemonic_feedback', { fields: 'word' }).catch(() => []),
      ]);
      const exposureCounts = countWords(exposureHistory);
      const feedbackCounts = countWords(feedbackHistory);
      const historyCounts = new Map<number, number>(feedbackCounts);
      // Cuando ya existen exposiciones nuevas, son la fuente precisa. Para
      // cuentas antiguas usamos el feedback de asociación como respaldo.
      for (const [wordId, count] of exposureCounts) historyCounts.set(wordId, count);
      const historyRows = [...historyCounts.entries()].map(([wordId, count]) => ({ wordId, count })).sort((a, b) => b.count - a.count);
      setRepeatTotal(historyRows.reduce((total, row) => total + row.count, 0));
      setRepeatedWords(historyRows.filter((row) => row.count > 1).slice(0, 8));
      const next = progressList.map((progress) => {
        const word = store.wordById.get(progress.word)!;
        const association = chooseAssociation(cache.get(progress.word) ?? [], progress.mnemonic);
        return makeGalleryItem(word, progress, association);
      });
      setItems(next);
      setStatus('ready');
      loadedRevision.current = revision;
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('No se pudo cargar tu álbum de memoria.'));
      setStatus('error');
    } finally {
      loading.current = false;
    }
  }, [revision, store]);

  useEffect(() => {
    if (!store.ready || loadedRevision.current === revision) return;
    void load();
  }, [load, revision, store.ready]);

  const counts = items.reduce<Record<GalleryState, number>>((all, item) => {
    all[item.state] += 1;
    return all;
  }, { discovered: 0, stable: 0, mastered: 0 });

  return {
    status,
    items,
    counts,
    error,
    repeatTotal,
    repeatedWords,
    retry: () => {
      loadedRevision.current = null;
      setRevision((value) => value + 1);
    },
  };
}

function countWords(rows: { word: number }[]) {
  const counts = new Map<number, number>();
  for (const row of rows) counts.set(row.word, (counts.get(row.word) ?? 0) + 1);
  return counts;
}

function chooseAssociation(list: Mnemonic[], selectedId: number | null): Mnemonic | null {
  return list.find((mnemonic) => mnemonic.id === selectedId)
    ?? list.find((mnemonic) => mnemonic.source === 'user')
    ?? list.find((mnemonic) => mnemonic.source === 'seed')
    ?? list[0]
    ?? null;
}

function stateFor(progress: Progress): GalleryState {
  if (progress.status === 'mastered' || progress.status === 'known' || progress.step >= MASTERED_STEP) return 'mastered';
  if (progress.step >= 4) return 'stable'; // ya superó el checkpoint de +7 días
  return 'discovered';
}

function makeGalleryItem(word: Word, progress: Progress, association: Mnemonic | null): GalleryItem {
  const state = stateFor(progress);
  const intervalHours = progress.step >= MASTERED_STEP
    ? CHECKPOINTS_H[CHECKPOINTS_H.length - 1]
    : CHECKPOINTS_H[Math.max(0, Math.min(progress.step, CHECKPOINTS_H.length - 1))];
  return {
    id: word.id,
    word,
    progress,
    association,
    state,
    stateLabel: state === 'mastered' ? 'Dominada' : state === 'stable' ? 'Estable' : 'Descubierta',
    checkpointLabel: STEP_LABEL[Math.min(progress.step, STEP_LABEL.length - 1)] ?? 'Primer contacto',
    intervalHours,
    imageUrl: association?.image ? assetUrl(association.image) : null,
    emoji: association?.emoji || '🧠',
    keyword: association?.keyword ?? null,
    sceneEs: association?.scene_es ?? null,
    storyEn: association?.story_en ?? null,
    learnedAt: progress.learned_at,
    recentFailures: progress.fail,
  };
}
