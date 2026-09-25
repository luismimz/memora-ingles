import { useEffect, useMemo, useRef, useState } from 'react';
import { checkAnswer, makeCloze } from '../lib/answer';
import { gradeByTime } from '../lib/srs';
import { speak } from '../lib/speech';
import { useStore } from '../store';
import type { Mnemonic, Mode, Result, Word } from '../types';
import { ProgressBar, Rich, shuffle, SpeakBtn } from './common';
import { ExposureCard } from './ExposureCard';

export interface QuizItem { word: Word; mode: Mode }
export interface QuizSummary { ok: number; doubt: number; fail: number; total: number; failedWords: Word[]; hinted: number }
/** retry = repetición final de una fallada · rescue = mini-reto tras fallar. Ninguno cuenta para medir retención. */
export interface AnswerMeta { retry: boolean; rescue: boolean; hints: number; mnemonic: number | null }

interface Props {
  items: QuizItem[];
  /** Palabras para distractores en las preguntas de elegir. */
  pool: Word[];
  onAnswer: (item: QuizItem, result: Result, ms: number, meta: AnswerMeta) => void;
  onDone: (s: QuizSummary) => void;
  retryFailed?: boolean;
  title?: string;
}

const MODE_LABEL: Record<Mode, string> = {
  es_en_type: '✍️ Escribe en inglés',
  en_es_choice: '👉 Elige el significado',
  listen_type: '👂 Escucha y escribe',
  cloze: '🧩 Completa la frase',
  flash: '⚡ ¿La recuerdas?',
  rescue_keyword: '🛟 Reto de rescate: la palabra puente',
  rescue_sound: '🛟 Reto de rescate: del truco a la palabra',
};
const TYPED: Mode[] = ['es_en_type', 'listen_type', 'cloze'];
const MAX_HINTS = 3;

type QItem = QuizItem & { retry: boolean; rescue: boolean };

/**
 * Cola de preguntas. Si fallas:
 *  1) retos de rescate inmediatos (¿qué palabra puente era? → ¿a qué palabra inglesa te lleva?),
 *  2) y la pregunta vuelve al final de la cola hasta acertarla.
 * En las preguntas escritas hay pistas por escalones: aciertas igualmente, pero cuenta como «con ayuda».
 */
