import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { items } from '../../lib/api';
import { useStore } from '../../store';

export type RaModule = 'RA1' | 'RA2' | 'RA3' | 'RA4' | 'RA5';
export interface GrammarChallenge {
  id: string;
  ra_module: RaModule;
  topic: string;
  question: string;
  options: string[];
  correct_index: number;
  rule_hint: string;
  trap_warning: string;
  source: string;
  status?: string;
}

interface Mastery { correct: number; attempts: number }
type Phase = 'loading' | 'lobby' | 'running' | 'finished';

const RA_MODULES: { id: RaModule; title: string; subtitle: string }[] = [
  { id: 'RA1', title: 'Comunicación profesional', subtitle: 'Tiempos y preguntas' },
  { id: 'RA2', title: 'Documentación técnica', subtitle: 'Pasiva y reported speech' },
  { id: 'RA3', title: 'Desarrollo web', subtitle: 'Condicionales y modales' },
  { id: 'RA4', title: 'Trabajo en equipo', subtitle: 'Conectores y tags' },
  { id: 'RA5', title: 'Proyecto y calidad', subtitle: 'Precisión C1' },
];

const FALLBACK_CHALLENGES: GrammarChallenge[] = [
  { id: 'fallback-ra1-1', ra_module: 'RA1', topic: 'Conditionals', question: 'By the time I found my wallet, someone ______ it.', options: ['had taken', 'takes', 'has taken', 'would take'], correct_index: 0, rule_hint: 'Una acción terminó antes de otra pasada: past perfect.', trap_warning: 'No uses present perfect con un momento cerrado del pasado.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra1-2', ra_module: 'RA1', topic: 'Question Tags', question: 'You have finished the sprint, ______?', options: ['haven’t you', 'don’t you', 'didn’t you', 'aren’t you'], correct_index: 0, rule_hint: 'La coletilla repite el auxiliar de la frase.', trap_warning: '“Have finished” necesita “haven’t”, no “don’t”.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra2-1', ra_module: 'RA2', topic: 'Passive Voice', question: 'The release notes ______ by the technical writer yesterday.', options: ['were updated', 'updated', 'have update', 'are updating'], correct_index: 0, rule_hint: 'El objeto recibe la acción: be + past participle.', trap_warning: '“Yesterday” pide pasado; no mezcles presente continuo.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra2-2', ra_module: 'RA2', topic: 'Reported Speech', question: 'The lead developer said that the build ______ ready.', options: ['was', 'is being', 'has', 'will be'], correct_index: 0, rule_hint: 'Al reportar en pasado, backshift: is → was.', trap_warning: 'No conserves “is” si el verbo introductor está en pasado.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra3-1', ra_module: 'RA3', topic: 'Modals', question: 'The endpoint is returning 500; we ______ check the logs.', options: ['should', 'must to', 'can to', 'would to'], correct_index: 0, rule_hint: 'Modal + verbo base, sin “to”.', trap_warning: 'Después de un modal nunca añadas “to”.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra3-2', ra_module: 'RA3', topic: 'Conditionals', question: 'If the tests pass, we ______ the feature today.', options: ['will deploy', 'would deployed', 'deployed', 'have deploy'], correct_index: 0, rule_hint: 'First conditional: if + present, will + base verb.', trap_warning: 'No pongas “will” inmediatamente después de “if”.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra4-1', ra_module: 'RA4', topic: 'Connectors', question: 'The UI is simple; ______, the onboarding still needs work.', options: ['however', 'because', 'despite', 'unless'], correct_index: 0, rule_hint: '“However” contrapone dos ideas completas.', trap_warning: '“Despite” necesita un nombre o gerundio, no una oración completa.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra4-2', ra_module: 'RA4', topic: 'Question Tags', question: 'Let’s review the backlog, ______?', options: ['shall we', 'will we', 'don’t we', 'aren’t we'], correct_index: 0, rule_hint: 'Con “Let’s”, la coletilla estándar es “shall we?”.', trap_warning: 'No uses una coletilla normal de “you”; aquí proponemos algo juntos.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra5-1', ra_module: 'RA5', topic: 'Advanced Tenses', question: 'By next Friday, the team ______ the migration.', options: ['will have completed', 'completes', 'has completing', 'would complete'], correct_index: 0, rule_hint: 'Future perfect: will have + participle.', trap_warning: '“By + fecha futura” es la pista del future perfect.', source: 'Memora · práctica DAM/DAW' },
  { id: 'fallback-ra5-2', ra_module: 'RA5', topic: 'Inversion', question: 'Rarely ______ such a resilient architecture.', options: ['have we seen', 'we have seen', 'we saw have', 'did we have see'], correct_index: 0, rule_hint: 'Adverbio negativo al inicio provoca inversión auxiliar-sujeto.', trap_warning: 'Después de “Rarely” no mantengas el orden afirmativo.', source: 'Memora · práctica DAM/DAW' },
];

