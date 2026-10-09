import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ai, configureNaturalSpeech, items, request } from './lib/api';
import { configureSpeech } from './lib/speech';
import { localDate } from './lib/stats';
import { readLocalXp, writeLocalXp } from './lib/xp';
import type { Attempt, Mnemonic, Profile, Progress, StudyDay, Word } from './types';
import { isConciseMnemonic } from '../../shared/mnemonicQuality.mjs';

interface User { id: string; email: string; first_name: string | null }
interface AiInfo {
  enabled: boolean;
  models: string[];
  default: string;
  providers?: Record<string, string>;
  tts?: {
    enabled: boolean;
    provider: string;
    configured?: boolean;
    status?: 'configured' | 'not_configured' | 'unavailable' | string;
  };
}

interface Store {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  xp: number;
  words: Word[];
  wordById: Map<number, Word>;
  progress: Map<number, Progress>;
  days: StudyDay[];
  aiInfo: AiInfo;
  today: StudyDay | null;
  currentDay: number;
  reload(): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  addXp(amount: number): Promise<number>;
  saveProgress(word: number, patch: Partial<Progress>): Promise<Progress>;
  logAttempts(list: Attempt[]): void;
  startToday(): Promise<StudyDay>;
  updateDay(id: number, patch: Partial<StudyDay>): Promise<void>;
  mnemonicsFor(wordIds: number[], opts?: { fill?: boolean }): Promise<Map<number, Mnemonic[]>>;
  mnemonicCache: Map<number, Mnemonic[]>;
  addMnemonic(m: Mnemonic): void;
  preferredMnemonic(wordId: number): Mnemonic | null;
  activeMnemonic(wordId: number): Mnemonic | null;
  aiModel: string | undefined;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
};

const PENDING_KEY = 'memora.pendingAttempts';
const WORD_FIELDS = 'id,rank,day,en,es,pos,ipa,pron_es,example_en,example_es,audio_url,bridge_word,scene_es,target_sentence_es,target_sentence_en,distractor,verb_family,irregular_forms,irregular_examples,definition_en,cefr_level,domains,status,topic,kind,hint_es,arpabet,examples,pilot';
// Mantiene los campos pedagógicos aunque una instalación antigua todavía no
// tenga el campo opcional de audio. El fallback legacy anterior ocultaba la
// escena y la frase de Directus y dejaba Descubrir aparentemente vacío.
// No incluye `irregular_examples` a propósito: permite que una instalación
// anterior siga cargando todo el contenido curado mientras se migra el nuevo
// campo de frases por forma.
const WORD_FIELDS_CURATED_FALLBACK = 'id,rank,day,en,es,pos,ipa,pron_es,example_en,example_es,bridge_word,scene_es,target_sentence_es,target_sentence_en,distractor,verb_family,irregular_forms,topic,kind,hint_es,examples,pilot';
const WORD_FIELDS_LEGACY = 'id,rank,day,en,es,pos,ipa,pron_es,example_en,example_es,topic,kind,hint_es,arpabet,examples,pilot';
/** Tipos de palabra que se aprenden con palabra clave; el resto (cognados, bloques…) sin mnemotecnia. */
export const USES_KEYWORD = (w: Pick<Word, 'kind'>) => !w.kind || w.kind === 'keyword' || w.kind === 'irregular';

