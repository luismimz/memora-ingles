import { useEffect, useState } from 'react';
import { ProgressBar, shuffle } from '../../components/common';
import { speak } from '../../lib/speech';
import { isDue, isLeech } from '../../lib/srs';
import type { Progress, Word } from '../../types';
import { useStore } from '../../store';
import { BackHeader, NeedsWords, useLearnedWords } from './shared';

const SECONDS = 60;
const PAIRS = 6;

interface Tile { key: string; word: Word; side: 'en' | 'es' }

const ROUND_KEY = 'memora.match.lastRound';
function readRoundIds(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROUND_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x): x is number => Number.isInteger(x)) : [];
  } catch { return []; }
}
function saveRoundIds(ids: number[]) {
  try { localStorage.setItem(ROUND_KEY, JSON.stringify(ids)); } catch { /* almacenamiento opcional */ }
}

export function Match() {
  const learned = useLearnedWords();
  const { progress, wordById } = useStore();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [pick, setPick] = useState<Tile | null>(null);
  const [gone, setGone] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem('memora.matchBest') || 0); } catch { return 0; } });
  const priorityCount = [...progress.values()].filter((p) => p.status !== 'known' && (isDue(p) || isLeech(p))).length;

  const deal = () => {
    const previous = readRoundIds();
    const records = [...progress.values()]
      .map((p) => { const word = wordById.get(p.word); return word ? { p, word } : null; })
      .filter((x): x is { p: Progress; word: Word } => x !== null && x.p.status !== 'known' && Boolean(x.p.learned_at));
    const urgency = (x: { p: Progress; word: Word }) => (isDue(x.p) ? 100 : 0) + (isLeech(x.p) ? 45 : 0) + (x.p.status === 'learning' ? 20 : 0) + Math.max(0, 10 - x.p.step);
    const byPriority = (a: { p: Progress; word: Word }, b: { p: Progress; word: Word }) => urgency(b) - urgency(a) || (Date.parse(a.p.last_seen ?? a.p.learned_at ?? '') - Date.parse(b.p.last_seen ?? b.p.learned_at ?? ''));
    const fresh = records.filter((x) => !previous.includes(x.word.id)).sort(byPriority);
    const old = records.filter((x) => previous.includes(x.word.id)).sort(byPriority);
    const selected = [...fresh, ...old].slice(0, PAIRS).map((x) => x.word);
    const ws = shuffle(selected.length >= PAIRS ? selected : learned.filter((w) => !previous.includes(w.id)).slice(0, PAIRS));
    setTiles(shuffle(ws.flatMap((w) => [{ key: `en${w.id}`, word: w, side: 'en' as const }, { key: `es${w.id}`, word: w, side: 'es' as const }])));
    setGone(new Set()); setPick(null);
    saveRoundIds(ws.map((w) => w.id));
  };
  const start = () => { setScore(0); setCombo(0); setLeft(SECONDS); setPlaying(true); deal(); };

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
      setGone(next); setScore((s) => s + 1); setCombo((s) => s + 1); setPick(null);
      if (next.size === PAIRS) setTimeout(deal, 250);
    } else {
      setWrong(t.key); setCombo(0); setPick(null); setTimeout(() => setWrong(null), 350);
    }
  };

  if (learned.length < PAIRS) return <div className="stack"><BackHeader title="🌧️ Lluvia de parejas" /><NeedsWords /></div>;

  return (
    <div className="stack">
      <BackHeader title="🌧️ Lluvia de parejas" subtitle={`Repaso adaptativo: primero aparecen ${priorityCount ? `${priorityCount} palabras pendientes o rebeldes` : 'las palabras que aún no están automatizadas'}. Récord personal: ${best} parejas.`} />
      {!playing ? (
        <div className="card center stack">
          {left <= 0 && <><h2>🏁 {score} parejas</h2><p className="muted">{score >= best && score > 0 ? '¡Nuevo récord! La próxima lluvia empieza con este objetivo.' : `Tu récord sigue en ${best}.`}</p></>}
          <button className="btn big" onClick={start}>{left <= 0 ? 'Otra lluvia' : '¡Empezar!'}</button>
        </div>
      ) : (
        <>
          <div className="match-hud"><div><span className={`chip primary timer ${left < 15 ? 'urgent' : ''}`}>⏱️ {left}s</span><span className="match-combo">{combo > 1 ? `🔥 x${combo} racha` : 'Encuentra tu pareja'}</span></div><b>{score} ✅ · récord {best}</b></div>
          <ProgressBar value={SECONDS - left} max={SECONDS} />
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
