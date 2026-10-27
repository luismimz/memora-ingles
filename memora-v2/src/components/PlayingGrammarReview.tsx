import { useEffect, useState } from 'react';
import type { AtomicUnit } from '../domain/unit';
import { getUnitSentences } from '../domain/unit';
import { mirrorText } from '../domain/mirrorLesson';
import { playEnglish, stopSpeech } from '../services/audio';
import { GameCard } from './GameCard';
import { MirrorRow, MirrorQuestion } from './MirrorPieces';
import { GrammarMorphology } from './GrammarMorphology';
import { MirrorWriteTest } from './MirrorWriteTest';
import { SentenceBuilderCard } from './SentenceBuilderCard';
import { ConversationPractice } from './ConversationPractice';
import './mirror.css';
import './playingGrammarReview.css';

export const playingReviewSteps = ['Español espejo', 'Las dos pistas', 'Persona y contracción', 'Construir', 'Afirmar / negar / preguntar', 'Dilo tú', 'Conversar con Emma', 'Recordar', 'Revisión terminada'] as const;
const stageOrder = [2, 3, 4, 7, 8, 9, 10, 12, 13];

/** Editorial collection, not a new learner curriculum. All tasks reuse real
 * Memora components; inspection never writes mastery, attempts or Directus data. */
