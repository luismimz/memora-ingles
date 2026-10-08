import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { InteractiveEnglishText } from '../components/InteractiveEnglishText';
import { ErrorBox, ProgressBar, Spinner, toast } from '../components/common';
import { normalize } from '../lib/answer';
import { playNaturalAudio, prefetchNaturalAudio, stopNaturalAudio, type AudioTiming } from '../lib/audioPlayer';
import { afterExam } from '../lib/srs';
import { ai, items } from '../lib/api';
import { useStore } from '../store';
import type { Mnemonic, Result } from '../types';

const SCENE_ES = 'Un BURRO te PIDE PRESTADO el móvil para llamar a su madre.';
const SCENE_EN = 'A donkey borrows your phone to call its mother.';
const EXAMPLE = 'Can I borrow your charger for a minute?';
const CHUNKS = 'Can I... borrow... your charger... for a minute?';
const STUDY_RATE = 0.88;
const SLOW_RATE = 0.70;
const COMPLETION_KEY = 'memora.h1-perfect-word-complete';

const STEPS = ['Escuchar', 'Asociar', 'Recuperar', 'Escena inglesa', 'Estructura', 'Ordenar', 'Transformar', 'Crear', 'Recordar', 'Resultado'];
const ORDER_POOL = ['charger', 'for', 'Can', 'really', 'minute', 'borrow', 'your', 'a', 'I', 'do'];

type AudioState = 'idle' | 'loading' | 'playing' | 'error';
interface SentenceReview { correct: boolean; corrected: string; explanation_es: string; natural: string; score: number }

