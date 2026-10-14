import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCard } from './GameCard';
import { EchoPractice } from './EchoPractice';
import { TypedChatMessage, type ChatMessage } from './TypedChatMessage';
import type { AtomicUnit } from '../domain/unit';
import { acceptedConversationAnswer, conversationTurns, followingConversationTurn, writtenConversationCorrection } from '../domain/conversation';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
import { recordLearningActivity as persistLearningActivity } from '../domain/learningActivity';
import { recordSentenceExposure } from '../domain/memory';
import { KeysScene } from './KeysScene';
import { GrammarText } from './GrammarText';
import { playEnglish, playSpanish, playSnap, stopSpeech } from '../services/audio';
import { MirrorText } from './MirrorPieces';
import { mirrorHint, nextMirrorHint } from '../domain/mirrorLesson';

type ChatCheckpoint = {
  version: string; round: number; messages: ChatMessage[]; activeMessage: string; busy: boolean;
  input: string; helped: boolean; hintLevel: number; awaitingNext: boolean; oral: boolean;
  revealedAnswer: boolean; savedMessages: string[]; previousAttempt?: string;
  replyTo?: string; serial: number;
};
const chatKey = (userId: string, unitId: string) => `memora-v2.chat-checkpoint.${userId}.${unitId}`;

function readChatCheckpoint(userId: string, unitId: string, version: string, turnCount: number): ChatCheckpoint | null {
  try {
    const saved = JSON.parse(localStorage.getItem(chatKey(userId, unitId)) || 'null') as ChatCheckpoint | null;
    if (!saved || saved.version !== version || !Number.isInteger(saved.round) || saved.round < 0 || saved.round >= turnCount ||
      !Array.isArray(saved.messages) || !saved.messages.length || !Array.isArray(saved.savedMessages) ||
      !Number.isInteger(saved.serial)) return null;
    return saved;
  } catch { return null; }
}

