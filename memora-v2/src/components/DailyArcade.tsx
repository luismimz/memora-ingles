import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { GameCard } from './GameCard';
import { MnemonicSceneText, SceneVisual } from './SceneVisual';
import { adaptivePriority, associationNeedsReview, isKnownWord, isSentenceReady, readChunkMemories, readSentenceMemories, readWordMemories, recordChunkRecall, recordSentenceRecall, recordWordRecall, sentenceKey, shouldReduceDifficulty, wordKey, type RecallDirection, type RecallError } from '../domain/memory';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';
import { readSessions, recordAttempt, recordSession } from '../domain/learningProfile';
import { recordLearningActivity } from '../domain/learningActivity';
import { getUnitSentences, type AtomicUnit, type AtomicWord, type GrammarForm } from '../domain/unit';
import { playEnglish, playMiss, playSnap, stopSpeech } from '../services/audio';

type Challenge = {
  kind: 'picture' | 'recognition' | 'audio' | 'bridge' | 'chunk' | 'complete' | 'write' | 'sentence' | 'learning-language' | 'conversation';
  word?: AtomicWord;
  chunkKey?: string;
  sentenceKey?: string;
  unitId?: string;
  prompt: string;
  choices: string[];
  answer: string;
  acceptedAnswers?: string[];
  direction?: RecallDirection;
  visualCue?: boolean;
  bridge?: string;
  scaffold?: string;
  instruction?: {
    en: string;
    es: string;
    stage: 'introduce' | 'supported' | 'independent';
  };
  errorType?: RecallError;
  reason?: 'weakness' | 'due_review' | 'maintenance' | 'association_review' | 'contrast' | 'conversation' | 'production';
};

function MorphText({ text, language, forms }: { text: string; language: 'es' | 'en'; forms: GrammarForm[] }) {
  const words = text.split(/(\s+)/);
  return <>{words.map((part, index) => {
    if (/^\s+$/.test(part)) return part;
    const punctuation = part.match(/[.,!?;:»]+$/)?.[0] ?? '';
    const clean = punctuation ? part.slice(0, -punctuation.length) : part;
    const form = forms.find((candidate) => (language === 'es' ? candidate.spanish : candidate.english).toLocaleLowerCase(language) === clean.toLocaleLowerCase(language));
    const pieces = language === 'es' ? form?.spanishPieces : form?.englishPieces;
    if (!pieces || pieces.map((piece) => piece.text).join('').toLocaleLowerCase(language) !== clean.toLocaleLowerCase(language)) return <span key={`${part}-${index}`}>{part}</span>;
    return <span className="arcade-morph-word" key={`${part}-${index}`}>{pieces.map((piece) => <span key={piece.id} className={piece.role === 'root' || piece.role === 'participle' ? 'morph-root' : 'morph-intent'}>{piece.text}</span>)}{punctuation}</span>;
  })}</>;
}

function challengeDuration(question: Challenge): number | null {
  if (question.kind === 'sentence' || question.kind === 'conversation' || question.kind === 'learning-language' || question.kind === 'write' || question.kind === 'complete' || question.instruction?.stage === 'introduce') return null;
  if (question.instruction?.stage === 'supported') return 8_000;
  return 5_000;
}