export function PerfectWord() {
  const store = useStore();
  const word = store.words.find((candidate) => candidate.en.toLowerCase() === 'borrow');
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [audioError, setAudioError] = useState<unknown>(null);
  const [timings, setTimings] = useState<AudioTiming[]>([]);
  const [mnemonicRating, setMnemonicRating] = useState('');
  const [ratingNote, setRatingNote] = useState('');
  const [ownKeyword, setOwnKeyword] = useState('');
  const [ownScene, setOwnScene] = useState('');
  const [recall, setRecall] = useState('');
  const [recallCorrect, setRecallCorrect] = useState<boolean | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [orderCorrect, setOrderCorrect] = useState<boolean | null>(null);
  const [replacement, setReplacement] = useState('phone');
  const [transformation, setTransformation] = useState('');
  const [transformCorrect, setTransformCorrect] = useState<boolean | null>(null);
  const [ownSentence, setOwnSentence] = useState('');
  const [ownCorrect, setOwnCorrect] = useState<boolean | null>(null);
  const [ownReview, setOwnReview] = useState<SentenceReview | null>(null);
  const [ownReviewBusy, setOwnReviewBusy] = useState(false);
  const [sceneRecall, setSceneRecall] = useState('');
  const [sceneCorrect, setSceneCorrect] = useState<boolean | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const startedAt = useRef(Date.now());

  const mnemonic = word ? store.preferredMnemonic(word.id) : null;
  const expectedTransformation = `Can I borrow your ${replacement} for a minute?`;
  const finished = step === STEPS.length - 1;
  const pool = useMemo(() => [...ORDER_POOL].sort(() => Math.random() - .5), []);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => { window.clearInterval(timer); stopNaturalAudio(); };
  }, []);

  useEffect(() => {
    if (!word) return;
    store.mnemonicsFor([word.id]).catch(() => {});
  }, [word?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Promise.allSettled([
      prefetchNaturalAudio('borrow', STUDY_RATE),
      prefetchNaturalAudio('borrow', SLOW_RATE),
      prefetchNaturalAudio(SCENE_EN, STUDY_RATE),
      prefetchNaturalAudio(EXAMPLE, STUDY_RATE),
      prefetchNaturalAudio(CHUNKS, SLOW_RATE),
    ]).catch(() => {});
  }, []);

  const play = async (text: string, rate = STUDY_RATE) => {
    setAudioState('loading'); setAudioError(null);
    try {
      const timing = await playNaturalAudio(text, { rate });
      setTimings((current) => [...current, timing]);
      setAudioState('playing');
      return timing;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return null;
      setAudioState('error'); setAudioError(e); throw e;
    }
  };

  useEffect(() => {
    if (step === 0) play('borrow').catch(() => {});
    if (step === 3) play(SCENE_EN).catch(() => {});
    if (step === 4) play(EXAMPLE).catch(() => {});
    window.scrollTo({ top: 0, behavior: step === 0 ? 'auto' : 'smooth' });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordRating = async (action: string) => {
    if (!word) return;
    setMnemonicRating(action);
    setRatingNote(action === 'remember' ? 'Perfecto: conservaremos esta asociación.' : action === 'confusing' ? 'Queda marcada para mejorarla después de la prueba.' : action === 'sound' ? 'Queda registrado que BURRO no te acerca bien al sonido.' : action === 'another' ? 'No generaremos nada durante la lección. Prepararemos otra opción fuera de la sesión.' : 'Escribe una asociación que funcione para ti.');
    items.create('mnemonic_feedback', { word: word.id, mnemonic: mnemonic?.id ?? null, action }).catch(() => {});
  };

  const saveOwnMnemonic = async () => {
    if (!word || !ownKeyword.trim() || !ownScene.trim()) return;
    try {
      const saved = await items.create<Mnemonic>('mnemonics', { word: word.id, source: 'user', keyword: ownKeyword.trim().toUpperCase(), scene_es: ownScene.trim(), story_en: SCENE_EN, emoji: '✍️' });
      store.addMnemonic(saved); setMnemonicRating('own-saved'); setRatingNote('Tu asociación queda guardada y tendrá prioridad en tus repasos.');
      toast('✅ Tu asociación se ha guardado');
    } catch (e) { setError(e); }
  };

  const checkRecall = () => {
    const correct = normalize(recall) === 'borrow';
    setRecallCorrect(correct);
  };

  const checkOrder = () => {
    const correct = normalize(ordered.join(' ')) === normalize(EXAMPLE);
    setOrderCorrect(correct);
  };

  const checkTransformation = () => setTransformCorrect(normalize(transformation) === normalize(expectedTransformation));

  const checkOwn = async () => {
    const answer = normalize(ownSentence);
    const attempted = answer.split(' ').filter(Boolean).length >= 5 && answer.split(' ').includes('borrow') && answer !== normalize(EXAMPLE) && answer !== normalize(expectedTransformation);
    setOwnReview(null);
    setError(null);
    if (!attempted) { setOwnCorrect(false); return; }
    if (!store.aiInfo.enabled) { setOwnCorrect(true); return; }
    setOwnReviewBusy(true);
    try {
      const review = await ai<SentenceReview>('correct', {
        sentence: ownSentence.trim(),
        intended: `Una frase personal que use “borrow” con el significado “pedir o tomar prestado”, distinta de “${EXAMPLE}”.`,
        words: ['borrow'],
        model: store.aiModel,
      });
      setOwnReview(review);
      setOwnCorrect(Boolean(review.correct));
    } catch (reviewError) {
      setOwnCorrect(null);
      setError(reviewError);
    } finally { setOwnReviewBusy(false); }
  };

  const checkScene = () => {
    const answer = normalize(sceneRecall);
    const hits = ['burro', 'movil', 'madre', 'prestado', 'llamar'].filter((keyword) => answer.includes(keyword)).length;
    setSceneCorrect(hits >= 2);
  };

  const finish = async () => {
    if (!word || finishing) return;
    setFinishing(true); setError(null);
    try {
      const day = await store.startToday();
      const totalMs = Date.now() - startedAt.current;
      const result: Result = recallCorrect && orderCorrect && transformCorrect && ownCorrect && sceneCorrect && !hintUsed ? 'ok' : 'doubt';
      const attemptMs = Math.max(1, Math.round(totalMs / 5));
      store.logAttempts([
        { word: word.id, study_day: day.day, step: null, kind: 'practice', mode: 'h1_recall', result: recallCorrect ? (hintUsed ? 'doubt' : 'ok') : 'fail', ms: attemptMs, hours_since_learned: null, mnemonic: mnemonic?.id ?? null, hints: hintUsed ? 1 : 0 },
        { word: word.id, study_day: day.day, step: null, kind: 'practice', mode: 'h1_order', result: orderCorrect ? 'ok' : 'fail', ms: attemptMs, hours_since_learned: null, mnemonic: mnemonic?.id ?? null, hints: 0 },
        { word: word.id, study_day: day.day, step: null, kind: 'practice', mode: 'h1_transform', result: transformCorrect ? 'ok' : 'fail', ms: attemptMs, hours_since_learned: null, mnemonic: mnemonic?.id ?? null, hints: 0 },
        { word: word.id, study_day: day.day, step: null, kind: 'practice', mode: 'h1_production', result: ownCorrect ? 'ok' : 'fail', ms: attemptMs, hours_since_learned: null, mnemonic: mnemonic?.id ?? null, hints: 0 },
        { word: word.id, study_day: day.day, step: null, kind: 'practice', mode: 'h1_scene_recall', result: sceneCorrect ? 'ok' : 'fail', ms: attemptMs, hours_since_learned: null, mnemonic: mnemonic?.id ?? null, hints: 0 },
      ]);
      await items.create('sentences', { kind: 'mine', en: ownSentence.trim(), es: null, words: ['borrow'], score: 100, favorite: false });
      await items.create('pilot_reports', {
        data: {
          hito: 'H1', word: 'borrow', total_ms: totalMs, hint_used: hintUsed,
          recall: recallCorrect, order: orderCorrect, transformation: transformCorrect,
          own_sentence: ownCorrect, scene_recall: sceneCorrect,
          audio: timings.map((timing) => ({ cached: timing.cached, request_ms: timing.requestMs, start_ms: timing.startMs, total_ms: timing.totalMs, rate: timing.rate })),
        },
        ratings: { mnemonic: mnemonicRating || 'not-rated' },
        comment: 'Prueba automática de Una palabra perfecta',
      });
      const now = new Date().toISOString();
      const existing = store.progress.get(word.id);
      const saved = existing
        ? await store.saveProgress(word.id, { last_seen: now, mnemonic: mnemonic?.id ?? existing.mnemonic, mnemonic_mode: 'auto' })
        : await store.saveProgress(word.id, { ...afterExam(result, totalMs), study_day: day.day, last_seen: now, mnemonic: mnemonic?.id ?? null, mnemonic_mode: 'auto' });
      setDueAt(saved.due_at);
      try { localStorage.setItem(COMPLETION_KEY, JSON.stringify({ at: now, seconds: Math.round(totalMs / 1000), result })); } catch { /* almacenamiento opcional */ }
      setStep(STEPS.length - 1);
    } catch (e) { setError(e); }
    finally { setFinishing(false); }
  };

  const next = () => { stopNaturalAudio(); setStep((current) => Math.min(current + 1, STEPS.length - 1)); };
  const reset = () => {
    stopNaturalAudio(); startedAt.current = Date.now(); setElapsed(0); setStep(0); setRecall(''); setRecallCorrect(null); setHintUsed(false); setOrdered([]); setOrderCorrect(null); setTransformation(''); setTransformCorrect(null); setOwnSentence(''); setOwnCorrect(null); setSceneRecall(''); setSceneCorrect(null); setDueAt(null); setTimings([]);
  };

  if (!word) return <div className="stack center h1-missing"><h1>No encuentro “borrow”</h1><p className="muted">El contenido del día 1 debe cargarse antes de abrir esta prueba.</p><Link className="btn" to="/">Volver al inicio</Link></div>;

  const averageAudio = timings.length ? Math.round(timings.reduce((sum, timing) => sum + timing.totalMs, 0) / timings.length) : 0;

  return (
    <div className="perfect-word-page">
      <header className="perfect-word-topbar">
        <Link to="/" className="btn ghost small">← Salir</Link>
        <div className="h1-progress grow"><div className="spread small"><b>{finished ? 'Misión completada' : STEPS[step]}</b><span>{step + 1}/{STEPS.length}</span></div><ProgressBar value={step + 1} max={STEPS.length} /></div>
        <span className="h1-timer">⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
      </header>

      <main className="perfect-word-stage">
        {step === 0 && <section className="h1-card h1-listen pop"><span className="h1-orb">🔊</span><span className="eyebrow">PRIMERO, SOLO EL SONIDO</span><h1>Escucha. ¿Qué palabra crees que es?</h1><p>No hace falta acertar todavía. Tu oído entra antes que el texto.</p><AudioControl state={audioState} label="Escuchar otra vez" onPlay={() => play('borrow')} onSlow={() => play('borrow', SLOW_RATE)} /><ErrorBox error={audioError} /><button className="btn big" onClick={next}>Descubrir la palabra →</button></section>}

        {step === 1 && <section className="h1-card pop"><span className="eyebrow">SONIDO → IMAGEN → SIGNIFICADO</span><div className="h1-word"><h1>borrow</h1><button className="icon-btn" onClick={() => play('borrow')} aria-label="Escuchar borrow">🔊</button><button className="icon-btn" onClick={() => play('borrow', SLOW_RATE)} aria-label="Escuchar borrow despacio">🐢</button></div><div className="h1-meaning">pedir prestado <span>/ˈbɑːroʊ/ · BÁ-rou</span></div><img className="h1-scene-image" src="/images/mnemonics/borrow-donkey-phone-h1-v1.jpg" alt="Un burro pide prestado un móvil para llamar a su madre" /><div className="h1-scene-copy" aria-label={SCENE_ES}>Un <strong>BURRO</strong> te <strong>PIDE PRESTADO</strong> el móvil para llamar a su madre.</div><div className="mnemonic-feedback"><b>¿Esta imagen te lleva a “borrow”?</b><div className="feedback-grid"><button className={mnemonicRating === 'remember' ? 'selected' : ''} onClick={() => recordRating('remember')}>✅ Se me queda</button><button className={mnemonicRating === 'confusing' ? 'selected' : ''} onClick={() => recordRating('confusing')}>😐 Confusa</button><button className={mnemonicRating === 'sound' ? 'selected' : ''} onClick={() => recordRating('sound')}>🔊 No se parece</button><button className={mnemonicRating === 'another' ? 'selected' : ''} onClick={() => recordRating('another')}>✨ Crear otra</button><button className={mnemonicRating.startsWith('own') ? 'selected' : ''} onClick={() => recordRating('own')}>✍️ Escribir la mía</button></div>{ratingNote && <div className="feedback ok">{ratingNote}</div>}{mnemonicRating === 'own' && <div className="own-mnemonic"><input value={ownKeyword} onChange={(event) => setOwnKeyword(event.target.value)} placeholder="Tu palabra puente" /><textarea value={ownScene} onChange={(event) => setOwnScene(event.target.value)} placeholder="Tu escena breve y visual" /><button className="btn secondary" disabled={!ownKeyword.trim() || !ownScene.trim()} onClick={saveOwnMnemonic}>Guardar mi asociación</button></div>}</div><button className="btn big block" disabled={!mnemonicRating || mnemonicRating === 'own'} onClick={next}>Ocultar y recordar →</button></section>}

        {step === 2 && <section className="h1-card h1-recall pop"><span className="eyebrow">RECUPERACIÓN ACTIVA</span><div className="memory-ghost">🫏 <span>pide prestado tu móvil</span></div><h1>¿Qué palabra inglesa escondía la escena?</h1><form onSubmit={(event) => { event.preventDefault(); checkRecall(); }} className="stack"><input className="answer-input" autoFocus value={recall} onChange={(event) => { setRecall(event.target.value); setRecallCorrect(null); }} placeholder="Escribe la palabra…" />{hintUsed && recallCorrect === null && <div className="hint-line">Empieza por <b>B</b> · 6 letras · suena aproximadamente “BÁ-rou”.</div>}{recallCorrect !== null && <div className={`feedback ${recallCorrect ? 'ok' : 'fail'}`}>{recallCorrect ? <>✅ La has recuperado{hintUsed ? ' con ayuda' : ' sin verla'}.</> : <>Todavía no: vuelve del <b>BURRO</b> al sonido <b>BÁ-rou</b>.</>}</div>}<div className="row">{recallCorrect !== true && <button type="button" className="btn secondary" onClick={() => setHintUsed(true)}>💡 Necesito una pista</button>}<button className="btn grow" disabled={!recall.trim()} type="submit">Comprobar ↵</button></div></form>{recallCorrect && <button className="btn big block" onClick={next}>Ver la escena en inglés →</button>}</section>}

        {step === 3 && <section className="h1-card pop"><span className="eyebrow">LA MISMA PELÍCULA, AHORA EN INGLÉS</span><img className="h1-scene-image compact" src="/images/mnemonics/borrow-donkey-phone-h1-v1.jpg" alt="El burro habla por el móvil prestado" /><div className="h1-english-scene">A donkey <strong>borrows</strong> your phone to call its mother.</div><AudioControl state={audioState} label="Repetir escena" onPlay={() => play(SCENE_EN)} onSlow={() => play(SCENE_EN, SLOW_RATE)} /><p className="muted">No es una historia nueva: estás poniendo inglés sobre una imagen que ya recuerdas.</p><button className="btn big block" onClick={next}>Usarla en una frase real →</button></section>}

        {step === 4 && <section className="h1-card pop"><span className="eyebrow">UNA ESTRUCTURA QUE PODRÁS REUTILIZAR</span><InteractiveEnglishText text={EXAMPLE} /><AudioControl state={audioState} label="Repetir frase" onPlay={() => play(EXAMPLE)} onSlow={() => play(CHUNKS, SLOW_RATE)} /><div className="structure-builder"><span>Can I</span><span className="target">borrow</span><span>your charger</span><span>for a minute?</span></div><div className="structure-legend"><span>petición</span><span>acción</span><span>objeto</span><span>tiempo</span></div><p>La estructura no termina en esta frase. En el siguiente paso tendrás que reconstruirla.</p><button className="btn big block" onClick={next}>Reconstruir sin copiar →</button></section>}

        {step === 5 && <section className="h1-card pop"><span className="eyebrow">ORDENA · HAY TRES PALABRAS DE SOBRA</span><h1>Construye la frase que acabas de oír</h1><div className="h1-order-answer">{ordered.length ? ordered.map((token, index) => <button key={`${token}-${index}`} className="word-token selected" onClick={() => { setOrdered((current) => current.filter((_, i) => i !== index)); setOrderCorrect(null); }}>{token}</button>) : <span className="muted">Toca las palabras en orden…</span>}</div><div className="h1-order-pool">{pool.map((token) => <button key={token} className={`word-token ${ordered.includes(token) ? 'used' : ''}`} disabled={ordered.includes(token)} onClick={() => { setOrdered((current) => [...current, token]); setOrderCorrect(null); }}>{token}</button>)}</div>{orderCorrect !== null && <div className={`feedback ${orderCorrect ? 'ok' : 'fail'}`}>{orderCorrect ? '✅ Has construido la estructura completa.' : '🔁 Algunas palabras sobran o están en otra posición. Puedes tocar arriba para quitarlas.'}</div>}<div className="row"><button className="btn secondary" onClick={() => { setOrdered([]); setOrderCorrect(null); }}>Vaciar</button><button className="btn grow" disabled={!ordered.length} onClick={checkOrder}>Comprobar</button></div>{orderCorrect && <button className="btn big block" onClick={next}>Cambiar una pieza →</button>}</section>}

        {step === 6 && <section className="h1-card pop"><span className="eyebrow">TRANSFORMA · NO REPITAS</span><h1>Cambia <em>charger</em> por otro objeto</h1><div className="replacement-options">{['phone', 'pen', 'car'].map((object) => <button key={object} className={replacement === object ? 'selected' : ''} onClick={() => { setReplacement(object); setTransformation(''); setTransformCorrect(null); }}>{object}</button>)}</div><p className="small muted">Escribe la frase completa con <strong>{replacement}</strong>. Enter comprueba.</p><form onSubmit={(event) => { event.preventDefault(); checkTransformation(); }} className="stack"><input className="answer-input" autoFocus value={transformation} onChange={(event) => { setTransformation(event.target.value); setTransformCorrect(null); }} placeholder={`Can I borrow your ${replacement}…`} />{transformCorrect !== null && <div className={`feedback ${transformCorrect ? 'ok' : 'fail'}`}>{transformCorrect ? <>✅ Acabas de demostrar que entiendes el patrón.<button type="button" className="icon-btn" onClick={() => play(expectedTransformation)}>🔊</button></> : <>Revisa las cuatro piezas: <b>Can I + borrow + objeto + for a minute?</b></>}</div>}<button className="btn block" disabled={!transformation.trim()} type="submit">Comprobar ↵</button></form>{transformCorrect && <button className="btn big block" onClick={next}>Ahora una frase que sea tuya →</button>}</section>}

        {step === 7 && <section className="h1-card pop"><span className="eyebrow">PRODUCCIÓN PERSONAL</span><h1>Usa <em>borrow</em> para decir algo verdadero o útil para ti</h1><p>No copies el cargador ni el objeto anterior. Puedes pedir una chaqueta, dinero, una herramienta, un libro…</p><form onSubmit={(event) => { event.preventDefault(); void checkOwn(); }} className="stack"><textarea autoFocus value={ownSentence} disabled={ownReviewBusy || ownCorrect === true} onChange={(event) => { setOwnSentence(event.target.value); setOwnCorrect(null); setOwnReview(null); setError(null); }} placeholder="Escribe al menos cinco palabras · Enter para comprobar" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !ownReviewBusy) { event.preventDefault(); void checkOwn(); } }} />{ownReviewBusy && <div className="feedback doubt">🤖 Revisando gramática, significado y naturalidad…</div>}{ownCorrect === false && !ownReview && <div className="feedback fail">Necesitas usar <em>borrow</em>, escribir al menos cinco palabras y crear una idea diferente.</div>}{ownReview && <div className={`feedback ${ownReview.correct ? 'ok' : 'doubt'}`}><b>{ownReview.correct ? '✅ Suena bien' : '✏️ Vamos a mejorarla'}</b><span>{ownReview.explanation_es}</span>{!ownReview.correct && (ownReview.corrected || ownReview.natural) && <><span>Prueba así: <strong>{ownReview.corrected || ownReview.natural}</strong></span><button type="button" className="btn secondary small" onClick={() => { setOwnSentence(ownReview.corrected || ownReview.natural); setOwnReview(null); setOwnCorrect(null); }}>Usar la corrección y revisarla</button></>}</div>}{ownCorrect === true && !ownReview && <div className="feedback doubt">⚠️ Has completado el reto, pero la revisión gramatical profunda no está disponible.</div>}<button className="btn block" type="submit" disabled={!ownSentence.trim() || ownReviewBusy || ownCorrect === true}>{ownReviewBusy ? 'Revisando…' : 'Comprobar ↵'}</button><ErrorBox error={error} /></form>{ownCorrect && <button className="btn big block" onClick={next}>Última prueba de memoria →</button>}</section>}

        {step === 8 && <section className="h1-card pop"><span className="eyebrow">RECUPERACIÓN FINAL · LA IMAGEN YA NO ESTÁ</span><h1>¿Qué pasaba en la escena de <em>borrow</em>?</h1><p>Cuéntala con tus palabras. No necesitas escribirla exactamente igual; recupera al menos los elementos importantes.</p><textarea autoFocus value={sceneRecall} onChange={(event) => { setSceneRecall(event.target.value); setSceneCorrect(null); }} placeholder="Recuerdo que…" />{sceneCorrect !== null && <div className={`feedback ${sceneCorrect ? 'ok' : 'fail'}`}>{sceneCorrect ? '✅ La escena sigue en tu memoria sin verla.' : '💡 Busca quién aparecía, qué pedía prestado o para qué lo quería.'}</div>}<div className="row"><button className="btn secondary" onClick={() => { setHintUsed(true); toast('Pista: el personaje era un animal que suena como borrow.'); }}>💡 Pista</button><button className="btn grow" disabled={!sceneRecall.trim()} onClick={checkScene}>Comprobar</button></div>{sceneCorrect && <button className="btn big block" disabled={finishing} onClick={finish}>{finishing ? 'Guardando progreso…' : 'Completar misión →'}</button>}<ErrorBox error={error} /></section>}

        {finished && <section className="h1-card h1-result pop"><div className="result-burst">✓</div><span className="eyebrow">PRIMERA PALABRA APRENDIDA CON EL MÉTODO COMPLETO</span><h1>No solo has visto <em>borrow</em>. La has recuperado y usado.</h1><div className="result-grid"><div><strong>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</strong><span>tiempo real</span></div><div><strong>{hintUsed ? '1' : '0'}</strong><span>pistas usadas</span></div><div><strong>{timings.length}</strong><span>audios reproducidos</span></div><div><strong>{averageAudio ? `${averageAudio} ms` : '—'}</strong><span>latencia media</span></div></div><div className="h1-proof"><span>🧠</span><div><b>Tu prueba de aprendizaje</b><p>Recordaste la palabra, ordenaste la estructura, la transformaste, creaste una frase y recuperaste la escena sin verla.</p></div></div><div className="next-review"><b>Próxima comprobación</b><span>{dueAt ? new Date(dueAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'programada por tu calendario de memoria'}</span></div><div className="row"><button className="btn secondary grow" onClick={reset}>Repetir la prueba</button><Link className="btn grow" to="/">Volver a Hoy →</Link></div></section>}
      </main>
    </div>
  );
}

function AudioControl({ state, label, onPlay, onSlow }: { state: AudioState; label: string; onPlay: () => unknown; onSlow: () => unknown }) {
  return <div className="audio-control"><button type="button" className="btn secondary grow" disabled={state === 'loading'} onClick={onPlay}>{state === 'loading' ? <><Spinner /> Preparando…</> : `🔊 ${label}`}</button><button type="button" className="btn ghost" disabled={state === 'loading'} onClick={onSlow}>🐢 Más lento</button>{state === 'playing' && <span className="audio-live">● sonando</span>}</div>;
}
