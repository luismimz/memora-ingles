import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl, items, naturalSpeech } from '../lib/api';
import { ErrorBox, Rich, SpeakBtn, shuffle } from '../components/common';
import { sentenceScore } from '../lib/answer';
import { structureFor } from '../data/structures';
import { useStore } from '../store';
import type { ChallengeScore, Mnemonic } from '../types';

export type ChallengeMode = 'hub' | 'scramble' | 'story' | 'listen' | 'image';

const BEST_KEY = 'memora.challengeBest';
const readBest = (mode: string) => { try { return Number(JSON.parse(localStorage.getItem(BEST_KEY) || '{}')[mode] || 0); } catch { return 0; } };
const saveBest = (mode: string, score: number) => { try { const all = JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); all[mode] = Math.max(Number(all[mode] || 0), score); localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch { /* almacenamiento opcional */ } };

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="challenge-heading"><div><span className="eyebrow">MEMORA · JUEGA Y RECUPERA</span><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div><Link className="btn ghost" to="/desafios">← Desafíos</Link></div>;
}

function ChallengeCard({ to, icon, title, description, tag, color }: { to: string; icon: string; title: string; description: string; tag: string; color: string }) {
  return <Link to={to} className={`card challenge-card ${color}`}><span className="challenge-icon">{icon}</span><div><span className="chip">{tag}</span><h2>{title}</h2><p>{description}</p><strong>Jugar ahora →</strong></div></Link>;
}

function Hub() {
  const { words, progress, currentDay } = useStore();
  const [ranking, setRanking] = useState<ChallengeScore[]>([]);
  useEffect(() => { items.list<ChallengeScore>('challenge_scores', { fields: '*', sort: '-score', limit: 8 }).then(setRanking).catch(() => setRanking([])); }, []);
  const learned = words.filter((w) => progress.get(w.id)?.status !== undefined && progress.get(w.id)?.status !== 'known').length;
  return <div className="stack">
    <div className="challenge-hero"><div><span className="eyebrow light">EL IDIOMA TIENE QUE SALIR DE TI</span><h1>🎮 Desafíos Memora</h1><p>Partidas cortas para transformar lo que recuerdas en algo que puedes reconocer, escribir y decir.</p><div className="row"><span className="path-xp">⚡ {learned} unidades activas</span><span className="path-streak">🧭 Día {currentDay}</span></div></div><div className="challenge-hero-art">🏆<span>Reto familiar</span></div></div>
    <div className="card stack"><div className="spread"><div><span className="eyebrow">ELIGE UNA HABILIDAD</span><h2 style={{ margin: '.2rem 0 0' }}>Una partida, una victoria pequeña</h2></div><span className="chip primary">Mejor marca local</span></div><div className="challenge-grid">
      <ChallengeCard to="/desafios/ordenar" icon="🧩" title="Ordena la frase" tag="Estructuras" color="challenge-teal" description="Te damos palabras de más. Construye la frase y descubre dónde encaja cada pieza." />
      <ChallengeCard to="/desafios/historias" icon="🧠" title="Rescata la historia" tag="Mnemotecnia" color="challenge-purple" description="Ve la escena absurda, recupera la palabra y vuelve a contar su uso en inglés." />
      <ChallengeCard to="/desafios/listening" icon="🎧" title="Listening oculto" tag="Oído + dictado" color="challenge-orange" description="Escucha una frase real sin verla, escríbela y comprueba qué has captado." />
      <ChallengeCard to="/desafios/imagen" icon="🖼️" title="Imagen → palabra" tag="Producción" color="challenge-blue" description="Mira una imagen o asociación, di qué es en inglés y deja que la respuesta salga de ti." />
    </div></div>
    <div className="card challenge-family"><div className="challenge-family-icon">👨‍👩‍👧‍👦</div><div className="grow"><b>Reta a tu familia</b><p className="small muted">Tus mejores marcas se guardan en este dispositivo. El siguiente paso es activar cuentas y un grupo familiar para comparar puntos sin perder el progreso individual.</p></div><span className="chip">Preparado para ranking</span></div>
    <div className="card library-note"><span>🎬</span><div><b>Historias, canciones y cine</b><p className="small" style={{ margin: 0 }}>En la Biblioteca podrás abrir historias, y en Contenido real añadir enlaces oficiales, escuchar y guardar tus propias frases. Memora no copia letras completas: trabaja con fragmentos breves y notas que tú eliges.</p><div className="row"><Link to="/biblioteca" className="text-link">Ir a la biblioteca →</Link><Link to="/contenido-real" className="text-link">Añadir canción o película →</Link></div></div></div>
    <div className="card stack"><div className="spread"><div><span className="eyebrow">COMPETICIÓN SANA</span><h2 style={{ margin: '.2rem 0 0' }}>🏆 Ranking de desafíos</h2></div><span className="small muted">Mejor puntuación</span></div>{ranking.length ? ranking.map((r, n) => <div className="ranking-row" key={r.id}><span className="ranking-position">{n + 1}</span><b className="grow">{r.display_name || 'Alumno Memora'}</b><span className="small muted">{r.game}</span><strong>{r.score}/{r.total}</strong></div>) : <div className="small muted">Aún no hay marcas compartidas. Termina una partida para inaugurar el ranking.</div>}</div>
  </div>;
}