const MASTERY_KEY = 'memora.ilerna.mastery';

function shuffle<T>(values: T[]) {
  return [...values].sort(() => Math.random() - 0.5);
}

function readMastery(userId: string | undefined): Record<RaModule, Mastery> {
  try {
    const raw = JSON.parse(localStorage.getItem(`${MASTERY_KEY}.${userId ?? 'local'}`) || '{}');
    return raw;
  } catch {
    return {} as Record<RaModule, Mastery>;
  }
}

export function IlernaArena() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [phase, setPhase] = useState<Phase>('loading');
  const [challenges, setChallenges] = useState<GrammarChallenge[]>([]);
  const [selectedRa, setSelectedRa] = useState<RaModule>('RA1');
  const [roundLength, setRoundLength] = useState<5 | 10>(5);
  const [round, setRound] = useState<GrammarChallenge[]>([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerCorrect, setAnswerCorrect] = useState<boolean | null>(null);
  const [trap, setTrap] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [mastery, setMastery] = useState<Record<RaModule, Mastery>>(() => readMastery(user?.id));
  const advanceTimer = useRef<number | null>(null);
  const scoreSaved = useRef(false);
  const current = round[index] ?? null;

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    items.list<GrammarChallenge>('grammar_challenges', { fields: '*', filter: { status: { _eq: 'published' } } })
      .then((rows) => {
        if (cancelled) return;
        const valid = rows.filter((row) => row.question && Array.isArray(row.options) && row.options.length >= 4);
        setChallenges(valid.length ? valid : FALLBACK_CHALLENGES);
        setPhase('lobby');
      })
      .catch(() => {
        if (!cancelled) { setChallenges(FALLBACK_CHALLENGES); setPhase('lobby'); }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
  }, []);

  const updateMastery = useCallback((ra: RaModule, isCorrect: boolean) => {
    setMastery((previous) => {
      const before = previous[ra] ?? { correct: 0, attempts: 0 };
      const next = { ...previous, [ra]: { correct: before.correct + (isCorrect ? 1 : 0), attempts: before.attempts + 1 } };
      try { localStorage.setItem(`${MASTERY_KEY}.${user?.id ?? 'local'}`, JSON.stringify(next)); } catch { /* modo privado */ }
      return next;
    });
  }, [user?.id]);

  const goNext = useCallback(() => {
    if (index + 1 >= round.length) {
      setPhase('finished');
      return;
    }
    setIndex((value) => value + 1);
    setTimeLeft(15);
    setSelected(null);
    setAnswerCorrect(null);
    setTrap(null);
  }, [index, round.length]);

  const answer = useCallback((option: number | null) => {
    if (phase !== 'running' || selected !== null || !current) return;
    const isCorrect = option === current.correct_index;
    setSelected(option ?? -1);
    setAnswerCorrect(isCorrect);
    setAnswered((value) => value + 1);
    if (isCorrect) setCorrect((value) => value + 1);
    else setTrap(option === null ? `⏱️ Se acabó el tiempo. ${current.trap_warning}` : current.trap_warning);
    updateMastery(current.ra_module, isCorrect);
    advanceTimer.current = window.setTimeout(goNext, isCorrect ? 650 : 1750);
  }, [current, goNext, phase, selected, updateMastery]);

  useEffect(() => {
    if (phase !== 'running' || selected !== null || !current) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          answer(null);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [answer, current, phase, selected]);

  const startRound = () => {
    const pool = challenges.filter((challenge) => challenge.ra_module === selectedRa);
    const source = pool.length >= roundLength ? pool : [...pool, ...challenges.filter((challenge) => challenge.ra_module !== selectedRa)];
    setRound(shuffle(source).slice(0, roundLength));
    setIndex(0);
    setTimeLeft(15);
    setSelected(null);
    setAnswerCorrect(null);
    setTrap(null);
    setCorrect(0);
    setAnswered(0);
    scoreSaved.current = false;
    setPhase('running');
  };

  const liveGrade = answered ? (correct / answered) * 10 : 0;

  useEffect(() => {
    if (phase !== 'finished' || scoreSaved.current) return;
    scoreSaved.current = true;
    void items.create('challenge_scores', {
      display_name: user?.first_name || 'Alumno',
      game: `ilerna_${selectedRa}`,
      score: Math.round(liveGrade * 10),
      total: round.length,
      accuracy: round.length ? correct / round.length : 0,
      max_combo: 1,
      seconds: round.length * 15,
    }).catch(() => { /* La arena sigue disponible aunque Directus no tenga aún la tabla. */ });
  }, [correct, liveGrade, phase, round.length, selectedRa, user?.first_name]);

  return (
    <main className={`ilerna-stage ilerna-${phase}`}>
      <header className="ilerna-topbar">
        <div><p className="ilerna-brand">MEMORA <span>ILERNA ARENA</span></p><p className="ilerna-kicker">DAM / DAW · EXAM MODE</p></div>
        <button type="button" className="mission-exit" onClick={() => navigate('/')}>✕ Salir al Inicio</button>
      </header>

      {phase === 'loading' ? <section className="ilerna-panel ilerna-loading"><div className="ilerna-orb">🎓</div><h1>Preparando el examen…</h1><p>Cargando preguntas oficiales y tu dominio por módulo.</p></section> : null}

      {phase === 'lobby' ? <section className="ilerna-panel">
        <div className="ilerna-hero"><span>🎓 MODO EXAMEN ILERNA</span><h1>Entrena con presión, aprende con cabeza.</h1><p>Elige un Resultado de Aprendizaje y supera una ráfaga de preguntas. Cada fallo revela la trampa que suele caer en el examen.</p></div>
        <div className="ilerna-ra-grid">{RA_MODULES.map((module) => {
          const stats = mastery[module.id] ?? { correct: 0, attempts: 0 };
          const percent = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0;
          return <button type="button" key={module.id} className={`ilerna-ra ${selectedRa === module.id ? 'is-selected' : ''}`} onClick={() => setSelectedRa(module.id)}><span>{module.id}</span><strong>{module.title}</strong><small>{module.subtitle}</small><div className="ilerna-mini-track"><i style={{ width: `${percent}%` }} /></div><b>{percent}% dominio</b></button>;
        })}</div>
        <div className="ilerna-start-row"><div><span className="ilerna-label">TAMAÑO DE RÁFAGA</span><div className="ilerna-length"><button type="button" className={roundLength === 5 ? 'is-selected' : ''} onClick={() => setRoundLength(5)}>5 preguntas</button><button type="button" className={roundLength === 10 ? 'is-selected' : ''} onClick={() => setRoundLength(10)}>10 preguntas</button></div></div><button type="button" className="btn ilerna-start" onClick={startRound}>⚡ Empezar {selectedRa} →</button></div>
      </section> : null}

      {phase === 'running' && current ? <section className="ilerna-panel ilerna-game">
        <div className="ilerna-game-top"><div><span className="ilerna-label">{current.ra_module} · {current.topic}</span><strong>Pregunta {index + 1}/{round.length}</strong></div><div className={`ilerna-grade ${liveGrade >= 5 ? 'is-pass' : ''}`}><small>TERMÓMETRO</small><b>{liveGrade.toFixed(1)}</b><span>/ 10</span></div></div>
        <div className="ilerna-time"><div><span>⏱️ {timeLeft}s</span><small>Responde antes de que cierre la compuerta</small></div><i><b style={{ width: `${(timeLeft / 15) * 100}%` }} /></i></div>
        <article className="ilerna-question"><span className="ilerna-source">{current.source}</span><h1>{current.question}</h1><div className="ilerna-options">{current.options.map((option, optionIndex) => <button type="button" key={`${current.id}-${optionIndex}`} className={`${selected !== null && optionIndex === current.correct_index ? 'is-correct' : ''} ${selected === optionIndex && !answerCorrect ? 'is-wrong' : ''}`} disabled={selected !== null} onClick={() => answer(optionIndex)}><b>{String.fromCharCode(65 + optionIndex)}</b>{option}</button>)}</div></article>
        {selected !== null ? <div className={`ilerna-feedback ${answerCorrect ? 'is-correct' : 'is-wrong'}`}><strong>{answerCorrect ? '✅ Buena lectura de la estructura.' : '🧠 Trampa detectada.'}</strong><p>{answerCorrect ? current.rule_hint : trap}</p></div> : <p className="ilerna-rule-tip">Lee primero la relación entre tiempo, auxiliar y contexto. El examen intenta que respondas por intuición.</p>}
      </section> : null}

      {phase === 'finished' ? <section className="ilerna-panel ilerna-results"><span className="ilerna-trophy">🏆</span><span className="ilerna-label">RÁFAGA COMPLETADA</span><h1>{liveGrade >= 5 ? 'Aprobado provisional.' : 'La trampa te ha visto venir.'}</h1><div className={`ilerna-final-grade ${liveGrade >= 5 ? 'is-pass' : ''}`}>{liveGrade.toFixed(1)}<small>/ 10</small></div><p>{correct} aciertos de {round.length}. Revisa el chivato de cada fallo y vuelve a intentarlo para subir tu dominio en {selectedRa}.</p><div className="ilerna-result-actions"><button type="button" className="btn ilerna-start" onClick={startRound}>🔁 Repetir {selectedRa}</button><button type="button" className="btn secondary" onClick={() => setPhase('lobby')}>Cambiar módulo</button></div></section> : null}
    </main>
  );
}