export function StoreProvider({ children, onAuthLost }: { children: ReactNode; onAuthLost: () => void }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [xp, setXp] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Map<number, Progress>>(new Map());
  const [days, setDays] = useState<StudyDay[]>([]);
  const [aiInfo, setAiInfo] = useState<AiInfo>({ enabled: false, models: [], default: '' });
  const [mnemonicCache, setMnemonicCache] = useState<Map<number, Mnemonic[]>>(new Map());
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const xpRef = useRef(0);
  const xpSyncRef = useRef<Promise<void>>(Promise.resolve());
  const cacheRef = useRef(mnemonicCache);
  cacheRef.current = mnemonicCache;

  const flushAttempts = useCallback(async () => {
    let pending: Attempt[] = [];
    try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { /* vacío */ }
    if (!pending.length) return;
    // Las primeras tarjetas de arranque podían guardar un id negativo local
    // como mnemotecnia. Nunca es una FK válida en Directus; se descarta aquí
    // para que ese registro antiguo no bloquee también los intentos nuevos.
    pending = pending.map((attempt) => ({
      ...attempt,
      mnemonic: attempt.mnemonic && attempt.mnemonic > 0 ? attempt.mnemonic : null,
    }));
    try {
      await items.create('attempts', pending);
      localStorage.removeItem(PENDING_KEY);
    } catch { /* se reintenta en la próxima llamada */ }
  }, []);

  const reload = useCallback(async () => {
    try {
      const me = await request<User>('GET', '/users/me?fields=id,email,first_name');
      const loadWords = async () => {
        try {
          const direct = await request<Word[]>('GET', '/memora/catalog/words?limit=5000');
          if (direct.length) return direct;
        } catch { /* backend antiguo: seguimos con Directus REST */ }
        const loaders = [
          () => items.list<Word>('words', { fields: WORD_FIELDS, sort: 'rank' }),
          () => items.list<Word>('words', { fields: WORD_FIELDS_CURATED_FALLBACK, sort: 'rank' }),
          () => items.list<Word>('words', { fields: WORD_FIELDS_LEGACY, sort: 'rank' }),
        ];
        for (const load of loaders) {
          try {
            const result = await load();
            // Un 200 con una lista vacía también puede ser una instalación
            // con permisos antiguos. Probamos la lectura autenticada de la
            // extensión antes de aceptar que el catálogo está vacío.
            if (result.length) return result;
          } catch { /* probamos el siguiente contrato */ }
        }
        return request<Word[]>('GET', '/memora/catalog/words?limit=5000');
      };
      const [ws, ps, ds, profs, aiRes] = await Promise.all([
        // Durante un redeploy puede arrancar el frontend antes de que el
        // script de esquema haya añadido los campos técnicos. En ese caso
        // cargamos el catálogo legado y la aplicación sigue siendo utilizable
        // mientras se completa la migración, en vez de bloquear todo el login.
        loadWords(),
        items.list<Progress>('progress', { fields: '*' }),
        items.list<StudyDay>('study_days', { sort: 'day' }),
        items.list<Profile>('profiles'),
        request<AiInfo>('GET', '/memora/models').catch(() => ({ enabled: false, models: [], default: '' })),
      ]);
      let prof = profs[0];
      if (!prof) prof = await items.create<Profile>('profiles', { start_date: localDate(), round_size: 10, daily_goal: 100, answer_mode: 'type', auto_speak: true, rate: 0.88, discovery_text_mode: 'auto', discovery_image_mode: 'auto' });
      const serverXp = Number(prof.xp ?? 0);
      const localXp = readLocalXp(me.id);
      const initialXp = Math.max(Number.isFinite(serverXp) ? serverXp : 0, localXp);
      setUser(me); setProfile({ ...prof, xp: initialXp }); setXp(initialXp); xpRef.current = initialXp;
      writeLocalXp(initialXp, me.id);
      if (initialXp !== serverXp) {
        void items.update<Profile>('profiles', prof.id, { xp: initialXp }).catch(() => {});
      }
      setWords(ws); setDays(ds); setAiInfo(aiRes);
      setProgress(new Map(ps.map((p) => [p.word, p])));
      configureSpeech(prof.voice, prof.rate);
      configureNaturalSpeech(prof.voice, prof.rate);
      setReady(true);
      flushAttempts();
    } catch (e) {
      if ((e as { status?: number }).status === 401 || (e as { status?: number }).status === 403) onAuthLost();
      else throw e;
    }
  }, [flushAttempts, onAuthLost]);

  useEffect(() => { reload(); }, [reload]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    if (!profile) return;
    const next = await items.update<Profile>('profiles', profile.id, patch);
    setProfile(next);
    configureSpeech(next.voice, next.rate);
    configureNaturalSpeech(next.voice, next.rate);
  }, [profile]);

  const addXp = useCallback((amount: number) => {
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
    if (!gained) return Promise.resolve(xpRef.current);
    const next = xpRef.current + gained;
    xpRef.current = next;
    setXp(next);
    writeLocalXp(next, user?.id);
    setProfile((current) => current ? { ...current, xp: next } : current);

    // Las recompensas rápidas se serializan para que dos aciertos seguidos no
    // pisen el mismo valor en Directus. La UI no espera a esta escritura.
    if (profile?.id) {
      const profileId = profile.id;
      xpSyncRef.current = xpSyncRef.current.then(async () => {
        try { await items.update<Profile>('profiles', profileId, { xp: next }); }
        catch { /* el valor local se sincronizará en la siguiente recarga */ }
      });
    }
    return xpSyncRef.current.then(() => next);
  }, [profile?.id, user?.id]);

  const saveProgress = useCallback(async (word: number, patch: Partial<Progress>) => {
    const existing = progressRef.current.get(word);
    const saved = existing
      ? await items.update<Progress>('progress', existing.id, patch)
      : await items.create<Progress>('progress', { word, ...patch });
    setProgress((m) => new Map(m).set(word, saved));
    progressRef.current = new Map(progressRef.current).set(word, saved);
    return saved;
  }, []);

  const logAttempts = useCallback((list: Attempt[]) => {
    if (!list.length) return;
    let pending: Attempt[] = [];
    try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { /* vacío */ }
    const stamped = list.map((a) => ({ ...a, created_at: undefined }));
    try { localStorage.setItem(PENDING_KEY, JSON.stringify([...pending, ...stamped])); }
    catch { items.create('attempts', stamped).catch(() => {}); return; }
    flushAttempts();
  }, [flushAttempts]);

  const todayStr = localDate();
  const today = days.find((d) => d.date === todayStr) ?? null;
  const currentDay = today?.day ?? (days.length ? Math.max(...days.map((d) => d.day)) + 1 : 1);

  const startToday = useCallback(async () => {
    if (today) return today;
    const created = await items.create<StudyDay>('study_days', {
      day: currentDay, date: todayStr, started_at: new Date().toISOString(), goal: profile?.daily_goal ?? 100,
    });
    setDays((d) => [...d, created]);
    return created;
  }, [today, currentDay, todayStr, profile]);

  const updateDay = useCallback(async (id: number, patch: Partial<StudyDay>) => {
    const next = await items.update<StudyDay>('study_days', id, patch);
    setDays((ds) => ds.map((d) => (d.id === id ? next : d)));
  }, []);

  const addMnemonic = useCallback((m: Mnemonic) => {
    setMnemonicCache((c) => new Map(c).set(m.word, [...(c.get(m.word) ?? []).filter((x) => x.id !== m.id), m]));
  }, []);

  const wordsRef = useRef(words);
  wordsRef.current = words;
  /** Palabras nuevas a completar: faltan datos básicos o, si se aprende con palabra clave, su asociación. */
  const needsFill = (id: number) => {
    const w = wordsRef.current.find((x) => x.id === id);
    return Boolean(w && (USES_KEYWORD(w) || !w.pron_es || !w.example_en));
  };

  const mnemonicsFor = useCallback(async (wordIds: number[], opts: { fill?: boolean } = {}) => {
    const missing = wordIds.filter((id) => !cacheRef.current.has(id));
    const fetchFor = async (ids: number[]) => {
      if (!ids.length) return [] as Mnemonic[];
      const out: Mnemonic[] = [];
      for (let i = 0; i < ids.length; i += 150) {
        const group = ids.slice(i, i + 150);
        let result: Mnemonic[] = [];
        try { result = await items.list<Mnemonic>('mnemonics', { filter: { word: { _in: group } }, sort: 'id' }); } catch { /* fallback de extensión */ }
        if (!result.length) result = await request<Mnemonic[]>('GET', `/memora/catalog/mnemonics?word_ids=${encodeURIComponent(group.join(','))}`).catch(() => []);
        out.push(...result);
      }
      return out;
    };
    const fetched = await fetchFor(missing);
    const next = new Map(cacheRef.current);
    for (const id of missing) next.set(id, []);
    for (const m of fetched) next.get(m.word)!.push(m);

    // Palabras sin asociación todavía (días no curados): la IA las genera y se guardan para siempre.
    if (opts.fill && aiInfo.enabled) {
      const empty = wordIds.filter((id) => (next.get(id) ?? []).length === 0 && needsFill(id));
      for (let i = 0; i < empty.length; i += 10) {
        try { await ai('fill', { words: empty.slice(i, i + 10), model: profile?.ai_model || undefined }); } catch { break; }
      }
      if (empty.length) {
        const refetched = await fetchFor(empty);
        for (const id of empty) next.set(id, []);
        for (const m of refetched) next.get(m.word)!.push(m);
        // Los datos básicos (ipa, ejemplo...) también pueden haber cambiado
        const fresh = await items.list<Word>('words', { fields: WORD_FIELDS, filter: { id: { _in: empty } } })
          .catch(() => items.list<Word>('words', { fields: WORD_FIELDS_CURATED_FALLBACK, filter: { id: { _in: empty } } }))
          .catch(() => items.list<Word>('words', { fields: WORD_FIELDS_LEGACY, filter: { id: { _in: empty } } }));
        setWords((ws) => ws.map((w) => fresh.find((f) => f.id === w.id) ?? w));
      }
    }
    cacheRef.current = next;
    setMnemonicCache(next);
    return next;
  }, [aiInfo.enabled, profile?.ai_model]);

  const preferredMnemonic = useCallback((wordId: number) => {
    const list = (mnemonicCache.get(wordId) ?? []).filter((m) => m.source !== 'ai' || isConciseMnemonic(m));
    const chosen = progress.get(wordId)?.mnemonic;
    return list.find((m) => m.id === chosen)
      ?? list.find((m) => m.source === 'user')
      ?? list.find((m) => m.source === 'seed')
      ?? list[0] ?? null;
  }, [mnemonicCache, progress]);

  /** La asociación que usa el alumno para esta palabra (null si eligió «sin mnemotecnia» o la palabra no la necesita). */
  const activeMnemonic = useCallback((wordId: number) => {
    const p = progress.get(wordId);
    if (p?.mnemonic_mode === 'none') return null;
    const list = mnemonicCache.get(wordId) ?? [];
    const w = wordsRef.current.find((x) => x.id === wordId);
    if (w && !USES_KEYWORD(w) && !list.some((m) => m.id === p?.mnemonic || m.source === 'user')) return null;
    return preferredMnemonic(wordId);
  }, [progress, mnemonicCache, preferredMnemonic]);

  const wordById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const value: Store = {
    ready, user, profile, xp, words, wordById, progress, days, aiInfo, today, currentDay,
    reload, updateProfile, addXp, saveProgress, logAttempts, startToday, updateDay,
    mnemonicsFor, mnemonicCache, addMnemonic, preferredMnemonic, activeMnemonic,
    aiModel: profile?.ai_model || undefined,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