async function recordScore(game: string, score: number, total: number, displayName: string | null | undefined) {
  try { await items.create('challenge_scores', { display_name: displayName || 'Alumno Memora', game, score, total, accuracy: total ? score / total : 0, seconds: 0 }); } catch { /* permite jugar aunque el esquema aún no se haya actualizado */ }
}

interface ScrambleItem { es: string; en: string; extra: string[] }
function Scramble() {
  const { currentDay, user } = useStore();
  const structure = structureFor(currentDay);
  const items = useMemo<ScrambleItem[]>(() => {
    const base = structure.ladder.slice(1).map(([es, en]) => ({ es, en, extra: ['really', 'actually'] }));
    return base.slice(0, 5);
  }, [structure]);
  const [i, setI] = useState(0); const [picked, setPicked] = useState<string[]>([]); const [checked, setChecked] = useState<boolean | null>(null); const [score, setScore] = useState(0); const [best, setBest] = useState(() => readBest('scramble'));
  const item = items[i];
  const tokens = useMemo(() => item ? shuffle([...item.en.split(' '), ...item.extra.slice(0, i % 2 + 1)]) : [], [item, i]);
  const check = () => { const ok = picked.join(' ') === item.en; setChecked(ok); if (ok) setScore((s) => s + 1); };
  const next = () => { if (i + 1 >= items.length) { const final = score + (checked ? 1 : 0); saveBest('scramble', final); recordScore('Ordena la frase', final, items.length, user?.first_name); setBest(Math.max(best, final)); } setI((n) => n + 1); setPicked([]); setChecked(null); };
  if (!item) return <div className="stack"><Header title="🧩 Ordena la frase" /><div className="card center stack"><div style={{ fontSize: '3rem' }}>🏁</div><h2>Has construido {score} frases</h2><p className="muted">Mejor marca: {best}. Vuelve a intentarlo intentando hablar cada frase en voz alta.</p><Link className="btn" to="/desafios">Elegir otro desafío</Link></div></div>;
  return <div className="stack"><Header title="🧩 Ordena la frase" subtitle="No traduzcas palabra a palabra. Piensa en el patrón y prueba la estructura completa." /><div className="spread"><span className="chip primary">{i + 1}/{items.length}</span><span className="chip">🏆 Mejor: {best}</span></div><div className="card stack challenge-game-card"><span className="eyebrow">PISTA EN ESPAÑOL</span><h2>{item.es}</h2><div className="sentence-slots">{picked.length ? picked.map((t, n) => <button key={`${t}-${n}`} className="sentence-slot" onClick={() => { setPicked((p) => p.filter((_, j) => j !== n)); setChecked(null); }}>{t}</button>) : <span className="muted">Toca las palabras en orden…</span>}</div><div className="word-bank">{tokens.map((t, n) => <button key={`${t}-${n}`} className={`word-token ${picked.includes(t) ? 'used' : ''}`} disabled={picked.includes(t) || checked !== null} onClick={() => { setPicked((p) => [...p, t]); setChecked(null); }}>{t}</button>)}</div>{checked === null ? <button className="btn" disabled={!picked.length} onClick={check}>Comprobar</button> : <div className={`feedback ${checked ? 'ok' : 'fail'}`}><b>{checked ? '✅ Exacto' : '💡 Casi'}</b><div>{item.en}</div><SpeakBtn text={item.en} natural /></div>}{checked !== null && <button className="btn secondary" onClick={next}>{i + 1 === items.length ? 'Ver resultado' : 'Siguiente →'}</button>}</div></div>;
}

