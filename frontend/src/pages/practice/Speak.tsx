import { useMemo, useState } from 'react';
import { ErrorBox, shuffle, SpeakBtn } from '../../components/common';
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
  const [error, setError] = useState<unknown>(null);
  const w = list[i];

  if (!learned.length) return <div className="stack"><BackHeader title="🎤 Pronunciación" /><NeedsWords /></div>;
  if (!canListen()) return (
    <div className="stack"><BackHeader title="🎤 Pronunciación" />
      <div className="card">Tu navegador no tiene reconocimiento de voz. Prueba con <b>Chrome</b> (ordenador o Android) o Safari reciente.</div></div>
  );
  if (!w) return <div className="stack"><BackHeader title="🎤 Pronunciación" /><div className="card center"><b>¡Tanda terminada!</b></div></div>;

  const target = sentences && w.example_en ? w.example_en : w.en;
  // De las alternativas que reconoce el navegador, la que más se parece a lo que querías decir
  const bestHeard = heard?.length ? heard.reduce((b, h) => (sentenceScore(h, target) > sentenceScore(b, target) ? h : b), heard[0]) : '';

  const rec = async () => {
    setError(null); setHeard(null); setListening(true);
    try {
      const alts = await listen().promise;
      setHeard(alts);
      const sc = Math.max(0, ...alts.map((h) => sentenceScore(h, target)));
      store.logAttempts([{ word: w.id, study_day: store.progress.get(w.id)?.study_day ?? null, step: null, kind: 'practice', mode: 'speak', result: sc >= 0.85 ? 'ok' : sc >= 0.5 ? 'doubt' : 'fail', ms: 0, hours_since_learned: null }]);
    } catch (e) { setError(e); } finally { setListening(false); }
  };

  return (
    <div className="stack">
      <BackHeader title="🎤 Pronunciación" subtitle="Escucha, repite y el micrófono comprueba si se te entiende." />
      <label className="row small"><input type="checkbox" checked={sentences} onChange={(e) => { setSentences(e.target.checked); setHeard(null); }} /> Frases completas</label>
      <span className="small muted">{i + 1}/{list.length}</span>
      <div className="card stack center">
        <div className="big-prompt" style={{ fontSize: sentences ? '1.4rem' : undefined }}>{target}</div>
        <div className="muted">{sentences ? w.example_es : `${w.es} · ${w.pron_es ?? ''}`}</div>
        <div className="row" style={{ justifyContent: 'center' }}><SpeakBtn text={target} /><SpeakBtn text={target} slow /></div>
        <button className={`btn big ${listening ? 'fail' : ''}`} onClick={rec} disabled={listening}>{listening ? '🔴 Escuchando…' : '🎤 Pulsa y habla'}</button>
        {heard && (heard.length ? <>
          <div className="small muted">He oído: «{bestHeard}»</div>
          <SentenceDiff given={bestHeard} expected={target} />
        </> : <div className="feedback fail">🔁 No he oído nada. Prueba otra vez, más cerca del micrófono.</div>)}
        <ErrorBox error={error} />
        <button className="btn secondary" onClick={() => { setI(i + 1); setHeard(null); }}>Siguiente →</button>
      </div>
    </div>
  );
}