export function PlayingGrammarReview({ unit, mirrorUnit, onExit }: { unit: AtomicUnit; mirrorUnit: AtomicUnit; onExit: () => void }) {
  const lesson = mirrorUnit.mirror!;
  const form = unit.grammar.find((item) => item.englishBase === 'play') ?? mirrorUnit.grammar[0];
  const [position, setPosition] = useState(0);
  const stage = stageOrder[position];
  const [reveal, setReveal] = useState(0);
  const [morphStep, setMorphStep] = useState(0);
  const [joined, setJoined] = useState(false);
  const [person, setPerson] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [slots, setSlots] = useState(0);
  const [trio, setTrio] = useState(0);
  const [chatReady, setChatReady] = useState(false);
  const first = lesson.examples[0];
  const example = lesson.examples[exampleIndex];
  const sentences = getUnitSentences(mirrorUnit);
  const move = (next: number) => {
    stopSpeech();
    if (next === 7) { setExampleIndex(0); setSlots(0); }
    if (next === 9) setExampleIndex(0);
    if (next === 10) setChatReady(false);
    const nextPosition = stageOrder.indexOf(next);
    if (nextPosition >= 0) setPosition(nextPosition);
  };
  useEffect(() => () => stopSpeech(), []);
  const next = () => move(stageOrder[Math.min(playingReviewSteps.length - 1, position + 1)]);
  const trios = [
    { label: 'Afirmar', natural: 'Estás jugando.', es: [{ text: 'TÚ', role: 'person' as const }, { text: 'estás', role: 'auxiliary' as const }, { text: 'jugando', role: 'action' as const }], en: [{ text: 'You', role: 'person' as const }, { text: 'are', role: 'auxiliary' as const }, { text: 'playing', role: 'action' as const }], tip: 'Persona + ayudante + acción.' },
    { label: 'Negar', natural: 'No estás jugando.', es: [{ text: 'TÚ', role: 'person' as const }, { text: 'no', role: 'negation' as const }, { text: 'estás', role: 'auxiliary' as const }, { text: 'jugando', role: 'action' as const }], en: [{ text: 'You', role: 'person' as const }, { text: 'are', role: 'auxiliary' as const }, { text: 'not', role: 'negation' as const }, { text: 'playing', role: 'action' as const }], tip: 'NOT se coloca detrás del ayudante ARE. Escucha: You are not playing.' },
    { label: 'Preguntar', natural: '¿Estás jugando?', es: [{ text: '¿Estás', role: 'auxiliary' as const }, { text: 'TÚ', role: 'person' as const }, { text: 'jugando?', role: 'action' as const }], en: [{ text: 'Are', role: 'auxiliary' as const }, { text: 'you', role: 'person' as const }, { text: 'playing?', role: 'action' as const }], tip: 'El ayudante salta delante de la persona: You are → Are you? No añadimos DO.' },
  ];
  const pair = trios[trio];
  return <main className="game-screen mirror-screen playing-review">
    <header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Gramática</button><span>JUGANDO · FICHA DE REVISIÓN</span></header>
    <p className="mirror-save">Recorrido reunido para decidir el diseño · no guarda progreso ni desbloquea habilidades.</p>
    <nav className="playing-review-nav" aria-label="Pasos de la ficha reunida"><label htmlFor="playing-review-step">Paso {position + 1} de {playingReviewSteps.length}</label><select id="playing-review-step" value={stage} onChange={(event) => move(Number(event.target.value))}>{playingReviewSteps.map((label, index) => <option key={label} value={stageOrder[index]}>{index + 1}. {label}</option>)}</select></nav>
    <section className="game-stage">
      {stage === 7 ? <SentenceBuilderCard key={`build-${exampleIndex}`} sentence={sentences[exampleIndex]} sceneWord={mirrorUnit.words[0]} processForm={form} index={exampleIndex} total={sentences.length} filledSlots={slots} choiceSeed={0} onPick={() => setSlots((value) => value + 1)} onNext={() => { if (exampleIndex < sentences.length - 1) { setExampleIndex((value) => value + 1); setSlots(0); } else next(); }} />
        : stage === 10 && chatReady ? <ConversationPractice key="chat" unit={mirrorUnit} userId="preview" reviewMode onContinue={next} />
        : <GameCard key={`review-${stage}`} className="mirror-card"><div className="mirror-content">
          <p className="eyebrow">{playingReviewSteps[position]}</p>
          {stage === 2 ? <><h1>{example.natural}</h1>{reveal === 0 ? <button type="button" className="primary-action" onClick={() => { setReveal(1); }}>¿Quién está jugando?</button> : <><p className="mirror-rule">¿Quién? <strong className="mirror-person">YO.</strong> En «estoy» ya lo sabes, aunque no lo digas.</p><div className="mirror-board"><MirrorRow pieces={example.mirror} label="Antes de traducir, haz visible la persona" language="es" />{reveal >= 2 ? <MirrorRow pieces={example.english} label="Ahora en inglés · mismas piezas y colores" language="en" onListen={() => void playEnglish(mirrorText(example.english))} /> : null}</div><p className="mirror-rule">El truco: antes de traducir, di quién. YO, TÚ, ÉL, ELLA… En español puedes omitirlo; en estas frases inglesas se escribe.</p>{reveal === 1 ? <button type="button" className="primary-action" onClick={() => { setReveal(2); void playEnglish('I am playing'); }}>YO estoy jugando → ver en inglés</button> : <><div className="mirror-tabs" aria-label="Comparar acciones sin cambiar de paso">{lesson.examples.map((item, index) => <button key={item.id} type="button" aria-pressed={index === exampleIndex} onClick={() => setExampleIndex(index)}>{item.natural}</button>)}</div><small>I AM permanece; solo cambia la acción.</small></>}</>}</> : null}
          {stage === 3 ? <><h1>Detecta las dos pistas.</h1><GrammarMorphology form={form} baseSpanish="jugar" step={morphStep} joined={false} subjectIndex={0} /><p className="mirror-rule">{morphStep === 0 ? 'Partimos de la palabra que ya conoces: jugar → play.' : morphStep === 1 ? 'En esta acción en marcha, -ando se refleja en -ing: jugando → playing.' : 'No basta ING: «estoy» aporta I AM. I am playing.'}</p><button type="button" className="primary-action" onClick={() => { if (morphStep < 2) setMorphStep((value) => value + 1); void playEnglish(morphStep === 0 ? 'playing' : 'I am playing'); }}>{morphStep === 0 ? 'Añadir ANDO / ING' : morphStep === 1 ? 'Añadir ESTOY / I AM' : '🔊 Escuchar la frase'}</button></> : null}
          {stage === 4 ? <><h1>I + am se juntan al hablar.</h1><GrammarMorphology form={form} baseSpanish="jugar" step={2} joined={joined} subjectIndex={person} /><button type="button" className="primary-action" onClick={() => { setJoined((value) => !value); const subject = form.subjects[person]; void playEnglish(joined ? subject.phrase.replace(subject.en, subject.expandedEn || subject.en) : subject.phrase); }}>{joined ? 'Separar las piezas' : 'Juntar las piezas'}</button><div className="subject-list" aria-label="Cambiar de persona">{form.subjects.map((subject, index) => <button type="button" key={subject.es} aria-pressed={index === person} onClick={() => { setPerson(index); setJoined(false); }}>{subject.es}</button>)}</div><p className="mirror-rule">La persona y su ayudante cambian juntos. La acción conserva ING.</p></> : null}
          {stage === 8 ? <><h1>El ayudante cambia la intención.</h1><div className="mirror-tabs">{trios.map((item, index) => <button type="button" key={item.label} aria-pressed={index === trio} onClick={() => { setTrio(index); void playEnglish(mirrorText(item.en)); }}>{item.label}</button>)}</div><p className="mirror-natural">{pair.natural}</p><MirrorRow pieces={pair.es} label="Español espejo" language="es" /><MirrorRow pieces={pair.en} label="Inglés" language="en" /><p className="mirror-rule">{pair.tip}</p><small>Demostración añadida del PDF. Aquí se enseña; no se exige formular preguntas en el chat.</small></> : null}
          {stage === 9 ? <><div className="mirror-tabs">{lesson.examples.map((item, index) => <button key={item.id} type="button" aria-pressed={index === exampleIndex} onClick={() => setExampleIndex(index)}>{item.natural}</button>)}</div><MirrorWriteTest key={`own-${exampleIndex}`} unit={mirrorUnit} example={example} lesson={lesson} userId="preview" inspection activityId="playing-review-own" nextLabel="Escuchar a Emma →" onSuccess={next} /></> : null}
          {stage === 10 ? <><h1>Emma quiere saber qué haces.</h1><MirrorQuestion lesson={lesson} spanishMirror={[{ text: '¿Qué', role: 'question' }, { text: 'estás', role: 'auxiliary' }, { text: 'TÚ', role: 'person' }, { text: 'haciendo?', role: 'action', ending: 'iendo?' }]} /><button type="button" className="quiet-action" onClick={() => void playEnglish(mirrorText(lesson.question.en))}>🔊 Escuchar a Emma</button><p className="mirror-rule">Primero entiende la pregunta; después responde con la frase que has preparado.</p><button type="button" className="primary-action" onClick={() => { stopSpeech(); setChatReady(true); }}>Responder a Emma →</button></> : null}
          {stage === 12 ? <MirrorWriteTest unit={mirrorUnit} example={first} lesson={lesson} userId="preview" inspection activityId="playing-review-recall" nextLabel="Ver el cierre →" recall onSuccess={next} /> : null}
          {stage === 13 ? <><h1>Ahora podemos elegir qué funciona.</h1><p>Has podido revisar el espejo, las terminaciones, las personas, las contracciones, la comparación, la construcción y la conversación en el mismo recorrido.</p><p className="mirror-rule">Esta ficha reúne opciones para decidir juntos. No es todavía la secuencia definitiva del alumno ni una prueba de dominio.</p><button type="button" className="primary-action" onClick={() => move(2)}>Volver a revisar</button><button type="button" className="quiet-action" onClick={onExit}>Volver a gramática</button></> : null}
        </div></GameCard>}
    </section>
    {stage < 13 ? <footer className="playing-review-controls"><button type="button" className="quiet-action" disabled={position === 0} onClick={() => move(stageOrder[position - 1])}>← Anterior</button><button type="button" className="quiet-action" onClick={next}>Siguiente paso →</button></footer> : null}
  </main>;
}