function StoryRecall() {
  const store = useStore();
  const { mnemonicsFor } = store;
  const learned = useMemo(() => store.words.filter((w) => store.progress.get(w.id)?.status !== undefined && store.progress.get(w.id)?.status !== 'known').slice(0, 30), [store.words, store.progress]);
  const [mnemonics, setMnemonics] = useState<Map<number, Mnemonic[]>>(new Map()); const [i, setI] = useState(0); const [choice, setChoice] = useState<string | null>(null); const [score, setScore] = useState(0); const [busy, setBusy] = useState(true); const [best, setBest] = useState(() => readBest('story'));
  useEffect(() => { setBusy(true); mnemonicsFor(learned.map((w) => w.id), { fill: true }).then(setMnemonics).finally(() => setBusy(false)); }, [mnemonicsFor, learned]);
  const word = learned[i]; const mnemonic = word ? (mnemonics.get(word.id)?.[0] || null) : null; const options = useMemo(() => word ? shuffle([word.en, ...shuffle(learned.filter((w) => w.id !== word.id)).slice(0, 3).map((w) => w.en)]) : [], [word, learned]);
  if (busy) return <div className="stack"><Header title="🧠 Rescata la historia" /><div className="card center">Preparando tus asociaciones…</div></div>;
  if (!word) return <div className="stack"><Header title="🧠 Rescata la historia" /><div className="card center stack"><div style={{ fontSize: '3rem' }}>🏆</div><h2>Has rescatado {score} palabras</h2><p className="muted">Mejor marca: {best}. La escena sirve para recordar; la frase sirve para hablar.</p><Link className="btn" to="/desafios">Elegir otro desafío</Link></div></div>;
  const answer = choice !== null; const ok = choice === word.en;
  const next = () => { const final = score + (ok ? 1 : 0); if (i + 1 >= Math.min(learned.length, 8)) { saveBest('story', final); recordScore('Rescata la historia', final, Math.min(learned.length, 8), store.user?.first_name); setBest(Math.max(best, final)); } setScore(final); setI((n) => n + 1); setChoice(null); };
  return <div className="stack"><Header title="🧠 Rescata la historia" subtitle="Mira la escena absurda, recupera la palabra y escucha cómo aparece en una frase real." /><div className="spread"><span className="chip primary">{i + 1}/{Math.min(learned.length, 8)}</span><span className="chip">🏆 Mejor: {best}</span></div><div className="card stack challenge-game-card"><div className="memory-scene"><span className="memory-emoji">{mnemonic?.emoji || '🎬'}</span><div><span className="eyebrow">ESCENA ABSURDA</span><p>{mnemonic?.scene_es || word.hint_es || `Imagina una escena con “${word.en}”.`}</p></div></div>{mnemonic?.story_en && <div className="example"><div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Rich text={mnemonic.story_en} /><SpeakBtn text={mnemonic.story_en} natural /></div></div>}<span className="eyebrow">¿QUÉ PALABRA ESTABA ESCONDIDA?</span><div className="choice-grid">{options.map((o) => <button key={o} className={`choice ${answer && o === word.en ? 'ok' : ''} ${answer && o === choice && o !== word.en ? 'fail' : ''}`} onClick={() => !answer && setChoice(o)}>{o}</button>)}</div>{answer && <><div className="feedback"><b>{ok ? '✅ La recuperaste' : `💡 Era “${word.en}”`}</b><div>{word.example_en || 'Ahora úsala en una frase propia.'}</div><SpeakBtn text={word.example_en || word.en} natural /></div><button className="btn secondary" onClick={next}>Siguiente →</button></>}</div></div>;
}