export function makeDeck(userId: string, units: AtomicUnit[], preview: boolean): Challenge[] {
  const memories = readWordMemories(userId);
  // Keep current-unit words available while interleaving words already stored
  // from earlier units. This prevents a new unit from producing an empty
  // Arcade just because the user has an existing memory history.
  const allWords = [...new Map([
    ...units.flatMap((unit) => unit.words),
  ].map((word) => [wordKey(word), word])).values()];
  const words = preview ? allWords : allWords.filter((word) => {
    const memory = memories.find((item) => item.key === wordKey(word));
    return !isKnownWord(memory) || Boolean(memory && Date.parse(memory.nextReviewAt) <= Date.now());
  });
  const previousFatigue = readSessions(userId).at(-1)?.fatigue;
  const reduceDifficulty = !preview && previousFatigue ? shouldReduceDifficulty(previousFatigue) : false;
  const byKey = new Map(memories.map((item) => [item.key, item]));
  const priority = [...words].sort((a, b) => {
    const left = byKey.get(wordKey(a));
    const right = byKey.get(wordKey(b));
    return Number(isKnownWord(left)) - Number(isKnownWord(right)) || adaptivePriority(right) - adaptivePriority(left)
      || (right?.lapses ?? 0) - (left?.lapses ?? 0);
  });
  const maximum = reduceDifficulty ? 2 : 4;
  const maintenance = preview ? [] : priority.filter((word) => isKnownWord(byKey.get(wordKey(word)))).slice(0, 1);
  const vocabulary = preview ? priority.slice(0, maximum) : [...priority.filter((word) => !isKnownWord(byKey.get(wordKey(word)))).slice(0, maximum - maintenance.length), ...maintenance];
  const wordChallenge = (word: AtomicWord, kind: 'picture' | 'recognition' | 'audio' | 'bridge' | 'complete' | 'write', index: number): Challenge => {
    const candidates = allWords.filter((item) => wordKey(item) !== wordKey(word));
    const rotated = [...candidates.slice(index % Math.max(1, candidates.length)), ...candidates.slice(0, index % Math.max(1, candidates.length))];
    const others = [...new Map(rotated.map((item) => [wordKey(item), item])).values()].slice(0, 2);
    const meanings = kind === 'audio' || kind === 'recognition';
    const options = [...new Set([word, ...others].map((item) => meanings ? item.es : item.en))];
    const offset = (index + Math.floor(Date.now() / 1000)) % options.length;
    const shuffled = [...options.slice(offset), ...options.slice(0, offset)];
    const memoryStep = byKey.get(wordKey(word))?.step ?? 0;
    const instructionStage = memoryStep === 0 ? 'introduce' : memoryStep === 1 ? 'supported' : 'independent';
    return {
      kind, word, prompt: kind === 'write' || kind === 'complete' || kind === 'picture' || kind === 'bridge' ? word.es : 'Escucha y elige el significado',
      choices: kind === 'write' || kind === 'complete' ? [] : shuffled.filter(Boolean), answer: meanings ? word.es : word.en, bridge: word.bridge,
      direction: kind === 'audio' ? 'auditory' : kind === 'recognition' ? 'recognition' : kind === 'write' || kind === 'complete' ? 'production' : 'recall',
      visualCue: ['picture', 'write', 'complete'].includes(kind) && memoryStep < 2,
      scaffold: kind === 'complete' ? `${word.en.slice(0, 1)}${' _'.repeat(Math.max(0, word.en.length - 1))}` : undefined,
      instruction: kind === 'picture' ? { en: 'HOW DO YOU SAY…?', es: '¿CÓMO SE DICE…?', stage: instructionStage } : undefined,
      reason: kind === 'write' || kind === 'complete' ? 'production'
        : isKnownWord(byKey.get(wordKey(word))) ? 'maintenance' : associationNeedsReview(byKey.get(wordKey(word))) ? 'association_review'
          : (byKey.get(wordKey(word)) && Date.parse(byKey.get(wordKey(word))!.nextReviewAt) <= Date.now()) ? 'due_review' : 'weakness',
    };
  };
  const completedIds = new Set(units.map((unit) => unit.id));
  const allChunks = readChunkMemories(userId);
  const savedChunks = allChunks.filter((item) => completedIds.has(item.unitId))
    .sort((a, b) => Number(Date.parse(b.nextReviewAt) <= Date.now()) - Number(Date.parse(a.nextReviewAt) <= Date.now()) || b.lapses - a.lapses);
  const chunks: Challenge[] = savedChunks.slice(0, 2).map((item) => ({
    kind: 'chunk', chunkKey: item.key, prompt: item.slot.es, choices: item.slot.choices, answer: item.slot.en, reason: 'weakness',
  }));
  if (preview && !chunks.length) chunks.push(...units.flatMap((unit) => getUnitSentences(unit).slice(0, 1).flatMap((sentence) => {
    const slot = sentence.slots.find((item) => item.choices.length === 2 && item.choices[0] !== item.choices[1]);
    return slot ? [{ kind: 'chunk' as const, prompt: slot.es, choices: slot.choices, answer: slot.en }] : [];
  })).slice(0, 2));
  const deck: Challenge[] = [];
  if (!vocabulary.length) deck.push(...chunks);
  // Every real Arcade includes one short production task. Waiting several
  // review cycles made writing effectively invisible to new learners. The
  // last vocabulary round is deliberate: recognition warms the memory first,
  // then the learner produces one known word without options.
  const matureWritingIndex = vocabulary.findIndex((word) => (byKey.get(wordKey(word))?.step ?? 0) >= 2);
  const writingIndex = matureWritingIndex >= 0 ? matureWritingIndex : vocabulary.length - 1;
  const bridgeIndex = vocabulary.findIndex((word, index) => index !== writingIndex && Boolean(word.bridge) && (byKey.get(wordKey(word))?.step ?? 0) < 2);
  vocabulary.forEach((word, index) => {
    const memoryStep = byKey.get(wordKey(word))?.step ?? 0;
    const capabilities = byKey.get(wordKey(word))?.capabilities;
    const weakest = (['recall', 'auditory', 'recognition', 'production'] as RecallDirection[]).sort((a, b) => {
      const score = (direction: RecallDirection) => { const c = capabilities?.[direction]; return c?.attempts ? c.correct / c.attempts : -1; };
      const due = (direction: RecallDirection) => Boolean(capabilities?.[direction]?.nextReviewAt && Date.parse(capabilities[direction]!.nextReviewAt!) <= Date.now());
      return Number(due(b)) - Number(due(a)) || score(a) - score(b);
    })[0];
    const adaptiveKind = weakest === 'auditory' ? 'audio' : weakest === 'recognition' ? 'recognition' : weakest === 'production' ? 'write' : 'picture';
    const kind = isKnownWord(byKey.get(wordKey(word))) ? adaptiveKind : index === writingIndex ? memoryStep < 1 ? 'complete' : 'write' : index === bridgeIndex ? 'bridge' : adaptiveKind;
    deck.push(wordChallenge(word, kind, index));
    if (chunks[index]) deck.push(chunks[index]);
  });
  const communication = units.find((unit) => unit.communication?.practicePrompt && unit.communication.acceptedAnswers?.length)?.communication;
  if (communication?.practicePrompt && communication.acceptedAnswers?.length) deck.push({
    kind: 'conversation', prompt: communication.practicePrompt, choices: [], answer: communication.acceptedAnswers[0], acceptedAnswers: communication.acceptedAnswers, reason: 'conversation',
  });
  const firstEnglishPrompt = deck.findIndex((item) => item.kind === 'picture');
  if (firstEnglishPrompt >= 0) deck.splice(firstEnglishPrompt + 1, 0, {
    kind: 'learning-language',
    prompt: '¿Cómo preguntas «¿Cómo se dice…?»?',
    choices: ['What do you say…?', 'How do you say…?', 'How are you say…?'],
    answer: 'How do you say…?',
  });
  const sentenceMemories = new Map(readSentenceMemories(userId).map((item) => [item.key, item]));
  const readySentence = units.flatMap((unit) => getUnitSentences(unit).map((sentence) => ({ unit, sentence })))
    .find(({ unit, sentence }) => {
      if (preview) return true;
      if (!isSentenceReady(allChunks, unit.id, sentence)) return false;
      const memory = sentenceMemories.get(sentenceKey(unit.id, sentence));
      return Boolean(memory && Date.parse(memory.nextReviewAt) <= Date.now());
    });
  const rounds = deck.slice(0, 6);
  // The short deck must never cut off either the survival phrase or production.
  // Recognition-only rounds are the first candidates to yield their place.
  const keepKinds: Challenge['kind'][] = ['learning-language', 'complete', 'write', 'conversation'];
  for (const requiredKind of keepKinds) {
    const required = deck.find((item) => item.kind === requiredKind);
    if (!required || rounds.includes(required)) continue;
    let replaceAt = -1;
    for (let candidate = rounds.length - 1; candidate >= 0; candidate -= 1) {
      if (!keepKinds.includes(rounds[candidate].kind)) { replaceAt = candidate; break; }
    }
    if (replaceAt >= 0) rounds.splice(replaceAt, 1, required);
  }
  if (readySentence) rounds.push({
    kind: 'sentence', unitId: readySentence.unit.id, sentenceKey: sentenceKey(readySentence.unit.id, readySentence.sentence),
    prompt: readySentence.sentence.es, answer: readySentence.sentence.en, choices: [],
  });
  if (!readySentence) {
    const spoken = readSentenceMemories(userId).find((item) => completedIds.has(item.unitId) && Date.parse(item.nextReviewAt) <= Date.now() && !allChunks.some((chunk) => chunk.sentenceEn === item.sentenceEn && chunk.unitId === item.unitId));
    if (spoken) rounds.push({ kind: 'sentence', unitId: spoken.unitId, sentenceKey: spoken.key, prompt: spoken.sentenceEs, answer: spoken.sentenceEn, choices: [] });
  }
  return rounds;
}

