import { useEffect, useMemo, useRef, useState } from 'react';
import { KIND_LABEL } from '../../../shared/classify.mjs';
import { isConciseMnemonic, mnemonicWordCount } from '../../../shared/mnemonicQuality.mjs';
import { englishPhones, scoreKeyword, verdictFor } from '../../../shared/phonetics.mjs';
import { ai, assetUrl, items } from '../lib/api';
import { normalize } from '../lib/answer';
import { USES_KEYWORD, useStore } from '../store';
import type { Mnemonic, Word } from '../types';
import { ErrorBox, Modal, playNaturalFast, Rich, SpeakBtn, Spinner, toast } from './common';

export interface MnemonicChoice { mode: 'auto' | 'none'; mnemonic: Mnemonic | null }

interface Props {
  word: Word;
  spot?: string;
  /** learn = primera exposición rápida; detail = ficha completa (diccionario). */
  variant?: 'learn' | 'detail' | 'compact';
  autoSpeak?: boolean;
  /** Elección ya hecha en esta sesión (aún no hay progreso guardado). */
  choice?: MnemonicChoice;
  onChoice?: (c: MnemonicChoice) => void;
  onDone?: (ms: number) => void;
}

// La asociación inicial es rápida; la producción necesita tiempo para ordenar
// y crear una frase propia, así que el aviso de ritmo no penaliza esos pasos.
const TARGET_S = 45;

type UseStage = 'memory' | 'order' | 'create';

export type SentenceVariant = { en: string; es: string; source?: string };

interface SentenceReview {
  correct: boolean;
  corrected: string;
  explanation_es: string;
  natural: string;
  score: number;
}

const VARIANT_CURSOR_KEY = 'memora.sentence-variant-cursor';

function readVariantCursor(wordId: number) {
  try {
    const data = JSON.parse(localStorage.getItem(VARIANT_CURSOR_KEY) || '{}');
    return Number.isFinite(data?.[wordId]) ? Math.max(0, Number(data[wordId])) : 0;
  } catch { return 0; }
}

function advanceVariantCursor(wordId: number, count: number) {
  if (count < 2) return;
  try {
    const data = JSON.parse(localStorage.getItem(VARIANT_CURSOR_KEY) || '{}');
    data[wordId] = (Number.isFinite(data?.[wordId]) ? Number(data[wordId]) : 0) + 1;
    localStorage.setItem(VARIANT_CURSOR_KEY, JSON.stringify(data));
  } catch { /* el modo privado puede no tener almacenamiento */ }
}

function saveVariantCursor(wordId: number, nextIndex: number) {
  try {
    const data = JSON.parse(localStorage.getItem(VARIANT_CURSOR_KEY) || '{}');
    data[wordId] = Math.max(0, nextIndex);
    localStorage.setItem(VARIANT_CURSOR_KEY, JSON.stringify(data));
  } catch { /* el modo privado puede no tener almacenamiento */ }
}