export function QuizRunner({ items, pool, onAnswer, onDone, retryFailed = true, title }: Props) {
  const store = useStore();
  const [queue, setQueue] = useState<QItem[]>(() => items.map((i) => ({ ...i, retry: false, rescue: false })));
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [hints, setHints] = useState(0);
  const [feedback, setFeedback] = useState<{ result: Result; typo: boolean; given: string } | null>(null);
  const [summary, setSummary] = useState<QuizSummary>({ ok: 0, doubt: 0, fail: 0, total: items.length, failedWords: [], hinted: 0 });
  const started = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const current = queue[idx];
  const summaryRef = useRef(summary);
  summaryRef.current = summary;
  const autoSpeak = Boolean(store.profile?.auto_speak);
  const mn: Mnemonic | null = current ? store.activeMnemonic(current.word.id) : null;

  useEffect(() => {
    if (!current) return;
    started.current = Date.now();
    setAnswer(''); setRevealed(false); setFeedback(null); setHints(0);
    if (current.mode === 'listen_type' || current.mode === 'en_es_choice') setTimeout(() => speak(current.word.en), 200);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [idx, current]);

  // Opciones para las preguntas de elegir (distractores del mismo "pool")
  const choices = useMemo(() => {
    if (!current) return [];
    const others = (n: number, ok: (w: Word) => boolean) => shuffle(pool.filter((w) => w.id !== current.word.id && ok(w))).slice(0, n);
    if (current.mode === 'en_es_choice') return shuffle([current.word, ...others(3, (w) => w.es !== current.word.es)]).map((w) => ({ id: w.id, label: w.es }));
    if (current.mode === 'rescue_sound') return shuffle([current.word, ...others(2, (w) => !w.en.includes(' ') === !current.word.en.includes(' '))]).map((w) => ({ id: w.id, label: w.en }));
    if (current.mode === 'rescue_keyword') {
      const own = mn?.keyword ?? '';
      const kws = shuffle([...store.mnemonicCache.values()].flat().map((x) => x.keyword ?? '').filter((k) => k && k !== own));
      return shuffle([own, ...[...new Set(kws)].slice(0, 2)]).map((k) => ({ id: k === own ? current.word.id : -Math.random(), label: k }));
    }
    return [];
  }, [current, pool]); // eslint-disable-line react-hooks/exhaustive-deps

  const cloze = useMemo(() => (current?.mode === 'cloze' ? makeCloze(current.word.example_en, current.word.en) : null), [current]);

  if (!current) return null;
  const { word } = current;
  const mode: Mode = current.mode === 'cloze' && !cloze ? 'es_en_type' : current.mode;

  const finish = (result: Result, typo = false, given = '') => {
    const ms = Date.now() - started.current;
    onAnswer(current, result, ms, { retry: current.retry, rescue: current.rescue, hints, mnemonic: mn?.id ?? null });
    if (!current.retry && !current.rescue) {
      setSummary((s) => ({ ...s, [result]: s[result] + 1, hinted: s.hinted + (hints > 0 ? 1 : 0), failedWords: result === 'fail' ? [...s.failedWords, word] : s.failedWords }));
    }
    if (result === 'fail' && retryFailed && !current.rescue) {
      const rescue: QItem[] = [
        ...(mn?.keyword ? [{ word, mode: 'rescue_keyword' as Mode, retry: false, rescue: true }] : []),
        { word, mode: 'rescue_sound' as Mode, retry: false, rescue: true },
      ];
      setQueue((q) => [...q.slice(0, idx + 1), ...rescue, ...q.slice(idx + 1), { word, mode: TYPED.includes(current.mode) ? current.mode : 'es_en_type', retry: true, rescue: false }]);
    }
    setFeedback({ result, typo, given });
    if (result !== 'fail' && autoSpeak) speak(word.en);
  };

  const submitTyped = () => {
    if (feedback) return next();
    const { correct, typo } = checkAnswer(answer, word.en, 'en');
    // Con pistas se acierta igual, pero cuenta como «con ayuda» (media nota en las estadísticas).
    finish(correct && hints > 0 ? 'doubt' : gradeByTime(correct, Date.now() - started.current), typo, answer);
  };
  const next = () => {
    if (idx + 1 >= queue.length) { onDone(summaryRef.current); return; }
    setIdx((i) => i + 1);
  };

  const mainDone = queue.slice(0, idx + (feedback ? 1 : 0)).filter((q) => !q.retry && !q.rescue).length;
  const extra = queue.length - items.length;

  return (
    <div className="stack">
      <div className="spread">
        <span className="chip primary">{title ?? MODE_LABEL[mode]}</span>
        <span className="small muted">{mainDone}/{items.length}{extra > 0 ? ` · 🛟 ${extra}` : ''}</span>
      </div>
      <ProgressBar value={idx + (feedback ? 1 : 0)} max={queue.length} />

      <div className="card stack pop" key={`${idx}-${word.id}-${mode}`}>
        {current.retry && <span className="chip fail" style={{ alignSelf: 'center' }}>🔁 Otra vez: esta se te resistió</span>}
        <div className="center small muted">{MODE_LABEL[mode]}</div>

        {mode === 'es_en_type' && <div className="big-prompt">{word.es}{word.pos && <div className="small muted">({word.pos})</div>}</div>}
        {mode === 'listen_type' && (
          <div className="center"><button className="btn big secondary" onClick={() => speak(word.en)}>🔊 Escuchar</button>
            <button className="btn ghost" onClick={() => speak(word.en, { rate: 0.6 })}>🐢 despacio</button></div>
        )}
        {mode === 'cloze' && cloze && (
          <div className="center">
            <div className="big-prompt" style={{ fontSize: '1.4rem' }}>{cloze}</div>
            <div className="muted">{word.example_es}</div>
          </div>
        )}
        {mode === 'en_es_choice' && <div className="center"><div className="big-prompt">{word.en}</div><SpeakBtn text={word.en} /></div>}
        {mode === 'flash' && <div className="big-prompt">{word.es}</div>}
        {mode === 'rescue_keyword' && <div className="big-prompt" style={{ fontSize: '1.4rem' }}>¿Qué palabra puente usabas para «{word.es}»?</div>}
        {mode === 'rescue_sound' && (
          <div className="big-prompt" style={{ fontSize: '1.4rem' }}>
            {mn?.keyword ? <>🧠 <span className="keyword">{mn.keyword}</span> te lleva a…</> : <>«{word.es}» en inglés es…</>}
            {!mn?.keyword && word.hint_es && <div className="small muted" style={{ marginTop: 6 }}><Rich text={word.hint_es} /></div>}
          </div>
        )}

        {/* Pistas por escalones (solo preguntas escritas) */}
        {TYPED.includes(mode) && hints > 0 && !feedback && <Hints word={word} mnemonic={mn} level={hints} />}

        {TYPED.includes(mode) && (
          <form onSubmit={(e) => { e.preventDefault(); submitTyped(); }} className="stack">
            <input ref={inputRef} type="text" className={`answer-input ${feedback ? (feedback.result === 'fail' ? 'fail' : 'ok') : ''}`}
              value={answer} onChange={(e) => setAnswer(e.target.value)} readOnly={!!feedback}
              autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} placeholder="Escribe en inglés…" />
            {!feedback && (
              <div className="row">
                <button type="button" className="btn secondary" onClick={() => finish('fail')}>🤷</button>
                <button type="button" className="btn secondary grow" disabled={hints >= MAX_HINTS}
                  onClick={() => { setHints((h) => h + 1); inputRef.current?.focus(); }}>💡 Pista {hints > 0 ? `(${hints}/${MAX_HINTS})` : ''}</button>
                <button type="submit" className="btn grow" disabled={!answer.trim()}>Comprobar</button>
              </div>
            )}
          </form>
        )}

        {(mode === 'en_es_choice' || mode === 'rescue_keyword' || mode === 'rescue_sound') && (
          <div className="choice-grid" style={mode !== 'en_es_choice' ? { gridTemplateColumns: '1fr' } : undefined}>
            {choices.map((c) => {
              const cls = feedback ? (c.id === word.id ? 'ok' : feedback.given === String(c.id) ? 'fail' : '') : '';
              return (
                <button key={`${c.id}-${c.label}`} className={`choice ${cls}`} disabled={!!feedback}
                  onClick={() => { if (mode === 'rescue_sound') speak(c.label); finish(c.id === word.id ? gradeByTime(true, Date.now() - started.current, 7000) : 'fail', false, String(c.id)); }}>
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        {mode === 'flash' && !feedback && (
          !revealed ? <button className="btn big" onClick={() => { setRevealed(true); speak(word.en); }}>Mostrar respuesta</button> : (
            <div className="stack center">
              <div className="big-prompt" style={{ color: 'var(--primary)' }}>{word.en}</div>
              <div className="row">
                <button className="btn fail grow" onClick={() => finish('fail')}>No</button>
                <button className="btn doubt grow" onClick={() => finish('doubt')}>Dudé</button>
                <button className="btn ok grow" onClick={() => finish('ok')}>¡Sí!</button>
              </div>
            </div>
          )
        )}

        {feedback && (
          <>
            <div className={`feedback ${feedback.result}`}>
              {feedback.result === 'ok' && (feedback.typo ? `✅ ¡Bien! (se escribe «${word.en}»)` : '✅ ¡Correcto!')}
              {feedback.result === 'doubt' && (hints > 0 ? `💡 Correcto con ayuda → «${word.en}»` : `🤔 Correcto, pero has tardado: aún no es automática → «${word.en}»`)}
              {feedback.result === 'fail' && (current.rescue ? <>Era <b>{mode === 'rescue_keyword' ? mn?.keyword : word.en}</b></> : <>❌ Era <b>{word.en}</b> = {word.es}</>)}
            </div>
            {feedback.result === 'fail' && !current.rescue ? <ExposureCard word={word} variant="compact" /> : <MiniHint word={word} mnemonic={mn} />}
            {feedback.result === 'fail' && !current.rescue && <p className="small muted center" style={{ margin: 0 }}>Ahora 1-2 mini-retos para reforzar el camino sonido → imagen → palabra.</p>}
            <button className="btn big block" autoFocus onClick={next}>{idx + 1 >= queue.length ? 'Terminar' : 'Siguiente →'}</button>
          </>
        )}
      </div>
    </div>
  );
}

function Hints({ word, mnemonic, level }: { word: Word; mnemonic: Mnemonic | null; level: number }) {
  const first = word.en.split(' ').map((w) => w[0] + ' _'.repeat(Math.max(w.length - 1, 0))).join('   ');
  return (
    <div className="stack" style={{ gap: '.35rem' }}>
      <div className="hint-line">1️⃣ <span className="letters">{first}</span> <span className="small muted">({word.en.replace(/ /g, '').length} letras)</span></div>
      {level >= 2 && <div className="hint-line">2️⃣ {mnemonic?.keyword ? <>Truco: suena como <b>{mnemonic.keyword}</b></> : word.hint_es ? <Rich text={word.hint_es} /> : <>Suena ≈ <b>{word.pron_es}</b></>}</div>}
      {level >= 3 && <div className="hint-line">3️⃣ {mnemonic ? <>{mnemonic.emoji} <Rich text={mnemonic.scene_es} /></> : <>Se pronuncia ≈ <b>{word.pron_es}</b> <SpeakBtn text={word.en} /></>}</div>}
    </div>
  );
}

function MiniHint({ word, mnemonic }: { word: Word; mnemonic: Mnemonic | null }) {
  return (
    <div className="center small">
      <div className="row" style={{ justifyContent: 'center' }}>
        <b style={{ fontSize: '1.2rem' }}>{word.en}</b> <span className="muted">≈ {word.pron_es}</span> <SpeakBtn text={word.en} />
      </div>
      {mnemonic && <div className="muted">🧠 truco: {mnemonic.emoji} <b>{mnemonic.keyword}</b></div>}
    </div>
  );
}
