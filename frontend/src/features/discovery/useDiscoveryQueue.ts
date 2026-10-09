import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isConciseMnemonic } from '../../../../shared/mnemonicQuality.mjs';
import { ai, assetUrl, items } from '../../lib/api';
import { prefetchNaturalAudio } from '../../lib/audioPlayer';
import { useStore } from '../../store';
import { afterExam, isDue } from '../../lib/srs';
import { sentenceContainsSource } from '../sentences/sentenceMission';
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

export type { MissionPhase } from './discovery.types';

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
 * bloquee la ronda ni vuelva a mostrar una historia larga. Conservamos una
 * escena completa y autocontenida, eliminando aclaraciones entre paréntesis.
 */
function compactMnemonicText(value: string | null | undefined, maxWords: number) {
  const clean = String(value || '')
    .replace(/\*\*/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/^\s*(?:¡?cuidado!?|imagina|de repente)[,:]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';

  // No cortamos después de la última palabra en mayúsculas: muchas escenas
  // resaltan el puente y el significado antes de completar la acción (por
  // ejemplo «Tu perro FIEL SIENTE que estás triste…»). El final omitido
  // destruía precisamente la relación que había que recordar.
  let compact = clean;
  if (wordCount(compact) > maxWords) {
    const beforePause = compact.split(/[;:…]/, 1)[0].trim();
    compact = wordCount(beforePause) <= maxWords ? beforePause : compact.split(/\s+/).slice(0, maxWords).join(' ');
  }
  return compact.replace(/[,:;…-]+$/, '').trim() + (/[.!?]$/.test(compact) ? '' : '.');
}

function wordCount(value: string) {
  return (value.match(/[\p{L}\p{N}]+/gu) || []).length;
}

const MIN_DISCOVERY_EXAMPLE_WORDS = 5;
const MAX_DISCOVERY_EXAMPLE_WORDS = 24;

/**
 * Directus puede devolver campos legacy en camelCase (o con mayúsculas si la
 * instalación se creó con un importador antiguo). Normalizamos una sola vez
 * antes de aplicar filtros para no perder una palabra válida por el nombre de
 * la columna.
 */
function normalizeDirectusWord(input: Word): Word {
  const record = input as unknown as Record<string, unknown>;
  const fields = new Map(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
  const pick = (...keys: string[]) => keys.map((key) => fields.get(key.toLowerCase())).find((value) => value !== undefined);
  const text = (value: unknown): string | null => value === null || value === undefined || String(value).trim() === '' ? null : String(value);
  const irregularValue = pick('irregular_forms', 'irregularForms');
  let irregularForms = irregularValue;
  if (typeof irregularValue === 'string') {
    try { irregularForms = JSON.parse(irregularValue); } catch { irregularForms = null; }
  }
  const irregularExamplesValue = pick('irregular_examples', 'irregularExamples', 'form_examples', 'formExamples');
  let irregularExamples = irregularExamplesValue;
  if (typeof irregularExamplesValue === 'string') {
    try { irregularExamples = JSON.parse(irregularExamplesValue); } catch { irregularExamples = null; }
  }
  const kind = text(pick('kind', 'type')) as Word['kind'];
  return {
    ...input,
    en: text(pick('en', 'word')) ?? input.en,
    es: text(pick('es', 'meaning_es', 'translation')) ?? input.es,
    kind: kind ?? input.kind,
    status: text(pick('status')) ?? input.status,
    audio_url: text(pick('audio_url', 'audioUrl')),
    bridge_word: text(pick('bridge_word', 'bridgeWord')),
    scene_es: text(pick('scene_es', 'sceneEs')),
    target_sentence_es: text(pick('target_sentence_es', 'targetSentenceEs')),
    target_sentence_en: text(pick('target_sentence_en', 'targetSentenceEn')),
    distractor: text(pick('distractor', 'distractors')),
    verb_family: text(pick('verb_family', 'verbFamily')),
    irregular_forms: irregularForms && typeof irregularForms === 'object' ? irregularForms as Word['irregular_forms'] : null,
    irregular_examples: irregularExamples && typeof irregularExamples === 'object' ? irregularExamples as Word['irregular_examples'] : null,
  };
}

/** Solo las palabras enriquecidas por Directus pueden entrar en Descubrir. */
function hasDiscoveryExample(word: Pick<Word, 'en' | 'status' | 'bridge_word' | 'scene_es' | 'target_sentence_es' | 'target_sentence_en' | 'distractor' | 'irregular_forms'>) {
  const sentenceEn = String(word.target_sentence_en || '').trim();
  const sentenceEs = String(word.target_sentence_es || '').trim();
  const bridge = String(word.bridge_word || '').trim();
  const scene = String(word.scene_es || '').trim();
  const distractor = String(word.distractor || '').trim();
  const tokens = sentenceEn.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  const containsSource = sentenceContainsSource(sentenceEn, word.en, word.irregular_forms);
  const status = String(word.status || 'published').toLowerCase();
  return Boolean(
    // Algunas instalaciones antiguas exponen el booleano publicado como
    // `true`/`1` en vez de la etiqueta Directus `published`.
    (status === 'published' || status === 'active' || status === 'true' || status === '1') &&
    bridge &&
    scene &&
    sentenceEn &&
    sentenceEs &&
    distractor &&
    tokens.length >= MIN_DISCOVERY_EXAMPLE_WORDS &&
    tokens.length <= MAX_DISCOVERY_EXAMPLE_WORDS &&
    containsSource,
  );
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
    exampleEs: word.example_es,
    audioUrl: word.audio_url,
    bridgeWord: word.bridge_word ?? null,
    sceneEs: word.scene_es ?? null,
    targetSentenceEs: word.target_sentence_es ?? null,
    targetSentenceEn: word.target_sentence_en ?? null,
    distractor: word.distractor ?? null,
    irregularForms: word.irregular_forms ?? null,
    irregularExamples: word.irregular_examples ?? null,
    verbFamily: word.verb_family ?? null,
    definitionEn: word.definition_en ?? null,
    hintEs: word.hint_es ?? null,
  };
}

function directusAssociation(word: Word, visualMnemonic: Mnemonic | null = null): DiscoveryAssociation | null {
  if (!word.bridge_word?.trim() || !word.scene_es?.trim() || !word.target_sentence_es?.trim() || !word.target_sentence_en?.trim() || !word.distractor?.trim()) return null;
  return {
    id: -word.id,
    keyword: word.bridge_word.trim(),
    sceneEs: compactMnemonicText(word.scene_es, 18),
    storyEn: word.target_sentence_en.trim(),
    // La escena/frase canónica vive en `words`, pero el visual revisado puede
    // seguir viviendo en la asociación seed/AI. No lo descartamos al montar
    // la tarjeta: era la regresión que convertía todas las imágenes en «✨».
    emoji: visualMnemonic?.emoji ?? null,
    imageId: visualMnemonic?.image ?? null,
    imageUrl: visualMnemonic?.image ? assetUrl(visualMnemonic.image) : null,
    phoneticScore: null,
    focus: null,
    source: 'seed',
  };
}

/**
 * Cerebro de la fase de descubrimiento.
 *
 * - Selecciona palabras nuevas del catálogo y excluye cualquier unidad con SRS.
 * - Prepara la tarjeta visible y las siguientes antes de exponerlas a la UI.
 * - Aceptar el truco NO crea progreso: primero debe superarse la recuperación.
 * - Pedir otra opción conserva la misma palabra y cambia a una alternativa ya cargada.
 */
export function useDiscoveryQueue(options: DiscoveryQueueOptions = {}): DiscoveryQueueResult {
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
  const preloadAhead = Math.max(3, options.preloadAhead ?? DEFAULT_PRELOAD_AHEAD);
  const minimumAlternatives = Math.max(1, options.minimumAlternatives ?? DEFAULT_MINIMUM_ALTERNATIVES);
  const startNewBatch = Boolean(options.startNewBatch);
  const batchKey = options.batchKey ?? (startNewBatch ? 'fresh' : 'resume');
  const store = useStore();
  // La cola pertenece a una cuenta. La versión anterior usaba una clave
  // global y podía presentar en una cuenta nueva recuerdos aceptados por otra.
  const storageKey = options.storageKey ?? `${DEFAULT_STORAGE_KEY}.${store.user?.id ?? 'anonymous'}`;
  const { words, progress, aiInfo, aiModel, mnemonicsFor, addMnemonic, saveProgress, logAttempts, today } = store;
  const catalogWords = useMemo(() => words.map(normalizeDirectusWord), [words]);
  const catalogById = useMemo(() => new Map(catalogWords.map((word) => [word.id, word])), [catalogWords]);

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
  const initializedKey = useRef<string | null>(null);
  const exposureKeys = useRef(new Set<string>());
  const preparedRef = useRef(prepared);
  preparedRef.current = prepared;

  // Reanuda una ronda incompleta o crea un lote real ordenado por utilidad.
  // Cuando una ronda termina no se reutiliza su wordIds: avanzamos un cursor
  // persistente y excluimos tanto SRS como palabras ya vistas en Descubrir.
  useEffect(() => {
    const initializationKey = `${storageKey}:${batchKey}`;
    if ((hydrated && initializedKey.current === initializationKey) || !words.length) return;
    initializedKey.current = initializationKey;
    setPrepared(new Map());
    preparedRef.current = new Map();
    exposureKeys.current.clear();
    const saved = readPersisted(storageKey);
    const validSavedIds = saved?.wordIds.filter((id) => {
      const word = catalogById.get(id);
      return Boolean(word && hasDiscoveryExample(word));
    }) ?? [];
    const savedCursor = Math.max(0, saved?.catalogCursor ?? 0);
    const savedSeen = [...new Set(saved?.seenWordIds ?? (saved?.version === 1 ? validSavedIds : []))];
    const savedRecovery = (saved?.recoveryQueue ?? []).filter((item) => {
      const word = catalogById.get(item.wordId);
      return Boolean(word && hasDiscoveryExample(word));
    });
    let savedQueueCursor = Math.min(saved?.cursor ?? 0, validSavedIds.length);
    // Si otra pantalla ya consolidó la tarjeta actual mientras esta ronda
    // estaba guardada, la damos por consumida y no la reciclamos.
    while (savedQueueCursor < validSavedIds.length && progress.has(validSavedIds[savedQueueCursor])) savedQueueCursor += 1;
    const resumableIds = [
      ...validSavedIds.slice(0, savedQueueCursor),
      ...validSavedIds.slice(savedQueueCursor).filter((id) => !progress.has(id)),
    ];
    // Una recuperación pendiente no debe bloquear el catálogo nuevo. El
    // micro-reto puede viajar con la siguiente tanda y aparecer cuando su
    // índice de desbloqueo llegue; mientras tanto el alumno sigue avanzando.
    // Antes este `|| savedRecovery.length > 0` dejaba al usuario atrapado en
    // la última palabra aceptada y daba la sensación de que solo existían
    // diez o doce palabras.
    const savedActive = resumableIds.length > 0 && savedQueueCursor < resumableIds.length;

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
    let nextCatalogCursor = Math.min(savedCursor, catalogWords.length);
    while (nextCatalogCursor < catalogWords.length && freshIds.length < batchSize) {
      const word = catalogWords[nextCatalogCursor];
      nextCatalogCursor += 1;
      // Una unidad sin ejemplo bilingüe completo no entra en Descubrir:
      // mostrar «You WORD.» destruye la recuperación activa y no enseña uso.
      if (!excluded.has(word.id) && hasDiscoveryExample(word)) freshIds.push(word.id);
    }
    let selectedIds = freshIds;
    let fallbackMode: 'fresh' | 'due' | 'practice' = 'fresh';

    // Si el catálogo nuevo ya fue visto, la misión se convierte de inmediato
    // en una ronda de recuperación. Así «Continuar misión» nunca desemboca en
    // una cola vacía solo porque el usuario tenga progreso residual.
    if (!selectedIds.length) {
      const dueIds = [...progress.values()]
        .filter((entry) => entry.status !== 'known' && isDue(entry))
        .sort((a, b) => Date.parse(a.next_review_at ?? a.due_at ?? '') - Date.parse(b.next_review_at ?? b.due_at ?? ''))
        .map((entry) => entry.word)
        .filter((id, index, all) => all.indexOf(id) === index && !savedRecovery.some((item) => item.wordId === id))
        .filter((id) => {
          const word = catalogById.get(id);
          return Boolean(word && hasDiscoveryExample(word));
        });
      if (dueIds.length) {
        selectedIds = dueIds.slice(0, batchSize);
        nextCatalogCursor = catalogWords.length
          ? (savedCursor + selectedIds.length) % catalogWords.length
          : savedCursor;
        fallbackMode = 'due';
      }
    }

    // Último respaldo: práctica libre sobre el catálogo enriquecido. Se rota
    // con catalogCursor para no mostrar siempre las primeras palabras.
    if (!selectedIds.length && catalogWords.length) {
      const eligible = catalogWords.filter((word) => hasDiscoveryExample(word));
      if (eligible.length) {
        const start = savedCursor % eligible.length;
        const rotated = [...eligible.slice(start), ...eligible.slice(0, start)];
        // La práctica libre es el último salvavidas, no una ronda nueva:
        // cuando ya no quedan unidades nuevas ni repasos vencidos, muestra
        // todo el catálogo enriquecido disponible para que el usuario pueda
        // seguir entrenando sin caer en una cola vacía.
        selectedIds = rotated.map((word) => word.id);
        const last = selectedIds.at(-1);
        const lastIndex = last === undefined ? start : catalogWords.findIndex((word) => word.id === last);
        nextCatalogCursor = lastIndex >= 0 ? (lastIndex + 1) % Math.max(catalogWords.length, 1) : start;
        fallbackMode = 'practice';
      }
    }

    const nextSeen = fallbackMode === 'practice'
      ? savedSeen
      : [...new Set([...savedSeen, ...selectedIds])];
    setWordIds(selectedIds);
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
  }, [batchKey, batchSize, catalogById, catalogWords, hydrated, progress, startNewBatch, storageKey, words]);

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
    const word = catalogById.get(wordId);
    if (!word) return;
    preparing.current.add(wordId);
    try {
      const selectedId = progress.get(wordId)?.mnemonic ?? null;
      const cache = await mnemonicsFor([wordId], { fill: true });
      const raw = [...(cache.get(wordId) ?? [])];
      const visualMnemonic = raw.find((mnemonic) => mnemonic.id === selectedId && (mnemonic.image || mnemonic.emoji))
        ?? raw.find((mnemonic) => mnemonic.image || mnemonic.emoji)
        ?? null;
      const directAssociation = directusAssociation(word, visualMnemonic);
      if (!directAssociation) {
        putPrepared(wordId, { associations: [], audioReady: false, error: 'Esta palabra aún no tiene contenido pedagógico completo en Directus.' });
        return;
      }
      if (isAlchemyWord(word)) {
        const audioReady = await prefetchNaturalAudio(word.en, undefined, word.audio_url).then(() => true).catch(() => false);
        putPrepared(wordId, {
          associations: [directAssociation],
          audioReady,
          error: null,
        });
        return;
      }
      // La asociación curada en `words` siempre es la primera tarjeta. Las
      // mnemotecnias históricas/IA quedan como alternativas, nunca como SSOT.
      let associations = [directAssociation, ...toAssociations(raw, selectedId)];

      // Se prepara fuera del gesto. Si el usuario desliza a la derecha,
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
            associations = [directAssociation, ...toAssociations(raw, selectedId)];
          } catch {
            // Cuentas sin permiso de IA pueden usar la asociación compartida.
            // La UI recibirá alternatives-exhausted si intenta rechazar la última.
            break;
          }
        }
      }

      const [audioResult] = await Promise.all([
        prefetchNaturalAudio(word.en, undefined, word.audio_url).then(() => true).catch(() => false),
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
  }, [addMnemonic, aiInfo.enabled, aiModel, catalogById, minimumAlternatives, mnemonicsFor, progress, putPrepared]);

  // Mantiene materializadas la tarjeta actual y, como mínimo, las tres siguientes.
  useEffect(() => {
    if (!hydrated || cursor >= wordIds.length) return;
    for (const wordId of wordIds.slice(cursor, cursor + preloadAhead + 1)) void prepareWord(wordId);
  }, [cursor, hydrated, prepareWord, preloadAhead, revision, wordIds]);

  const cardAt = useCallback((position: number): DiscoveryCard | null => {
    const wordId = wordIds[position];
    const word = catalogById.get(wordId);
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
  }, [alternativeByWord, catalogById, prepared, wordIds]);

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

  // Cada exposición queda registrada de forma independiente de la respuesta.
  // Así podemos distinguir una repetición real de una simple revisión SRS y
  // detectar si la cola está reciclando una palabra antes de tiempo.
  useEffect(() => {
    if (status !== 'ready' || !current) return;
    const key = `${current.word.id}:${current.association.id}`;
    if (exposureKeys.current.has(key)) return;
    exposureKeys.current.add(key);
    logAttempts([{
      word: current.word.id,
      study_day: today?.day ?? null,
      step: null,
      kind: 'expose',
      mode: 'discovery',
      result: 'doubt',
      ms: 0,
      hours_since_learned: null,
      // Las tarjetas de arranque usan ids negativos locales: no deben
      // enviarse como FK a Directus mientras el usuario decide o genera una
      // asociación real.
      mnemonic: current.association.id > 0 ? current.association.id : null,
    }]);
  }, [current, logAttempts, status, today?.day]);

  /** Deslizar a la izquierda: acepta la asociación y avanza. */
  const swipeLeft = useCallback(() => {
    if (status !== 'ready' || !current) return { type: 'not-ready' } as const;
    const item: RecoveryQueueItem = {
      unitId: current.unitId,
      wordId: current.word.id,
      associationId: current.association.id,
      en: current.word.en,
      es: current.word.es,
      exampleEn: current.word.exampleEn,
      exampleEs: current.word.exampleEs,
      audioUrl: current.word.audioUrl,
      ipa: current.word.ipa,
      bridgeWord: current.word.bridgeWord,
      targetSentenceEs: current.word.targetSentenceEs,
      targetSentenceEn: current.word.targetSentenceEn,
      distractor: current.word.distractor,
      irregularForms: current.word.irregularForms,
      keyword: current.association.keyword,
      sceneEs: current.association.sceneEs,
      storyEn: current.association.storyEn,
      acceptedAt: new Date().toISOString(),
      unlockAfterIndex: Math.min(wordIds.length, cursor + 3),
    };
    setRecoveryQueue((queue) => [...queue.filter((entry) => entry.wordId !== item.wordId), item]);
    if (current.association.id > 0) {
      void items.create('mnemonic_feedback', {
        word: current.word.id,
        mnemonic: current.association.id,
        action: 'pick',
      }).catch(() => {});
    }
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
      mnemonic: item.associationId > 0 ? item.associationId : null,
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
      mnemonic: item.associationId > 0 ? item.associationId : null,
      mnemonic_mode: 'auto',
      last_seen: new Date(now).toISOString(),
    });
    setRecoveryQueue((queue) => queue.filter((entry) => entry.wordId !== wordId));
    return { type: 'recovered', wordId, xp: 10 };
  }, [cursor, logAttempts, recoveryQueue, saveProgress, today?.day]);

  /** Deslizar a la derecha: pide otra asociación para la misma palabra. */
  const swipeRight = useCallback(() => {
    if (status !== 'ready' || !current) return { type: 'not-ready' } as const;
    const key = String(current.word.id);
    const nextIndex = current.alternativeIndex + 1;
    setRejectedByWord((all) => ({
      ...all,
      [key]: [...new Set([...(all[key] ?? []), current.association.id])],
    }));
    if (current.association.id > 0) {
      void items.create('mnemonic_feedback', {
        word: current.word.id,
        mnemonic: current.association.id,
        action: 'another',
      }).catch(() => {});
    }
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

  const generateAlternative = useCallback(async () => {
    if (status !== 'ready' || !current) return { type: 'error', wordId: current?.word.id ?? 0, reason: 'La tarjeta todavía no está lista.' } as const;
    if (!aiInfo.enabled) return { type: 'unavailable', wordId: current.word.id, reason: 'La IA no está conectada en este entorno.' } as const;
    try {
      const ready = prepared.get(current.word.id);
      const cache = await mnemonicsFor([current.word.id], { fill: true });
      const raw = [...(cache.get(current.word.id) ?? [])];
      const made = await ai<Mnemonic>('keyword', {
        word: current.word.id,
        model: aiModel,
        avoid: [...raw.map((mnemonic) => mnemonic.keyword).filter(Boolean), current.association.keyword],
      });
      if (!made?.id || !made.keyword || !made.scene_es) return { type: 'error', wordId: current.word.id, reason: 'La IA no devolvió una asociación utilizable.' } as const;
      addMnemonic(made);
      const visualMnemonic = raw.find((mnemonic) => mnemonic.id === (progress.get(current.word.id)?.mnemonic ?? null) && (mnemonic.image || mnemonic.emoji))
        ?? raw.find((mnemonic) => mnemonic.image || mnemonic.emoji)
        ?? null;
      const primary = directusAssociation(catalogById.get(current.word.id)!, visualMnemonic);
      const associations = primary
        ? [primary, ...toAssociations([...raw, made], progress.get(current.word.id)?.mnemonic ?? null)]
        : toAssociations([...raw, made], progress.get(current.word.id)?.mnemonic ?? null);
      const generatedIndex = associations.findIndex((association) => association.id === made.id);
      if (generatedIndex < 0) return { type: 'error', wordId: current.word.id, reason: 'La asociación generada no pasó el filtro de calidad.' } as const;
      putPrepared(current.word.id, { ...(ready ?? { audioReady: false, error: null }), associations });
      setAlternativeByWord((all) => ({ ...all, [String(current.word.id)]: generatedIndex }));
      return { type: 'generated', wordId: current.word.id, associationId: made.id } as const;
    } catch (cause) {
      return { type: 'error', wordId: current.word.id, reason: cause instanceof Error ? cause.message : 'No se pudo generar la asociación.' } as const;
    }
  }, [addMnemonic, aiInfo.enabled, aiModel, catalogById, current, mnemonicsFor, prepared, progress, putPrepared, status]);

  const skipCurrent = useCallback(() => {
    if (status !== 'ready' || !current) return { type: 'not-ready' } as const;
    // «Sin asociación» no borra una palabra del método: la mueve al final de
    // la tanda para que pueda recibir otra alternativa sin bloquear el flujo.
    setWordIds((ids) => [...ids.slice(0, cursor), ...ids.slice(cursor + 1), current.word.id]);
    setCursor(cursor);
    return {
      type: 'skipped',
      wordId: current.word.id,
      associationId: current.association.id,
      batchComplete: false,
    } as const;
  }, [current, cursor, status]);

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
    generateAlternative,
    retryPreload,
    completeAlchemy,
  };
}
