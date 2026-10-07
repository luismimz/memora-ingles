import { useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBox, playNaturalFast, shuffle } from '../../components/common';
import { sentenceScore } from '../../lib/answer';
import { canListen, listen } from '../../lib/speech';
import { useStore } from '../../store';
import { BackHeader, NeedsWords, useLearnedWords } from './shared';
import { SentenceDiff } from '../../components/SentenceDiff';

export function Speak() {
  const store = useStore();
  const learned = useLearnedWords();
  const [sentences, setSentences] = useState(false);
  const list = useMemo(() => shuffle(learned.slice(0, 60)).slice(0, 15), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState<string[] | null>(null);
  const [listening, setListening] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const played = useRef('');
  const w = list[i];
  const target = sentences && w?.example_en ? w.example_en : w?.en;

  // Al comenzar cada tarjeta la voz se reproduce sola. El botón de audio queda
  // fuera del flujo principal para que el alumno pueda concentrarse en hablar.
  useEffect(() => {
    if (!started || !w || !target || heard || listening) return;
    const key = `${i}-${sentences}`;
    if (played.current === key) return;
    played.current = key;
    return playNaturalFast(target);
  }, [started, i, sentences, target, heard, listening, w]);

  if (!learned.length) return <div className="stack"><BackHeader title="🎤 Pronunciación" /><NeedsWords /></div>;
  if (!canListen()) return <div className="stack"><BackHeader title="🎤 Pronunciación" /><div className="card">Tu navegador no tiene reconocimiento de voz. Prueba con <b>Chrome</b> (ordenador o Android) o Safari reciente.</div></div>;

  const start = () => { setI(0); setHeard(null); setError(null); played.current = ''; setStarted(true); };
  if (!w) return <div className="stack"><BackHeader title="🎤 Pronunciación" /><div className="card center stack"><div style={{ fontSize: '2.5rem' }}>🏁</div><b>¡Tanda terminada!</b><span className="muted small">Has escuchado, hablado y comprobado {list.length} tarjetas.</span><button className="btn" onClick={start}>Repetir ronda</button></div></div>;

  const bestHeard = heard?.length ? heard.reduce((b, h) => (sentenceScore(h, target!) > sentenceScore(b, target!) ? h : b), heard[0]) : '';
  const rec = async () => {
    setError(null); setHeard(null); setListening(true);
    try {
      const alts = await listen().promise;
      setHeard(alts);
      const sc = Math.max(0, ...alts.map((h) => sentenceScore(h, target!)));
      store.logAttempts([{ word: w.id, study_day: store.progress.get(w.id)?.study_day ?? null, step: null, kind: 'practice', mode: 'speak', result: sc >= 0.85 ? 'ok' : sc >= 0.5 ? 'doubt' : 'fail', ms: 0, hours_since_learned: null }]);
    } catch (e) { setError(e); } finally { setListening(false); }
  };
  const advance = () => { setI((n) => n + 1); setHeard(null); setError(null); };

  return (
    <div className="stack">
      <BackHeader title="🎤 Pronunciación" subtitle="La voz reproduce cada tarjeta automáticamente. Tú hablas, confirmas el resultado y la ronda continúa." />
      <label className="row small"><input type="checkbox" checked={sentences} onChange={(e) => { setSentences(e.target.checked); setHeard(null); played.current = ''; }} /> Frases completas</label>
      {!started ? <div className="card center stack pronunciation-start"><div style={{ fontSize: '2.8rem' }}>🎧 → 🎤 → ✅</div><h2 style={{ margin: 0 }}>Ronda automática</h2><p className="muted" style={{ margin: 0 }}>Memora reproducirá cada frase, tú hablarás y después confirmarás para pasar a la siguiente. Sin perseguir botones.</p><button className="btn big" onClick={start}>▶️ Empezar ronda</button></div> : <><span className="small muted">{i + 1}/{list.length}</span><div className="card stack center"><div className="big-prompt" style={{ fontSize: sentences ? '1.4rem' : undefined }}>{target}</div><div className="muted">{sentences ? w.example_es : `${w.es} · ${w.pron_es ?? ''}`}</div>{!heard && <div className="auto-listen-status">🔊 Escucha automática · después habla</div>}{heard === null && <button className={`btn big ${listening ? 'fail' : ''}`} onClick={rec} disabled={listening}>{listening ? '🔴 Escuchando…' : '🎤 Hablar ahora'}</button>}{heard && (heard.length ? <><div className="small muted">He oído: «{bestHeard}»</div><SentenceDiff given={bestHeard} expected={target} /><button className="btn big" onClick={advance}>{i + 1 >= list.length ? '✅ Confirmar y terminar' : '✅ Confirmar y continuar →'}</button></> : <><div className="feedback fail">🔁 No he oído nada. Acércate al micrófono y prueba otra vez.</div><button className="btn" onClick={() => setHeard(null)}>🎤 Repetir intento</button></>)}<ErrorBox error={error} /></div></>}</div>
  );
}