export function DailyArcade({ userId, units, preview = false, inspectionMode = false, onExit, onContinue }: {
  userId: string;
  units: AtomicUnit[];
  preview?: boolean;
  inspectionMode?: boolean;
  onExit: () => void;
  onContinue: () => void;
}) {
  const deck = useMemo(() => makeDeck(userId, units, preview), [userId, units, preview]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'missed'>('idle');
  const [choicesReady, setChoicesReady] = useState(false);
  const [typed, setTyped] = useState('');
  const [cueShown, setCueShown] = useState(false);
  const [gentleMode, setGentleMode] = useState(false);
  const [seconds, setSeconds] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [fatigue, setFatigue] = useState({ consecutiveMisses: 0, totalResponseMs: 0, answered: 0, cueUses: 0, abandonedPrompts: 0 });
  const locked = useRef(false);
  const nextTimer = useRef<number | null>(null);
  const questionStartedAt = useRef(performance.now());
  const question = deck[index];

  useEffect(() => {
    if (!question) return undefined;
    locked.current = false;
    setFeedback('idle');
    setChoicesReady(false);
    setTyped('');
    setCueShown(false);
    const cueTimer = question.kind === 'complete' ? window.setTimeout(() => setCueShown(true), 8000) : null;
    questionStartedAt.current = performance.now();
    if (nextTimer.current !== null) window.clearTimeout(nextTimer.current);
    const duration = gentleMode ? null : challengeDuration(question);
    setSeconds(duration ? duration / 1000 : 0);
    if (question.kind === 'audio' && question.word) void playEnglish(question.word.en, question.word.audioUrl);
    let tick: number | null = null;
    let timeout: number | null = null;
    const begin = () => {
      setChoicesReady(true);
      if (duration === null) return;
      const started = performance.now();
      tick = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((duration - (performance.now() - started)) / 1000))), 100);
      timeout = window.setTimeout(() => answer(null), duration);
    };
    const reveal = window.setTimeout(begin, question.kind === 'audio' ? 800 : 0);
    return () => { window.clearTimeout(reveal); if (cueTimer !== null) window.clearTimeout(cueTimer); if (tick !== null) window.clearInterval(tick); if (timeout !== null) window.clearTimeout(timeout); stopSpeech(); };
    // Each question owns its timer and answer closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, question]);

  useEffect(() => () => { if (nextTimer.current !== null) window.clearTimeout(nextTimer.current); }, []);

  function answer(choice: string | null) {
    if (!question || locked.current) return;
    locked.current = true;
    const right = question.kind === 'sentence' || question.kind === 'conversation'
      ? (question.acceptedAnswers ?? [question.answer]).some((answer) => normalizeSentenceAnswer(choice ?? '') === normalizeSentenceAnswer(answer))
      : choice?.trim().toLocaleLowerCase('en-US') === question.answer.trim().toLocaleLowerCase('en-US');
    setFeedback(right ? 'correct' : 'missed');
    const responseMs = Math.max(0, performance.now() - questionStartedAt.current);
    if (shouldReduceDifficulty({ consecutiveMisses: right ? 0 : fatigue.consecutiveMisses + 1, averageResponseMs: (fatigue.totalResponseMs + responseMs) / (fatigue.answered + 1), cueDependency: (fatigue.cueUses + Number(cueShown)) / (fatigue.answered + 1), abandonedPrompts: fatigue.abandonedPrompts + Number(choice === null) })) setGentleMode(true);
    const usedCue = cueShown || Boolean(question.visualCue);
    if (!preview && !inspectionMode) {
      const source = units.find((unit) => unit.id === question.unitId || question.word && unit.words.some((word) => word.en === question.word!.en) || unit.communication?.practicePrompt === question.prompt);
      recordLearningActivity(userId, { unitId: source?.id ?? 'daily-arcade', unitTitle: source?.title ?? 'Ráfaga de repaso', contentVersion: source?.contentVersion ?? '1', activityId: `arcade-${question.kind}`, skill: question.word?.en ?? question.answer, phase: 'arcade', source: 'learner', modality: question.choices.length ? 'choice' : 'writing', prompt: question.prompt, response: choice ?? '(sin respuesta)', expected: question.answer, correct: right, helped: usedCue || question.choices.length > 0, feedback: right ? 'Respuesta admitida en el repaso.' : question.word?.scene ?? `Modelo: ${question.answer}` });
    }
    setFatigue((current) => ({
      consecutiveMisses: right ? 0 : current.consecutiveMisses + 1,
      totalResponseMs: current.totalResponseMs + responseMs,
      answered: current.answered + 1,
      cueUses: current.cueUses + Number(usedCue),
      abandonedPrompts: current.abandonedPrompts + Number(choice === null),
    }));
    setCorrectCount((value) => value + Number(right));
    setCombo((value) => right ? value + 1 : 0);
    if (right) playSnap(); else playMiss();
    if (question.kind === 'sentence' || question.kind === 'conversation') void playEnglish(question.answer);
    else if (right && question.word) void playEnglish(question.word.en, question.word.audioUrl);
    if (!preview && !inspectionMode && question.word) {
      const at = new Date();
      const direction: RecallDirection = question.kind === 'audio' ? 'auditory'
        : question.kind === 'write' || question.kind === 'complete' ? 'production'
          : question.kind === 'recognition' ? 'recognition' : 'recall';
      recordWordRecall(userId, question.word, !right ? 'missed' : !gentleMode && challengeDuration(question) !== null && seconds <= 1 ? 'hesitant' : 'quick', at, direction, !right ? question.errorType ?? (question.kind === 'audio' ? 'auditory' : direction === 'production' ? 'writing' : 'meaning') : undefined, usedCue);
      recordAttempt(userId, {
        unitId: 'daily-arcade', wordId: question.word.id, word: question.word.en, correct: right, at: at.toISOString(),
        direction, error: !right ? question.errorType ?? (question.kind === 'audio' ? 'auditory' : direction === 'production' ? 'writing' : 'meaning') : undefined,
      });
    }
    if (!preview && !inspectionMode && question.chunkKey) recordChunkRecall(userId, question.chunkKey, !right ? 'missed' : seconds <= 1 ? 'hesitant' : 'quick');
    if (!preview && !inspectionMode && question.sentenceKey) recordSentenceRecall(userId, question.sentenceKey, right ? 'quick' : 'missed');
    nextTimer.current = window.setTimeout(() => {
      if (index === deck.length - 1 && !preview && !inspectionMode) {
        recordSession(userId, {
          unitId: 'daily-arcade', completedAt: new Date().toISOString(), correct: correctCount + Number(right), attempted: deck.length,
          fatigue: {
            consecutiveMisses: right ? 0 : fatigue.consecutiveMisses + 1,
            averageResponseMs: (fatigue.totalResponseMs + responseMs) / Math.max(1, fatigue.answered + 1),
            cueDependency: (fatigue.cueUses + Number(usedCue)) / Math.max(1, fatigue.answered + 1),
            abandonedPrompts: fatigue.abandonedPrompts + Number(choice === null),
          },
        });
      }
      setIndex((value) => value + 1);
    }, question.kind === 'sentence' || question.kind === 'conversation' ? 3500 : right ? 1100 : 5000);
  }

  function submitWritten(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (choicesReady && typed.trim()) answer(typed);
  }

  return <main className="game-screen arcade-screen">
    <header className="game-topbar"><button type="button" className="activity-back" onClick={onExit}>← Inicio</button><span>MEMORA <small>· RÁFAGA</small></span><span>{deck.length ? `${Math.min(index + 1, deck.length)}/${deck.length}` : '0/0'}</span></header>
    <div className="game-progress"><span style={{ width: `${deck.length ? index / deck.length * 100 : 0}%` }} /></div>
    {inspectionMode && deck.length ? <nav className="review-nav" aria-label="Revisar rondas del Arcade"><label htmlFor="arcade-review-step">Revisar ronda</label><select id="arcade-review-step" value={Math.min(index, deck.length - 1)} onChange={(event) => setIndex(Number(event.target.value))}>{deck.map((item, round) => <option value={round} key={`${item.kind}-${round}`}>{round + 1}. {item.kind === 'chunk' ? `Chunk: ${item.prompt}` : item.kind === 'sentence' ? 'Escritura de frase' : item.kind === 'learning-language' ? 'Frase para pedir ayuda' : item.kind === 'audio' ? `Audio: ${item.word?.en ?? ''}` : item.kind === 'bridge' ? `Recuerdo: ${item.word?.es ?? ''}` : item.kind === 'complete' ? `Completar: ${item.word?.en ?? ''}` : item.kind === 'write' ? `Escribir: ${item.word?.en ?? ''}` : `Imagen: ${item.word?.en ?? ''}`}</option>)}</select><span>No guarda progreso</span></nav> : null}
    <section className="game-stage">
      {!deck.length ? <GameCard><div className="arcade-content"><p className="eyebrow">{readWordMemories(userId).length ? 'COLA ADAPTATIVA' : 'PRIMERA CONEXIÓN'}</p><h1>{readWordMemories(userId).length ? 'No hay palabras pendientes ahora.' : 'Juega una escena primero.'}</h1><p>{readWordMemories(userId).length ? 'Has consolidado tu vocabulario disponible. Vuelve más tarde o explora otra zona.' : 'Después mezclaremos lo que ya conoces.'}</p><button type="button" onClick={onContinue}>{readWordMemories(userId).length ? 'Explorar otra zona →' : 'Ir a jugar →'}</button></div></GameCard> : null}
      {question ? <GameCard key={index} className={feedback === 'missed' ? 'recall-urgent' : feedback === 'correct' ? 'recall-correct' : ''}>
        <div className="arcade-content"><p className="eyebrow">RÁFAGA · {index + 1}/{deck.length} <span>COMBO x{Math.max(1, combo)}</span>{question.reason ? <small className="arcade-reason"> · {question.reason === 'maintenance' ? 'mantenimiento' : question.reason === 'due_review' ? 'repaso pendiente' : question.reason === 'association_review' ? 'asociación en revisión' : question.reason === 'weakness' ? 'capacidad débil' : question.reason === 'contrast' ? 'confusor' : question.reason === 'conversation' ? 'conversación' : 'producción'}</small> : null}</p>
          {!gentleMode && challengeDuration(question) !== null ? <div className="recall-timer"><span style={{ width: `${seconds / (challengeDuration(question)! / 1000) * 100}%` }} /></div> : null}
          {question.kind === 'bridge' && feedback === 'missed' && question.word ? <div className="arcade-memory-rescue"><SceneVisual word={question.word} compact /><p><MnemonicSceneText word={question.word} /></p></div> : question.visualCue && question.word ? <SceneVisual word={question.word} compact hideAnswer={feedback === 'idle'} /> : question.kind === 'audio' ? <button type="button" className="arcade-audio" onClick={() => question.word && void playEnglish(question.word.en, question.word.audioUrl)} aria-label="Volver a escuchar">🔊</button> : <span className="arcade-chunk-symbol" aria-hidden="true">✦</span>}
          {question.kind === 'learning-language' ? <div className="arcade-question-language is-recall"><small>FRASE PARA PEDIR AYUDA · SIN PRISA</small><h1>{question.prompt}</h1></div> : question.kind === 'conversation' ? <div className="arcade-question-language is-recall"><small>RESPONDE EN INGLÉS</small><h1>{question.prompt}</h1></div> : question.kind === 'bridge' ? <div className="arcade-translation-prompt"><span>EN INGLÉS</span><h1>{question.prompt}</h1></div> : question.kind === 'picture' && question.instruction ? <div className={`arcade-question-language is-${question.instruction.stage}`}>
            {question.instruction.stage === 'introduce' ? <p><strong>{question.instruction.en}</strong><span>{question.instruction.es}</span></p> : null}
            {question.instruction.stage !== 'introduce' ? <small>{question.instruction.stage === 'supported' ? question.instruction.es : question.instruction.en}</small> : null}
            <h1>{question.prompt}</h1>
          </div> : question.kind === 'chunk' ? <div className="arcade-translation-prompt"><span>EN INGLÉS</span><h1><MorphText text={question.prompt} language="es" forms={units.flatMap((unit) => unit.grammar)} /></h1></div> : <h1 className={question.kind === 'sentence' ? 'arcade-sentence-prompt' : undefined}>{question.kind === 'recognition' ? `¿Qué significa ${question.word?.en}?` : question.prompt}</h1>}
          {feedback === 'missed' ? <div className="arcade-feedback"><span>{question.bridge ? 'Pista de memoria' : 'Una forma de decirlo'}</span><strong>{question.word ? question.bridge ? `${question.bridge} → ${question.word.en} → ${question.word.es.toUpperCase()}` : `${question.word.en} · ${question.word.es}` : question.answer}</strong>{question.word ? <p><MnemonicSceneText word={question.word} /></p> : null}</div> : (question.kind === 'write' || question.kind === 'complete' || question.kind === 'sentence' || question.kind === 'conversation') && feedback === 'idle' ? <form className={`arcade-write ${question.kind === 'sentence' || question.kind === 'conversation' ? 'arcade-sentence-write' : ''}`} onSubmit={submitWritten}><label htmlFor="arcade-answer">{question.kind === 'conversation' ? 'Tu respuesta' : question.kind === 'sentence' ? 'Escríbela en inglés' : question.kind === 'complete' && cueShown ? question.scaffold : question.kind === 'complete' ? 'Escríbela sin ayuda' : 'Tu respuesta'}</label>{question.kind === 'sentence' || question.kind === 'conversation' ? <textarea id="arcade-answer" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} rows={3} /> : <input id="arcade-answer" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />}<button type="submit" disabled={!typed.trim()}>Comprobar →</button></form> : feedback === 'idle' ? <div className="arcade-options">{question.choices.map((choice) => <button type="button" key={choice} disabled={!choicesReady} onClick={() => answer(choice)}>{choicesReady ? <MorphText text={choice} language="en" forms={units.flatMap((unit) => unit.grammar)} /> : '· · ·'}</button>)}</div> : null}
          {feedback === 'correct' ? <div className="arcade-feedback">{question.kind === 'sentence' ? <><span>¡La construiste!</span><strong>{question.answer}</strong></> : '¡Conectado! ✦'}</div> : null}
        </div>
      </GameCard> : null}
      {deck.length > 0 && index >= deck.length ? <GameCard onAdvance={onContinue} advanceLabel="Seguir jugando"><div className="arcade-content arcade-finish"><span aria-hidden="true">✦</span><p className="eyebrow">RÁFAGA COMPLETA</p><h1>{correctCount}/{deck.length} conexiones</h1><p>{correctCount === deck.length ? 'Las piezas siguen contigo.' : 'Las difíciles volverán pronto.'}</p><button type="button" className="primary-action" onClick={onContinue}>Seguir jugando →</button></div></GameCard> : null}
    </section>
  </main>;
}