function Listening({ image }: { image: boolean }) {
  const { words, mnemonicsFor, user } = useStore(); const list = useMemo(() => shuffle(words.filter((w) => w.example_en)).slice(0, 8), [words]); const [i, setI] = useState(0); const [answer, setAnswer] = useState(''); const [checked, setChecked] = useState<number | null>(null); const [total, setTotal] = useState(0); const [error, setError] = useState<unknown>(null); const [mnemonics, setMnemonics] = useState<Map<number, Mnemonic[]>>(new Map()); const word = list[i];
  useEffect(() => { if (image && list.length) mnemonicsFor(list.map((w) => w.id), { fill: true }).then(setMnemonics).catch(() => {}); }, [image, list, mnemonicsFor]);
  const target = image ? word?.en : word?.example_en;
  const play = async () => { if (!target) return; setError(null); try { const url = await naturalSpeech(target); if (url) new Audio(url).play(); else throw new Error('La voz natural no está disponible'); } catch (e) { setError(e); } };
  const check = () => { if (!target) return; const score = sentenceScore(answer, target); setChecked(score); setTotal((n) => n + score); };
  if (!word) return <div className="stack"><Header title={image ? '🖼️ Imagen → palabra' : '🎧 Listening oculto'} /><div className="card center stack"><div style={{ fontSize: '3rem' }}>{image ? '🖼️' : '🎧'}</div><h2>Resultado: {Math.round((total / Math.max(list.length, 1)) * 100)}%</h2><Link className="btn" to="/desafios">Elegir otro desafío</Link></div></div>;
  const mnemonic = mnemonics.get(word.id)?.[0] || null;
  const next = () => { if (i + 1 >= list.length) recordScore(image ? 'Imagen → palabra' : 'Listening oculto', total, list.length, user?.first_name); setI((n) => n + 1); setAnswer(''); setChecked(null); };
  return <div className="stack"><Header title={image ? '🖼️ Imagen → palabra' : '🎧 Listening oculto'} subtitle={image ? 'Mira la asociación y produce la palabra en inglés.' : 'Escucha sin mirar, escribe lo que entiendas y después comprueba.'} /><div className="spread"><span className="chip primary">{i + 1}/{list.length}</span><span className="chip">Puntuación: {Math.round((total / Math.max(i, 1)) * 100) || 0}%</span></div><div className="card stack challenge-game-card">{image ? <div className="image-prompt">{mnemonic?.image ? <img src={assetUrl(mnemonic.image)} alt="Asociación visual" /> : <span>{mnemonic?.emoji || '🧠'}</span>}<b>¿Cómo se dice?</b></div> : <div className="hidden-audio"><span>🔊</span><b>La frase está oculta</b><small>Escúchala dos veces antes de escribir.</small></div>}<button className="btn big secondary" onClick={play}>🔊 {image ? 'Escuchar pista' : 'Escuchar frase'}</button><ErrorBox error={error} /><input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={image ? 'Escribe la palabra…' : 'Escribe exactamente lo que oyes…'} readOnly={checked !== null} />{checked === null ? <button className="btn" disabled={!answer.trim()} onClick={check}>Comprobar</button> : <><div className={`feedback ${checked >= .85 ? 'ok' : checked >= .5 ? 'doubt' : 'fail'}`}><b>{checked >= .85 ? '✅ Muy bien' : checked >= .5 ? '🤔 Revisa un detalle' : '💡 Escúchala otra vez'}</b><div>{image ? word.en : word.example_en}</div></div><button className="btn secondary" onClick={next}>Siguiente →</button></>}</div></div>;
}

export function Challenges({ mode = 'hub' }: { mode?: ChallengeMode }) {
  if (mode === 'scramble') return <Scramble />;
  if (mode === 'story') return <StoryRecall />;
  if (mode === 'listen') return <Listening image={false} />;
  if (mode === 'image') return <Listening image />;
  return <Hub />;
}
