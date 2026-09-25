import { useEffect, useState } from 'react';
import { shuffle } from '../../components/common';
import { speak } from '../../lib/speech';
import type { Word } from '../../types';
import { BackHeader, NeedsWords, useLearnedWords } from './shared';

const SECONDS = 60;
const PAIRS = 6;

interface Tile { key: string; word: Word; side: 'en' | 'es' }

export function Match() {
  const learned = useLearnedWords();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [pick, setPick] = useState<Tile | null>(null);
  const [gone, setGone] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem('memora.matchBest') || 0); } catch { return 0; } });

  const deal = () => {
    const ws = shuffle(learned.slice(0, 150)).slice(0, PAIRS);
    setTiles(shuffle(ws.flatMap((w) => [{ key: `en${w.id}`, word: w, side: 'en' as const }, { key: `es${w.id}`, word: w, side: 'es' as const }])));
    setGone(new Set()); setPick(null);
  };
  const start = () => { setScore(0); setLeft(SECONDS); setPlaying(true); deal(); };

  useEffect(() => {
    if (!playing) return;
    if (left <= 0) {
      setPlaying(false);
      if (score > best) { setBest(score); try { localStorage.setItem('memora.matchBest', String(score)); } catch { /* nada */ } }
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [playing, left, score, best]);

  const tap = (t: Tile) => {
    if (!playing || gone.has(t.word.id)) return;
    if (!pick) { setPick(t); if (t.side === 'en') speak(t.word.en); return; }
    if (pick.key === t.key) { setPick(null); return; }
    if (pick.word.id === t.word.id && pick.side !== t.side) {
      const next = new Set(gone).add(t.word.id);
      setGone(next); setScore((s) => s + 1); setPick(null);
      if (next.size === PAIRS) setTimeout(deal, 250);
    } else {
      setWrong(t.key); setPick(null); setTimeout(() => setWrong(null), 350);
    }
  };

  if (learned.length < PAIRS) return <div className="stack"><BackHeader title="⚡ Contrarreloj" /><NeedsWords /></div>;

  return (
    <div className="stack">
      <BackHeader title="⚡ Contrarreloj" subtitle={`Empareja inglés y español lo más rápido posible. Récord: ${best}`} />
      {!playing ? (
        <div className="card center stack">
          {left <= 0 && <h2>🏁 {score} parejas</h2>}
          <button className="btn big" onClick={start}>{left <= 0 ? 'Otra vez' : '¡Empezar!'}</button>
        </div>
      ) : (
        <>
          <div className="spread"><span className="chip primary timer">⏱️ {left}s</span><b>{score} ✅</b></div>
          <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {tiles.map((t) => (
              <button key={t.key} className={`choice ${pick?.key === t.key ? 'ok' : ''} ${wrong === t.key ? 'fail' : ''}`}
                style={{ visibility: gone.has(t.word.id) ? 'hidden' : 'visible', fontSize: '.95rem' }} onClick={() => tap(t)}>
                {t.side === 'en' ? t.word.en : t.word.es}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
