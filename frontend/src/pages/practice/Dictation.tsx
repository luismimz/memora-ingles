import { useMemo, useState } from 'react';
import { shuffle } from '../../components/common';
import { SentenceDiff } from '../../components/SentenceDiff';
import { sentenceScore } from '../../lib/answer';
import { speak } from '../../lib/speech';
import { useStore } from '../../store';
import { BackHeader, NeedsWords, useLearnedWords } from './shared';

export function Dictation() {
  const store = useStore();
  const learned = useLearnedWords();
  const list = useMemo(() => shuffle(learned.filter((w) => w.example_en)).slice(0, 10), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const w = list[i];

  if (!learned.length) return <div className="stack"><BackHeader title="🎧 Dictado" /><NeedsWords /></div>;
  if (!w) {
    return (
      <div className="stack">
        <BackHeader title="🎧 Dictado" />
        <div className="card center stack"><div style={{ fontSize: '2.5rem' }}>🎧</div><b>Media: {Math.round((total / Math.max(list.length, 1)) * 100)}%</b>
          <button className="btn" onClick={() => location.reload()}>Otra tanda</button></div>
      </div>
    );
  }

  const check = () => {
    const sc = sentenceScore(answer, w.example_en!);
    setScore(sc); setTotal((t) => t + sc);
    store.logAttempts([{ word: w.id, study_day: store.progress.get(w.id)?.study_day ?? null, step: null, kind: 'practice', mode: 'dictation', result: sc >= 0.85 ? 'ok' : sc >= 0.5 ? 'doubt' : 'fail', ms: 0, hours_since_learned: null }]);
  };

  return (
    <div className="stack">
      <BackHeader title="🎧 Dictado" subtitle="Escucha frases reales con tus palabras y escríbelas. Entrena el oído para entenderlas en una conversación." />
      <span className="small muted">{i + 1}/{list.length}</span>
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn big secondary" onClick={() => speak(w.example_en!)}>🔊 Escuchar</button>
          <button className="btn ghost" onClick={() => speak(w.example_en!, { rate: 0.6 })}>🐢 Despacio</button>
        </div>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Escribe lo que oyes…" readOnly={score !== null} autoCapitalize="sentences" style={{ minHeight: 70 }} />
        {score === null ? (
          <button className="btn" disabled={!answer.trim()} onClick={check}>Comprobar</button>
        ) : (
          <>
            <SentenceDiff given={answer} expected={w.example_en!} spanish={w.example_es} />
            <button className="btn" autoFocus onClick={() => { setI(i + 1); setAnswer(''); setScore(null); }}>Siguiente →</button>
          </>
        )}
      </div>
    </div>
  );
}