function shuffleIds(length: number) {
  const ids = Array.from({ length }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function sentenceVariantsFor(word: Word): SentenceVariant[] {
  const key = word.en.trim().toLowerCase();
  const curated: Record<string, string[]> = {
    really: ['I really want to understand this.', 'Do you really mean it?', 'She is really good at explaining things.'],
    improve: ['I want to improve my English.', 'Small steps improve my confidence.', 'This exercise will improve your listening.'],
    actually: ['Actually, I agree with you.', 'I actually use this every day.', 'Well, actually, I am not sure.'],
  };
  const fallback = word.kind === 'phrasal'
    ? [`I often use “${word.en}” in conversation.`, `Can you use “${word.en}” in a sentence?`]
    : [`I am learning how to use “${word.en}” today.`, `I can say “${word.en}” in a real conversation.`];
  const guided = curated[key] ?? (word.example_en || word.examples?.length ? [] : fallback);
  const changesMeaning = (sentence: string) => key === 'hang' && /\bhang\s+(on|out|around)\b/i.test(sentence);
  const incoming: SentenceVariant[] = [
    ...(word.example_en ? [{ en: word.example_en, es: word.example_es ?? '', source: 'word' }] : []),
    ...(word.examples ?? []).filter((item) => !changesMeaning(item.en)),
    ...guided.map((en) => ({ en, es: '', source: 'guided' })),
  ];
  const seen = new Set<string>();
  return incoming.filter((x) => {
    const en = String(x.en || '').trim();
    const id = normalize(en);
    if (!en || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 6);
}

function wordsForSentence(sentence: string) {
  return sentence.replace(/[.?!,;:]/g, '').split(/\s+/).filter(Boolean);
}

export function creativeSentenceIssues(word: Pick<Word, 'en'>, ownSentence: string, example: string) {
  const answer = normalize(ownSentence);
  const answerWords = answer.split(' ').filter(Boolean);
  const target = normalize(word.en);
  const usesWord = target.includes(' ') ? ` ${answer} `.includes(` ${target} `) : answerWords.includes(target);
  const enough = answerWords.length >= 5;
  const copied = answer === normalize(example);
  const wrongHangSense = target === 'hang' && /\bhang\s+(on|out|around)\b/.test(answer);
  return [
    ...(!usesWord ? [`Incluye la palabra «${word.en}».`] : []),
    ...(!enough ? [`Llevas ${answerWords.length} ${answerWords.length === 1 ? 'palabra' : 'palabras'}: añade quién, qué, dónde o cuándo hasta llegar a cinco.`] : []),
    ...(copied ? ['La frase modelo ya está superada: cambia al menos la persona, el objeto, el lugar o el momento.'] : []),
    ...(wrongHangSense ? ['«Hang on» significa «espera». Para practicar hang = colgar, usa hang + un objeto: coat, picture, bag…'] : []),
  ];
}

export function soundBadge(score: number | null | undefined) {
  if (score == null) return null;
  const v = verdictFor(score);
  return <span className={`chip ${v === 'good' ? 'ok' : v === 'weak' ? 'doubt' : 'fail'}`} title="Parecido fonético con la sílaba fuerte real">🔊 {Math.round(score * 100)}%</span>;
}

export function ExposureCard({ word, spot, variant = 'learn', autoSpeak, choice, onChoice, onDone }: Props) {
  const store = useStore();
  const [notWorking, setNotWorking] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [more, setMore] = useState(variant === 'detail');
  const [useStage, setUseStage] = useState<UseStage>('memory');
  const [ordered, setOrdered] = useState<number[]>([]);
  const [poolOrder, setPoolOrder] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderChecked, setOrderChecked] = useState<boolean | null>(null);
  const [ownSentence, setOwnSentence] = useState('');
  const [ownChecked, setOwnChecked] = useState(false);
  const [ownIssues, setOwnIssues] = useState<string[]>([]);
  const [ownAccepted, setOwnAccepted] = useState(false);
  const [ownReview, setOwnReview] = useState<SentenceReview | null>(null);
  const [ownReviewBusy, setOwnReviewBusy] = useState(false);
  const [ownReviewError, setOwnReviewError] = useState<string | null>(null);
  const started = useRef(Date.now());
  const useStarted = useRef(0);
  const useInProgress = useRef(false);
  const [secs, setSecs] = useState(0);
  const [sentenceVariants, setSentenceVariants] = useState<SentenceVariant[]>(() => sentenceVariantsFor(word));
  const [sentenceVariantIndex, setSentenceVariantIndex] = useState(() => readVariantCursor(word.id) % Math.max(sentenceVariantsFor(word).length, 1));

  const list = (store.mnemonicCache.get(word.id) ?? []).filter((item) => item.source !== 'ai' || isConciseMnemonic(item));
  const usesKeyword = USES_KEYWORD(word);
  const noneChosen = choice ? choice.mode === 'none' : store.progress.get(word.id)?.mnemonic_mode === 'none';
  const m = noneChosen ? null : (choice?.mnemonic ?? store.activeMnemonic(word.id));

  const example = sentenceVariants[sentenceVariantIndex]?.en || word.example_en || `I use ${word.en} every day.`;
  const exampleWords = wordsForSentence(example);
  const tokenPool = useMemo(() => {
    const distractors = [
      ['really', 'today'],
      ['at', 'home'],
      ['because', 'sometimes'],
      ['for', 'tomorrow'],
    ][sentenceVariantIndex % 4];
    return [...exampleWords, ...distractors].map((text, id) => ({ id, text }));
  }, [example, sentenceVariantIndex]);

  useEffect(() => {
    const variants = sentenceVariantsFor(word);
    const initialIndex = readVariantCursor(word.id) % Math.max(variants.length, 1);
    started.current = Date.now(); useStarted.current = 0; useInProgress.current = false; setSecs(0); setShowEn(false); setMore(variant === 'detail');
    setSentenceVariants(variants); setSentenceVariantIndex(initialIndex);
    setUseStage('memory'); setOrdered([]); setPoolOrder(shuffleIds(variants[initialIndex] ? wordsForSentence(variants[initialIndex].en).length + 2 : 0)); setDragIndex(null); setOrderChecked(null); setOwnSentence(''); setOwnChecked(false); setOwnIssues([]); setOwnAccepted(false); setOwnReview(null); setOwnReviewBusy(false); setOwnReviewError(null);
  }, [word.id, variant]);
  useEffect(() => { if (autoSpeak) return playNaturalFast(word.en, false, 8000, true, word.audio_url); return undefined; }, [word.id, autoSpeak, word.en, word.audio_url]);
  useEffect(() => {
    if (variant !== 'learn') return;
    const t = setInterval(() => setSecs(Math.floor((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [word.id, variant]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!store.mnemonicCache.has(word.id)) store.mnemonicsFor([word.id], { fill: true }); }, [word.id]);

  const apply = async (c: MnemonicChoice, action: 'another' | 'own' | 'none' | 'pick') => {
    items.create('mnemonic_feedback', { word: word.id, mnemonic: m?.id ?? null, action }).catch(() => {});
    if (c.mnemonic) store.addMnemonic(c.mnemonic);
    if (onChoice) onChoice(c);
    else if (store.progress.has(word.id)) await store.saveProgress(word.id, { mnemonic_mode: c.mode, mnemonic: c.mnemonic?.id ?? null });
    setNotWorking(false);
  };

  const startUse = () => {
    useStarted.current = Date.now(); useInProgress.current = true;
    // Se reserva la siguiente variante al empezar: si el alumno abandona y vuelve,
    // no se encuentra otra vez exactamente con la misma frase.
    advanceVariantCursor(word.id, sentenceVariants.length);
    setUseStage('order'); setOrdered([]); setPoolOrder(shuffleIds(tokenPool.length)); setOrderChecked(null); playNaturalFast(example);
  };
  const nextSentence = () => {
    if (sentenceVariants.length < 2) return;
    const next = (sentenceVariantIndex + 1) % sentenceVariants.length;
    setSentenceVariantIndex(next); saveVariantCursor(word.id, (next + 1) % sentenceVariants.length); setOrdered([]); setPoolOrder(shuffleIds(wordsForSentence(sentenceVariants[next].en).length + 2)); setOrderChecked(null); playNaturalFast(sentenceVariants[next].en);
  };
  const moveToken = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length || from === to) return;
    setOrdered((list) => { const next = [...list]; const [token] = next.splice(from, 1); next.splice(to, 0, token); return next; });
    setOrderChecked(null);
  };
  const checkOrder = () => {
    const correct = normalize(ordered.map((id) => tokenPool[id].text).join(' ')) === normalize(example);
    setOrderChecked(correct);
    if (correct) setUseStage('create');
  };
  const checkOwn = async () => {
    const issues = creativeSentenceIssues(word, ownSentence, example);
    setOwnChecked(true);
    setOwnIssues(issues);
    setOwnReview(null);
    setOwnReviewError(null);
    setOwnAccepted(false);
    if (issues.length) return;

    // La longitud y la palabra objetivo solo demuestran que se intentó el reto.
    // «Correcta» se concede después de revisar gramática, sentido y naturalidad.
    if (!store.aiInfo.enabled) {
      setOwnAccepted(true);
      setOwnReviewError('Has completado el reto, pero la revisión gramatical profunda no está disponible ahora mismo.');
      return;
    }

    setOwnReviewBusy(true);
    try {
      const review = await ai<SentenceReview>('correct', {
        sentence: ownSentence.trim(),
        intended: `Una frase personal distinta que use “${word.en}” con el significado “${word.es}”. No debe copiar la frase modelo “${example}”.`,
        words: [word.en],
        model: store.aiModel,
      });
      setOwnReview(review);
      setOwnAccepted(Boolean(review.correct));
    } catch (error) {
      setOwnReviewError(error instanceof Error ? error.message : 'No he podido revisar la frase. Inténtalo otra vez.');
    } finally {
      setOwnReviewBusy(false);
    }
  };

  const finishUse = () => onDone?.(Math.max(Date.now() - started.current, Date.now() - useStarted.current));

  return (
    <div className={`card word-card ${variant === 'learn' ? 'pop' : ''}`}>
      <div className="spread small">
        <span className="chip">🧠 {KIND_LABEL[word.kind ?? 'keyword']}</span>
        {spot && <span className="spot">📍 {spot}</span>}
        {variant === 'learn' && <span className={`chip ${secs > TARGET_S ? 'doubt' : ''}`}>⏱ {secs}s</span>}
      </div>

      <div className="en" style={{ marginTop: '.4rem' }}>{word.en}</div>
      <div className="es" style={{ margin: '.1rem 0 .6rem' }}>{word.es}</div>

      {/* Un único control de Kokoro: evita dos voces y separa sonido de asociación. */}
      <div className="pron-box">
        <div className="lbl">1 · ESCUCHA EL SONIDO REAL</div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {word.ipa && <span className="chip">{word.ipa}</span>}
          {word.pron_es && <span className="pron">≈ {word.pron_es}</span>}
          <SpeakBtn text={word.en} title="Volver a escuchar" />
        </div>
      </div>

      {/* Truco para recordar */}
      {m ? (
        <div className="trick-box">
          <div className="lbl">2 · CREA LA CONEXIÓN MENTAL</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="small muted">El sonido te lleva a</span>
            <span className="keyword">{m.keyword}</span>
            {soundBadge(m.phon_score)}
          </div>
          {m.image ? <img src={assetUrl(m.image)} alt={m.keyword ?? ''} className="scene-img" loading="lazy" /> : m.emoji && <div className="scene-emoji">{m.emoji}</div>}
          <div className="scene-text"><Rich text={showEn ? m.story_en : m.scene_es} /></div>
          {m.story_en && (
            <button className="btn ghost small" onClick={() => setShowEn((v) => !v)}>{showEn ? '🇪🇸 En español' : '🇬🇧 La escena en inglés'}</button>
          )}
        </div>
      ) : word.hint_es ? (
        <div className="trick-box plain">
          <div className="lbl">2 · {word.kind === 'cognate' ? 'CONEXIÓN CON EL ESPAÑOL' : word.kind === 'easy' ? 'CONEXIÓN POR PIEZAS' : word.kind === 'chunk' ? 'CONEXIÓN CON UNA SITUACIÓN' : word.kind === 'phrasal' ? 'CONEXIÓN CON MOVIMIENTO' : 'CONEXIÓN MENTAL'}</div>
          <div className="scene-text"><Rich text={word.hint_es} /></div>
        </div>
      ) : usesKeyword && !noneChosen ? (
        <div className="trick-box plain"><div className="lbl">2 · CREA LA CONEXIÓN MENTAL</div><div className="scene-text">Relaciona el sonido <b>{word.pron_es || word.en}</b> con una imagen exagerada que signifique <b>{word.es}</b>. Puedes crear una asociación mejor con «No me funciona».</div></div>
      ) : null}

      {m && word.kind === 'irregular' && word.hint_es && <div className="small muted" style={{ marginTop: '.5rem' }}>🔀 {word.hint_es}</div>}

      {/* El ejemplo no aparece automáticamente: primero se fija la asociación. */}
      {useStage === 'memory' && (more || word.kind === 'chunk' || word.kind === 'phrasal') && <Examples word={word} full={variant === 'detail'} />}
      {useStage === 'memory' && !more && variant === 'learn' && word.kind !== 'chunk' && word.kind !== 'phrasal' && word.example_en && (
        <button className="btn ghost small" onClick={() => setMore(true)}>＋ Ver ejemplo</button>
      )}

      {variant === 'learn' && onDone && useStage !== 'memory' && (
        <div className="word-use-flow">
          {useStage === 'order' ? (
            <>
              <div className="word-use-heading"><span className="chip accent">2 · RECONSTRUIR</span><b>Reproduce exactamente la frase modelo</b><span>Hay palabras de sobra. Toca solo las necesarias y colócalas en el orden exacto.</span><small className="muted">Variante {sentenceVariantIndex + 1} de {sentenceVariants.length} · la próxima vez cambiará</small></div>
              <div className="word-order-answer">{ordered.length ? ordered.map((tokenId, i) => <span key={tokenId} className="word-token-drag" draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null) moveToken(dragIndex, i); setDragIndex(null); }}><button className="word-token selected" type="button" onClick={() => setOrdered((list) => list.filter((_, index) => index !== i))} title="Quitar palabra">{tokenPool[tokenId].text}</button></span>) : <span className="muted small">Toca las palabras de abajo para empezar…</span>}</div>
              <div className="word-order-pool">{(poolOrder.length ? poolOrder : tokenPool.map((token) => token.id)).map((id) => { const token = tokenPool[id]; return token && !ordered.includes(token.id) && <button key={token.id} className="word-token" type="button" onClick={() => setOrdered((list) => [...list, token.id])}>{token.text}</button>; })}</div>
              {orderChecked === false && <div className="feedback doubt">🔁 Aún no. Cambia el orden y vuelve a probar.</div>}
              <div className="row"><button className="btn secondary grow" type="button" onClick={() => { setOrdered([]); setDragIndex(null); setOrderChecked(null); }}>Vaciar</button><button className="btn grow" type="button" disabled={ordered.length < exampleWords.length} onClick={checkOrder}>Comprobar orden ↵</button></div>
              {orderChecked === false && <button className="btn ghost small" type="button" onClick={nextSentence}>🔀 Probar otra frase ({sentenceVariantIndex + 1}/{sentenceVariants.length})</button>}
            </>
          ) : (
            <>
              <div className="word-use-heading"><span className="chip accent">3 · CREAR OTRA</span><b>Ahora crea una frase propia</b><span>Ya reconstruiste <q>{example}</q> Ahora escribe una frase diferente y verdadera para ti usando <strong>{word.en}</strong>.</span><small className="muted">Aquí no existe una respuesta modelo: comprobamos tu frase, no la comparamos con la anterior.</small></div>
              <textarea value={ownSentence} onChange={(e) => { setOwnSentence(e.target.value); setOwnChecked(false); setOwnIssues([]); setOwnAccepted(false); setOwnReview(null); setOwnReviewError(null); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !ownAccepted && !ownReviewBusy) { e.preventDefault(); void checkOwn(); } }} placeholder={`Una frase nueva con “${word.en}” · mínimo 5 palabras · Enter`} disabled={ownAccepted || ownReviewBusy} />
              {ownReviewBusy && <div className="feedback doubt"><b>🤖 Revisando tu inglés…</b><span>Compruebo gramática, significado y si suena natural.</span></div>}
              {ownChecked && !ownReviewBusy && ownIssues.length > 0 && <div className="feedback doubt"><b>🔁 Solo falta esto</b><ul className="own-issues">{ownIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
              {ownChecked && !ownReviewBusy && ownIssues.length === 0 && ownReview?.correct && <div className="feedback ok"><b>✅ Suena bien</b><span>{ownReview.explanation_es || `Has usado “${word.en}” correctamente en una idea tuya.`}</span>{ownReview.natural && normalize(ownReview.natural) !== normalize(ownSentence) && <span>Una forma aún más natural: <strong>{ownReview.natural}</strong> <SpeakBtn text={ownReview.natural} /></span>}</div>}
              {ownChecked && !ownReviewBusy && ownIssues.length === 0 && ownReview && !ownReview.correct && <div className="feedback doubt"><b>✏️ Vamos a mejorarla</b><span><Rich text={ownReview.explanation_es || 'La idea se entiende, pero hay que ajustar la frase.'} /></span>{(ownReview.corrected || ownReview.natural) && <span>Prueba así: <strong>{ownReview.corrected || ownReview.natural}</strong> <SpeakBtn text={ownReview.corrected || ownReview.natural} /></span>}<button className="btn secondary small" type="button" onClick={() => { setOwnSentence(ownReview.corrected || ownReview.natural); setOwnChecked(false); setOwnReview(null); setOwnReviewError(null); }}>Usar la corrección y revisarla</button></div>}
              {ownChecked && !ownReviewBusy && ownIssues.length === 0 && ownReviewError && <div className={`feedback ${ownAccepted ? 'doubt' : 'fail'}`}><b>{ownAccepted ? '⚠️ Reto completado sin revisión profunda' : '⚠️ No he podido revisar la frase'}</b><span>{ownReviewError}</span></div>}
              <div className="row"><button className="btn secondary grow" type="button" onClick={() => { setUseStage('order'); setOrdered([]); setOrderChecked(null); }}>← Volver a ordenar</button>{ownAccepted ? <button className="btn grow" type="button" onClick={finishUse}>Siguiente palabra →</button> : <button className="btn grow" type="button" disabled={!ownSentence.trim() || ownReviewBusy} onClick={() => void checkOwn()}>{ownReviewBusy ? 'Revisando…' : 'Comprobar frase ↵'}</button>}</div>
            </>
          )}
        </div>
      )}

      {variant === 'detail' && list.length > 1 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: '.5rem' }}>
          {list.map((x) => (
            <button key={x.id} className={`chip ${x.id === m?.id ? 'primary' : ''}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => apply({ mode: 'auto', mnemonic: x }, 'pick')}>
              {x.source === 'user' ? '✍️' : x.source === 'ai' ? '🤖' : '⭐'} {x.keyword}
            </button>
          ))}
        </div>
      )}

      {variant !== 'compact' && variant !== 'learn' && (
        <div className="row" style={{ marginTop: '.75rem' }}>
          <button className="btn secondary grow" onClick={() => setNotWorking(true)}>😕 No me funciona</button>
        </div>
      )}
      {variant === 'learn' && onDone && useStage === 'memory' && <div className="row" style={{ marginTop: '.75rem' }}><button className="btn secondary grow" onClick={() => setNotWorking(true)}>Cambiar asociación</button><button className="btn big grow" onClick={startUse} autoFocus>Ya la veo · usarla →</button></div>}
      {variant !== 'compact' && m && !m.image && <ImageButton mnemonic={m} onDone={(img) => apply({ mode: 'auto', mnemonic: img }, 'pick')} />}

      {notWorking && (
        <Modal onClose={() => setNotWorking(false)}>
          <NotWorking word={word} current={m} onApply={apply} />
        </Modal>
      )}
    </div>
  );
}

function Examples({ word, full }: { word: Word; full: boolean }) {
  const [list, setList] = useState(word.examples ?? (word.example_en ? [{ en: word.example_en, es: word.example_es ?? '' }] : []));
  useEffect(() => {
    if (!full || (word.examples?.length ?? 0) > 1) return;
    ai<{ examples: { en: string; es: string }[] }>('examples', { word: word.id })
      .then((r) => { if (r.examples.length) setList(r.examples); }).catch(() => {});
  }, [full, word.id, word.examples]);
  if (!list.length) return null;
  return (
    <div className="stack" style={{ gap: '.4rem', marginTop: '.6rem' }}>
      {list.slice(0, full ? 5 : 1).map((ex) => (
        <div key={ex.en} className="example">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><strong>{ex.en}</strong><SpeakBtn text={ex.en} /></div>
          <div className="muted small">{ex.es}</div>
        </div>
      ))}
      {full && list.length > 1 && <div className="small muted">Frases reales de Tatoeba (CC BY)</div>}
    </div>
  );
}

function ImageButton({ mnemonic, onDone }: { mnemonic: Mnemonic; onDone: (m: Mnemonic) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async () => {
    setBusy(true); setError(null);
    try {
      let target = mnemonic;
      if (!mnemonic.owner) {
        target = await items.create<Mnemonic>('mnemonics', { word: mnemonic.word, source: 'user', keyword: mnemonic.keyword, scene_es: mnemonic.scene_es, story_en: mnemonic.story_en, emoji: mnemonic.emoji, phon_score: mnemonic.phon_score, focus: mnemonic.focus });
      }
      const { image } = await ai<{ image: string }>('image', { mnemonic: target.id });
      onDone({ ...target, image });
      toast('🖼️ Imagen creada');
    } catch (e) { setError(e); } finally { setBusy(false); }
  };
  return (
    <div className="stack" style={{ marginTop: '.5rem' }}>
      <button className="btn secondary small" disabled={busy} onClick={run}>{busy ? '⏳ Dibujando (hasta 1 min)…' : '🖼️ Dibujar la escena (gratis)'}</button>
      <ErrorBox error={error} />
    </div>
  );
}

/** «No me funciona»: otra asociación, crear la mía o seguir sin mnemotecnia. */
function NotWorking({ word, current, onApply }: { word: Word; current: Mnemonic | null; onApply: (c: MnemonicChoice, action: 'another' | 'own' | 'none') => void }) {
  const store = useStore();
  const [tab, setTab] = useState<'menu' | 'another' | 'own'>('menu');
  const [proposal, setProposal] = useState<Mnemonic | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const tried = useRef<string[]>((store.mnemonicCache.get(word.id) ?? []).map((x) => x.keyword ?? '').filter(Boolean));

  const another = async () => {
    setTab('another'); setBusy(true); setError(null); setProposal(null);
    try {
      const out = await ai<Mnemonic>('keyword', { word: word.id, model: store.aiModel, avoid: tried.current });
      if (!isConciseMnemonic(out)) throw new Error('La propuesta era demasiado larga. Pide otra y Memora la reducirá.');
      tried.current.push(out.keyword ?? '');
      setProposal(out);
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  if (tab === 'own') return <OwnKeyword word={word} onSaved={(mn) => onApply({ mode: 'auto', mnemonic: mn }, 'own')} onBack={() => setTab('menu')} />;

  if (tab === 'another') {
    return (
      <div className="stack">
        <h2 style={{ margin: 0 }}>🤖 Otra asociación para «{word.en}»</h2>
        {busy && <><Spinner /><p className="center small muted">Buscando palabras que suenen como su sílaba fuerte…</p></>}
        {proposal && (
          <div className="trick-box">
            <div className="row" style={{ justifyContent: 'center' }}><span className="keyword">{proposal.keyword}</span>{soundBadge(proposal.phon_score)}</div>
            {proposal.emoji && <div className="scene-emoji">{proposal.emoji}</div>}
            <div className="scene-text"><Rich text={proposal.scene_es} /></div>
          </div>
        )}
        <ErrorBox error={error} />
        <div className="row">
          <button className="btn secondary grow" disabled={busy} onClick={another}>🎲 Otra más</button>
          <button className="btn grow" disabled={!proposal} onClick={() => onApply({ mode: 'auto', mnemonic: proposal }, 'another')}>Usar esta</button>
        </div>
        <button className="btn ghost" onClick={() => setTab('menu')}>← Volver</button>
      </div>
    );
  }

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>😕 «{word.en}» no te funciona</h2>
      <p className="small muted" style={{ margin: 0 }}>Es normal: una asociación sirve si a ti te dice algo. Elige qué hacer{current ? ` con «${current.keyword}»` : ''}:</p>
      <button className="choice-row" onClick={store.aiInfo.enabled ? another : () => setTab('own')}>
        <b>🤖 Otra asociación</b><span className="small muted">{store.aiInfo.enabled ? 'La IA propone otra palabra puente que suene igual.' : 'Necesita la IA (falta la clave): te muestro candidatas para crear la tuya.'}</span>
      </button>
      <button className="choice-row" onClick={() => setTab('own')}>
        <b>✍️ Crear la mía</b><span className="small muted">Las que inventas tú se recuerdan mejor. Te ayudo con palabras que suenan parecido.</span>
      </button>
      <button className="choice-row" onClick={() => onApply({ mode: 'none', mnemonic: null }, 'none')}>
        <b>➡️ Seguir sin mnemotecnia</b><span className="small muted">La aprendes a pelo, con repetición. También medimos qué funciona mejor para ti.</span>
      </button>
    </div>
  );
}

/** Crear la asociación propia con medidor fonético en directo. */
function OwnKeyword({ word, onSaved, onBack }: { word: Word; onSaved: (m: Mnemonic) => void; onBack: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [scene, setScene] = useState('');
  const [cands, setCands] = useState<{ word: string; score: number; noun: boolean }[] | null>(null);
  const [focus, setFocus] = useState('');
  const [error, setError] = useState<unknown>(null);
  const phones = useMemo(() => englishPhones(word), [word]);
  const sc = keyword.trim() && phones.length ? scoreKeyword(phones, keyword) : null;
  const sceneWords = mnemonicWordCount(scene);

  useEffect(() => {
    ai<{ candidates: { word: string; score: number; noun: boolean }[]; focus: string }>('candidates', { word: word.id })
      .then((r) => { setCands(r.candidates); setFocus(r.focus); }).catch(() => setCands([]));
  }, [word.id]);

  const save = async () => {
    try {
      const m = await items.create<Mnemonic>('mnemonics', {
        word: word.id, source: 'user', keyword: keyword.trim().toUpperCase(), scene_es: scene, emoji: '✍️',
        phon_score: sc?.score ?? null, focus: sc?.focusText ?? null,
      });
      onSaved(m);
    } catch (e) { setError(e); }
  };

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>✍️ Tu asociación para «{word.en}»</h2>
      <div className="small">Suena <b>{word.pron_es}</b>{focus && <> · sílaba fuerte <b>«{focus}»</b></>}. <SpeakBtn text={word.en} /></div>
      <ol className="small muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
        <li>Busca una palabra española <b>que suene</b> como la sílaba fuerte.</li>
        <li>Que se pueda <b>ver</b>: un objeto, un animal o un personaje.</li>
        <li>Una sola acción donde esa palabra <b>haga</b> «{word.es}». Máximo 14 palabras.</li>
      </ol>
      {cands === null ? <Spinner /> : cands.length > 0 && (
        <div className="row">{cands.map((c) => (
          <button key={c.word} className="chip" style={{ border: 0, cursor: 'pointer' }} onClick={() => setKeyword(c.word)}>
            {c.word} {Math.round(c.score * 100)}%{c.noun ? ' 🖼️' : ''}
          </button>
        ))}</div>
      )}
      <label className="field">Palabra puente
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Ej.: FOGATA" />
      </label>
      {sc && (
        <div className={`feedback ${sc.verdict === 'good' ? 'ok' : sc.verdict === 'weak' ? 'doubt' : 'fail'}`}>
          {sc.verdict === 'good' ? '✅ Suena bien' : sc.verdict === 'weak' ? '🤏 Se parece poco' : '❌ No suena como la palabra inglesa'} · {Math.round(sc.score * 100)}%
        </div>
      )}
      <label className="field">Tu escena (una imagen)
        <textarea value={scene} maxLength={120} onChange={(e) => setScene(e.target.value)} placeholder={word.en === 'hang' ? 'JUAN CUELGA tu mochila.' : 'Una acción corta: palabra puente + significado.'} />
      </label>
      <div className={`small ${sceneWords > 14 ? 'fail-text' : 'muted'}`}>{sceneWords}/14 palabras</div>
      <ErrorBox error={error} />
      <div className="row">
        <button className="btn ghost" onClick={onBack}>← Volver</button>
        <button className="btn grow" disabled={!keyword.trim() || !scene.trim() || sceneWords > 14} onClick={save}>
          {sc?.verdict === 'bad' ? 'Guardar igualmente' : 'Guardar mi asociación'}
        </button>
      </div>
    </div>
  );
}