/** Incoming message → learner's answer → reply. The chat never swipes away. */
export function ConversationPractice({ unit, userId, reviewMode, checkpointScope = 'story', onContinue }: { unit: AtomicUnit; userId: string; reviewMode: boolean; checkpointScope?: string; onContinue: () => void }) {
  const checkpointUnitId = checkpointScope === 'story' ? unit.id : `${unit.id}:${checkpointScope}`;
  const dialogue = unit.communication!.dialogue!;
  const turns = useMemo(() => conversationTurns(unit, new Set(readGrammarAttempts(userId)
    .filter((attempt) => attempt.kind === 'write' && attempt.correct && !attempt.helped)
    .map((attempt) => attempt.skill))), [unit, userId]);
  const partner = dialogue.partner ?? (unit.id === 'm1-entry-keys' ? 'Emma' : 'Alguien de casa');
  const recordLearningActivity = (owner: string, value: Parameters<typeof persistLearningActivity>[1]) => persistLearningActivity(owner, { ...value, conversationId: `person:${partner.normalize('NFKC').trim().toLocaleLowerCase('es')}`, speaker: value.source === 'learner' ? 'Tú' : value.activityId.startsWith('partner-') ? partner : 'Memora' });
  const [checkpoint] = useState(() => reviewMode ? null : readChatCheckpoint(userId, checkpointUnitId, unit.contentVersion ?? '1', turns.length));
  const [round, setRound] = useState(checkpoint?.round ?? 0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => checkpoint?.messages ?? [{ id: 'prompt-0', who: 'partner', text: turns[0].prompt!.en, translation: turns[0].prompt!.es }]);
  const [activeMessage, setActiveMessage] = useState(checkpoint?.activeMessage ?? 'prompt-0');
  const [busy, setBusy] = useState(checkpoint?.busy ?? true);
  const [input, setInput] = useState(checkpoint?.input ?? '');
  const [helped, setHelped] = useState(checkpoint?.helped ?? false);
  const [hintLevel, setHintLevel] = useState(checkpoint?.hintLevel ?? 0);
  const [awaitingNext, setAwaitingNext] = useState(checkpoint?.awaitingNext ?? false);
  const [oral, setOral] = useState(checkpoint?.oral ?? false);
  const [revealedAnswer, setRevealedAnswer] = useState(checkpoint?.revealedAnswer ?? false);
  const previousAttempt = useRef<string | undefined>(checkpoint?.previousAttempt);
  const replyTo = useRef<string | undefined>(checkpoint?.replyTo);
  const savedMessages = useRef(new Set<string>(checkpoint?.savedMessages ?? []));
  const submitted = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const serial = useRef(checkpoint?.serial ?? 0);
  const finished = useRef(false);
  const sending = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const continueRef = useRef(onContinue); continueRef.current = onContinue;
  const turn = turns[round];
  const form = unit.grammar[0];

  useEffect(() => {
    if (reviewMode || finished.current) return;
    const value: ChatCheckpoint = { version: unit.contentVersion ?? '1', round, messages, activeMessage, busy, input, helped,
      hintLevel, awaitingNext, oral, revealedAnswer, savedMessages: [...savedMessages.current],
      previousAttempt: previousAttempt.current, replyTo: replyTo.current, serial: serial.current };
    try { localStorage.setItem(chatKey(userId, checkpointUnitId), JSON.stringify(value)); }
    catch { /* Losing a local checkpoint never blocks the conversation. */ }
  }, [reviewMode, round, messages, activeMessage, busy, input, helped, hintLevel, awaitingNext, oral, revealedAnswer, unit.contentVersion, checkpointUnitId, userId]);

  useEffect(() => () => { clearTimeout(timer.current); stopSpeech(); }, []);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, activeMessage]);
  const id = () => `chat-${serial.current++}`;
  function following() {
    clearTimeout(timer.current);
    setAwaitingNext(false);
    const next = followingConversationTurn(round, turns.length);
    if (next === null) {
      if (!finished.current) { finished.current = true; try { localStorage.removeItem(chatKey(userId, checkpointUnitId)); } catch { /* No blocker. */ } continueRef.current(); }
      return;
    }
    const nextTurn = turns[next];
    setRound(next); setInput(''); setHelped(false); setHintLevel(0); setOral(false); setRevealedAnswer(false); previousAttempt.current = undefined; submitted.current = null; sending.current = false;
    if (nextTurn.prompt) {
      const incoming = `prompt-${next}`;
      setBusy(true); setActiveMessage(incoming);
      setMessages((current) => [...current, { id: incoming, who: 'partner', text: nextTurn.prompt!.en, translation: nextTurn.prompt!.es }]);
    } else {
      setBusy(false); setActiveMessage('');
    }
  }
  function messageReady(messageId: string) {
    if (messageId !== activeMessage) return;
    if (!reviewMode && !savedMessages.current.has(messageId)) {
      savedMessages.current.add(messageId);
      const isPrompt = messageId.startsWith('prompt-');
      const text = isPrompt ? turn.prompt!.en : turn.reply.en;
      const translation = isPrompt ? turn.prompt!.es : turn.reply.es;
      recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `partner-${messageId}`, skill: unit.mirror?.id ?? 'look-for-conversation', phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'authored', modality: 'choice', prompt: isPrompt ? turn.context : turn.expected.en, response: text, expected: '', correct: null, helped: true, feedback: `${partner}: ${translation ?? 'Mensaje del personaje'}`, parentAttemptId: isPrompt ? undefined : replyTo.current });
    }
    if (messageId.startsWith('prompt-')) { setBusy(false); return; }
    setAwaitingNext(true);
    if (dialogue.continueMode === 'manual' || revealedAnswer) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(following, 1800);
  }
  function reply() {
    setBusy(true); setOral(false); setInput('');
    const incoming = `reply-${round}`;
    setActiveMessage(incoming);
    setMessages((current) => [...current, { id: incoming, who: 'partner', text: turn.reply.en, translation: turn.reply.es }]);
  }
  function answer() {
    if (busy || sending.current || !input.trim() || submitted.current === input) return;
    submitted.current = input;
    const ok = acceptedConversationAnswer(unit, turn, input);
    sending.current = ok;
    const correction = unit.mirror && dialogue.progressiveHints ? mirrorHint({ ...unit.mirror, hints: dialogue.progressiveHints }, input, nextMirrorHint(hintLevel)) : writtenConversationCorrection(input, turn.expected.en);
    if (!reviewMode) {
      const attempt = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `turn-${turn.id}`, skill: unit.mirror?.id ?? 'look-for-conversation', phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'learner', modality: 'writing', prompt: turn.prompt?.en ?? turn.context, response: input, expected: turn.expected.en, correct: ok, helped, feedback: ok ? 'La frase encaja en esta situación.' : correction, parentAttemptId: previousAttempt.current });
      replyTo.current = attempt.id;
      previousAttempt.current = ok ? undefined : attempt.id;
      recordGrammarAttempt(userId, { skill: `dialogue:${unit.id}`, unitId: unit.id, check: turn.expected.role, kind: 'write', correct: ok, helped, at: new Date().toISOString() });
      if (ok) recordSentenceExposure(userId, unit.id, { en: turn.expected.en, es: turn.expected.es, slots: [], pronunciationTip: dialogue.rhythmTip });
    }
    setMessages((current) => [...current, { id: id(), who: 'learner', text: input, correct: ok, instant: true }, ...(!ok ? [{ id: id(), who: 'coach' as const, text: correction, instant: true }] : [])]);
    if (!ok) {
      setHelped(true); setHintLevel((value) => Math.min(3, value + 1));
      if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-hint-${turn.id}-${Math.min(3, hintLevel + 1)}`, skill: unit.mirror?.id ?? unit.id, phase: 'dialogue', source: 'authored', modality: 'choice', prompt: turn.prompt?.en ?? turn.context, response: correction, expected: '', correct: null, helped: true, feedback: 'Corrección escrita contextual; el alumno puede volver a intentar o pasar.', parentAttemptId: previousAttempt.current });
      void playSpanish(correction);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { submitted.current = null; }, 350);
      return;
    }
    playSnap(); reply();
  }
  function oralReply() {
    if (busy || sending.current) return;
    sending.current = true;
    if (!reviewMode) replyTo.current = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `oral-${turn.id}`, skill: unit.mirror?.id ?? 'look-for-conversation', phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'learner', modality: 'oral', prompt: turn.prompt?.en ?? turn.context, response: 'Continuación oral sin transcripción ni verificación.', expected: turn.expected.en, correct: null, helped: true, feedback: 'La grabación es temporal y no se evalúa ni se sube.' }).id;
    setMessages((current) => [...current, { id: id(), who: 'coach', text: 'Ensayo oral sin evaluación. No se registra como un acierto.', instant: true }]);
    reply();
  }
  function hint() {
    setHelped(true);
    if (turn.id !== 'ask' && dialogue.progressiveHints) {
      const next = Math.min(3, hintLevel + 1); const cue = dialogue.progressiveHints[next - 1]; setHintLevel(next);
      setMessages((current) => [...current, { id: id(), who: 'coach', text: cue, instant: true }]);
      if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-hint-${next}`, skill: unit.mirror?.id ?? unit.id, phase: 'dialogue', source: 'authored', modality: 'choice', prompt: turn.prompt?.en ?? turn.context, response: cue, expected: '', correct: null, helped: true, feedback: `Pista ${next} de 3`, parentAttemptId: previousAttempt.current });
      return;
    }
    const next = Math.min(hintLevel + 1, 3);
    setHintLevel(next);
    const chunks = turn.id === 'respond' ? unit.sentence.slots.map((slot) => slot.en.replace(/[.!?]$/u, '')) : turn.expected.en.split(/\s+/u);
    const cue = next === 1 ? `Empieza por «${chunks[0]}».` : next === 2 ? `Sigue con «${chunks.slice(0, Math.min(2, chunks.length)).join(' ')}».` : `Modelo completo: ${turn.expected.en}`;
    setMessages((current) => [...current, { id: id(), who: 'coach', text: cue, instant: true }]);
    if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-written-hint-${turn.id}-${next}`, skill: unit.mirror?.id ?? unit.id, phase: 'dialogue', source: 'authored', modality: 'choice', prompt: turn.prompt?.en ?? turn.context, response: cue, expected: '', correct: null, helped: true, feedback: `Pista escrita ${next} de 3`, parentAttemptId: previousAttempt.current });
  }
  function showAnswerAndPass() {
    if (busy || revealedAnswer) return;
    setHelped(true);
    setRevealedAnswer(true);
    setMessages((current) => [...current, { id: id(), who: 'coach', text: `Así se dice: ${turn.expected.en} (${turn.expected.es})`, instant: true }]);
    void playEnglish(turn.expected.en);
    if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-skip-${turn.id}`, skill: unit.mirror?.id ?? unit.id, phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'learner', modality: 'choice', prompt: turn.prompt?.en ?? turn.context, response: '(pasó con modelo)', expected: turn.expected.en, correct: null, helped: true, feedback: 'Se mostró la respuesta; no cuenta como acierto.', parentAttemptId: previousAttempt.current });
    reply();
  }
  function listenToModel() {
    setHelped(true);
    if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-audio-hint-${turn.id}`, skill: unit.mirror?.id ?? unit.id, phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'authored', modality: 'choice', prompt: turn.prompt?.en ?? turn.context, response: 'Modelo inglés escuchado como ayuda.', expected: turn.expected.en, correct: null, helped: true, parentAttemptId: previousAttempt.current });
    void playEnglish(turn.expected.en);
  }
  return <GameCard className={`conversation-card chat-card ${turns.length === 1 ? 'chat-single-turn' : ''}`}>
    <div className="conversation-content chat-content">
      <header className="chat-header"><span className="chat-avatar" aria-hidden="true">{partner[0]}</span><div><strong>{partner}</strong><small>{turn.id === 'ask' ? 'Ahora preguntas tú' : turn.id === 'transfer' ? 'Otra situación' : 'Una conversación en casa'}</small></div><span>{round + 1}/{turns.length}</span></header>
      <div className="chat-scene">{unit.id === 'm1-entry-keys' ? <KeysScene found={round >= 1} focus={turn.id === 'transfer' ? 'phone' : 'key'} /> : null}<p>{turn.context}</p></div>
      <div className="chat-log" ref={log} role="log" aria-label={`Conversación con ${partner}`} aria-live="polite" aria-relevant="additions">
        {messages.map((message) => <TypedChatMessage key={message.id} message={message} partner={partner} form={form} renderText={unit.mirror ? (text, language) => <MirrorText text={text} lesson={unit.mirror!} language={language} /> : undefined} autoSpeak={message.id === activeMessage} onReady={message.id === activeMessage ? () => messageReady(message.id) : undefined} />)}
      </div>
      {awaitingNext ? <button type="button" className="primary-action" onClick={following}>{followingConversationTurn(round, turns.length) === null ? 'Terminar la conversación →' : 'Seguir conversando →'}</button> : oral ? <div className="chat-oral"><EchoPractice phrase={turn.expected.en} /><p>Escúchate y compárate. Tu voz no recibe una nota automática.</p><button type="button" onClick={oralReply}>Seguir sin evaluación oral →</button><button type="button" className="quiet-action" onClick={() => setOral(false)}>Prefiero escribir</button></div> : <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); answer(); }}>
        <label htmlFor="dialogue-answer">{turn.id === 'ask' ? 'Pregunta en inglés' : 'Responde en inglés'}<small>{unit.mirror ? <MirrorText text={turn.expected.es} lesson={unit.mirror} language="es" /> : <GrammarText text={turn.expected.es} form={form} language="es" />}</small></label>
        <div><input id="dialogue-answer" aria-label="Tu respuesta en inglés" lang="en" value={input} onChange={(event) => { setInput(event.target.value); submitted.current = null; }} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} placeholder={busy ? 'Espera el mensaje…' : 'Escribe aquí…'} /><button type="submit" disabled={busy || !input.trim()}>Enviar <span aria-hidden="true">↑</span></button></div>
      </form>}
      {!awaitingNext ? <div className="chat-tools"><button type="button" className="quiet-action" disabled={busy} onClick={hint}>Pista escrita</button><button type="button" className="quiet-action" disabled={busy} onClick={listenToModel}>🔊 Escuchar modelo</button><button type="button" className="quiet-action" disabled={busy} onClick={() => setOral((value) => !value)}>{oral ? 'Escribir' : 'Prefiero hablar'}</button><button type="button" className="quiet-action" disabled={busy} onClick={showAnswerAndPass}>Ver respuesta y pasar</button></div> : null}
    </div>
  </GameCard>;
}
