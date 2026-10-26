import { AnswerStudio } from './AnswerStudio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCard } from './GameCard';
import { EchoPractice } from './EchoPractice';
import { TypedChatMessage, type ChatMessage } from './TypedChatMessage';
import { getUnitSentences, type AtomicUnit } from '../domain/unit';
import { normalizeSentenceAnswer } from '../domain/sentenceAnswer';
import { acceptedConversationAnswer, conversationTurns, demonstratedConversationQuestionSkills, followingConversationTurn, restoredConversationRound, writtenConversationCorrection, type ChatTurn } from '../domain/conversation';
import { readGrammarAttempts, recordGrammarAttempt } from '../domain/grammarMemory';
import { readLearningActivities, recordLearningActivity as persistLearningActivity } from '../domain/learningActivity';
import { recordSentenceExposure } from '../domain/memory';
import { KeysScene } from './KeysScene';
import { GrammarText } from './GrammarText';
import { playSpanish, playSnap, stopSpeech } from '../services/audio';
import { MirrorText } from './MirrorPieces';
import { mirrorHint, nextMirrorHint } from '../domain/mirrorLesson';
import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';

type ChatCheckpoint = {
  version: string; round: number; messages: ChatMessage[]; activeMessage: string; busy: boolean;
  input: string; helped: boolean; hintLevel: number; awaitingNext: boolean; oral: boolean;
  revealedAnswer: boolean; savedMessages: string[]; previousAttempt?: string;
  replyTo?: string; serial: number;
  turnId?: ChatTurn['id'];
  failedAttempts?: number;
  recovery?: Omit<ChatCheckpoint, 'recovery'>;
};
const chatKey = (userId: string, unitId: string) => `memora-v2.chat-checkpoint.${userId}.${unitId}`;

function readChatCheckpoint(userId: string, unitId: string, version: string, turns: readonly ChatTurn[], stableLegacyOrder: boolean): { checkpoint: ChatCheckpoint | null; recovery?: ChatCheckpoint['recovery'] } {
  try {
    const saved = JSON.parse(localStorage.getItem(chatKey(userId, unitId)) || 'null') as ChatCheckpoint | null;
    if (!saved || saved.version !== version || !Number.isInteger(saved.round) || saved.round < 0 ||
      !Array.isArray(saved.messages) || !saved.messages.length || !Array.isArray(saved.savedMessages) ||
      !Number.isInteger(saved.serial)) return { checkpoint: null };
    const round = restoredConversationRound(saved, turns, stableLegacyOrder);
    const { recovery, ...unmatched } = saved;
    const prior = recovery && typeof recovery.input === 'string' ? recovery : undefined;
    return round === null ? { checkpoint: null, recovery: prior ?? unmatched } : { checkpoint: { ...saved, round }, recovery: prior };
  } catch { return { checkpoint: null }; }
}

/** Incoming message → learner's answer → reply. A feed gesture only advances a ready reply. */
export function ConversationPractice({ unit, userId, reviewMode, checkpointScope = 'story', skillId, initialHelped = false, vertical = false, onContinue }: { unit: AtomicUnit; userId: string; reviewMode: boolean; checkpointScope?: string; skillId?: string; initialHelped?: boolean; vertical?: boolean; onContinue: () => void }) {
  const checkpointUnitId = checkpointScope === 'story' ? unit.id : `${unit.id}:${checkpointScope}`;
  const dialogue = unit.communication!.dialogue!;
  const partnerMessage = (id: string, pair: { en: string; es?: string }): ChatMessage => dialogue.partnerLanguage === 'es'
    ? { id, who: 'partner', text: pair.es!, language: 'es' }
    : { id, who: 'partner', text: pair.en, translation: pair.es };
  const turns = useMemo(() => conversationTurns(unit, demonstratedConversationQuestionSkills(readGrammarAttempts(userId))), [unit, userId]);
  const partner = dialogue.partner ?? (unit.id === 'm1-entry-keys' ? 'Emma' : 'Alguien de casa');
  const recordLearningActivity = (owner: string, value: Parameters<typeof persistLearningActivity>[1]) => persistLearningActivity(owner, { ...value,
    responseLanguage: value.activityId.startsWith('partner-') ? dialogue.partnerLanguage ?? 'en' : value.source === 'learner' && value.modality === 'writing' ? 'en' : undefined,
    promptLanguage: value.source === 'learner' ? dialogue.partnerLanguage ?? 'en' : undefined,
    skill: skillId ?? value.skill, conversationId: `person:${partner.normalize('NFKC').trim().toLocaleLowerCase('es')}`, speaker: value.source === 'learner' ? 'Tú' : value.activityId.startsWith('partner-') ? partner : 'Memora' });
  const [restored] = useState(() => reviewMode ? { checkpoint: null } : readChatCheckpoint(userId, checkpointUnitId, unit.contentVersion ?? '1', turns, !(dialogue.roleSwap && dialogue.questionSkillId)));
  const checkpoint = restored.checkpoint;
  const [round, setRound] = useState(checkpoint?.round ?? 0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => checkpoint
    ? checkpoint.messages.map((message) => checkpoint.savedMessages.includes(message.id) ? { ...message, instant: true } : message)
    : [partnerMessage('prompt-0', turns[0].prompt!)]);
  const [activeMessage, setActiveMessage] = useState(checkpoint?.activeMessage ?? 'prompt-0');
  const [busy, setBusy] = useState(checkpoint?.busy ?? true);
  const [input, setInput] = useState(checkpoint?.input ?? '');
  const [helped, setHelped] = useState(Boolean(checkpoint?.oral || checkpoint?.helped || initialHelped));
  const [hintLevel, setHintLevel] = useState(checkpoint?.hintLevel ?? 0);
  const [awaitingNext, setAwaitingNext] = useState(checkpoint?.awaitingNext ?? false);
  const [oral, setOral] = useState(checkpoint?.oral ?? false);
  const [revealedAnswer, setRevealedAnswer] = useState(checkpoint?.revealedAnswer ?? false);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    if (Number.isInteger(checkpoint?.failedAttempts) && checkpoint!.failedAttempts! >= 0 && checkpoint!.failedAttempts! <= 2) return checkpoint!.failedAttempts!;
    const records = new Map(readLearningActivities(userId).map((event) => [event.id, event]));
    const visited = new Set<string>();
    let parent = checkpoint?.previousAttempt; let count = 0;
    while (parent && !visited.has(parent) && count < 2) {
      visited.add(parent);
      const event = records.get(parent);
      if (!event || event.unitId !== unit.id || event.contentVersion !== (unit.contentVersion ?? '1') || event.activityId !== `turn-${turns[checkpoint?.round ?? 0].id}` || event.source !== 'learner' || event.correct !== false) break;
      count++; parent = event.parentAttemptId;
    }
    return count;
  });
  const failureCount = useRef(failedAttempts);
  const helpedRef = useRef(helped);
  const needsModel = failedAttempts >= 2;
  const previousAttempt = useRef<string | undefined>(checkpoint?.previousAttempt);
  const replyTo = useRef<string | undefined>(checkpoint?.replyTo);
  const savedMessages = useRef(new Set<string>(checkpoint?.savedMessages ?? []));
  const submitted = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const serial = useRef(checkpoint?.serial ?? 0);
  const finished = useRef(false);
  const sending = useRef(false);
  const advancedTurn = useRef<number>();
  const log = useRef<HTMLDivElement>(null);
  const continueRef = useRef(onContinue); continueRef.current = onContinue;
  const turn = turns[round];
  const displayedPrompt = turn.prompt ? partnerMessage('', turn.prompt).text : turn.context;
  const form = unit.grammar[0];

  useEffect(() => {
    if (reviewMode || finished.current) return;
    const value: ChatCheckpoint = { version: unit.contentVersion ?? '1', round, turnId: turns[round]?.id, recovery: restored.recovery, messages, activeMessage, busy, input, helped,
      hintLevel, awaitingNext, oral, revealedAnswer, failedAttempts, savedMessages: [...savedMessages.current],
      previousAttempt: previousAttempt.current, replyTo: replyTo.current, serial: serial.current };
    try { localStorage.setItem(chatKey(userId, checkpointUnitId), JSON.stringify(value)); }
    catch { /* Losing a local checkpoint never blocks the conversation. */ }
  }, [reviewMode, round, messages, activeMessage, busy, input, helped, hintLevel, awaitingNext, oral, revealedAnswer, failedAttempts, unit.contentVersion, checkpointUnitId, userId]);

  useEffect(() => () => { clearTimeout(timer.current); stopSpeech(); }, []);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, activeMessage]);
  const modelAudio = useSpeechPlayback();
  const id = () => `chat-${serial.current++}`;
  function following() {
    if (advancedTurn.current === round) return;
    advancedTurn.current = round;
    stopSpeech();
    modelAudio.reset();
    clearTimeout(timer.current);
    setAwaitingNext(false);
    const next = followingConversationTurn(round, turns.length);
    if (next === null) {
      if (!finished.current) { finished.current = true; try { localStorage.removeItem(chatKey(userId, checkpointUnitId)); } catch { /* No blocker. */ } continueRef.current(); }
      return;
    }
    const nextTurn = turns[next];
    setRound(next); setInput(''); helpedRef.current = false; setHelped(false); failureCount.current = 0; setFailedAttempts(0); setHintLevel(0); setOral(false); setRevealedAnswer(false); previousAttempt.current = undefined; submitted.current = null; sending.current = false;
    if (nextTurn.prompt) {
      const incoming = `prompt-${next}`;
      setBusy(true); setActiveMessage(incoming);
      setMessages((current) => [...current, partnerMessage(incoming, nextTurn.prompt!)]);
    } else {
      setBusy(false); setActiveMessage('');
    }
  }
  function messageReady(messageId: string) {
    if (messageId !== activeMessage) return;
    if (!reviewMode && !savedMessages.current.has(messageId)) {
      savedMessages.current.add(messageId);
      const isPrompt = messageId.startsWith('prompt-');
      const text = partnerMessage(messageId, isPrompt ? turn.prompt! : turn.reply).text;
      const translation = isPrompt ? turn.prompt!.es : turn.reply.es;
      recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `partner-${messageId}`, skill: unit.mirror?.id ?? 'look-for-conversation', phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'authored', modality: 'choice', prompt: isPrompt ? turn.context : turn.expected.en, response: text, expected: '', correct: null, helped: true, feedback: `${partner}: ${translation ?? 'Mensaje del personaje'}`, parentAttemptId: isPrompt ? undefined : replyTo.current });
    }
    if (messageId.startsWith('prompt-')) { setBusy(false); return; }
    setAwaitingNext(true);
    if (vertical || dialogue.continueMode === 'manual' || revealedAnswer) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(following, 1800);
  }
  function reply(keepModelAudio = false) {
    if (!keepModelAudio) modelAudio.reset();
    setBusy(true); setOral(false); setInput('');
    const incoming = `reply-${round}`;
    setActiveMessage(incoming);
    setMessages((current) => [...current, partnerMessage(incoming, turn.reply)]);
  }
  function answer() {
    if (busy || failureCount.current >= 2 || sending.current || !input.trim() || submitted.current === input) return;
    modelAudio.reset();
    submitted.current = input;
    const ok = acceptedConversationAnswer(unit, turn, input);
    sending.current = ok;
    const correction = unit.mirror && dialogue.progressiveHints ? mirrorHint({ ...unit.mirror, hints: dialogue.progressiveHints }, input, nextMirrorHint(hintLevel)) : writtenConversationCorrection(input, turn.expected.en);
    if (!reviewMode) {
      const attempt = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `turn-${turn.id}`, skill: unit.mirror?.id ?? 'look-for-conversation', phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'learner', modality: 'writing', prompt: displayedPrompt, response: input, expected: turn.expected.en, correct: ok, helped: helpedRef.current, feedback: ok ? 'La frase encaja en esta situación.' : correction, parentAttemptId: previousAttempt.current });
      replyTo.current = attempt.id;
      previousAttempt.current = ok ? undefined : attempt.id;
      recordGrammarAttempt(userId, { skill: skillId ?? `dialogue:${unit.id}`, unitId: unit.id, check: turn.expected.role, kind: 'write', correct: ok, helped: helpedRef.current, at: new Date().toISOString() });
      if (ok) recordSentenceExposure(userId, unit.id, { en: turn.expected.en, es: turn.expected.es, slots: [], pronunciationTip: dialogue.rhythmTip });
    }
    setMessages((current) => [...current, { id: id(), who: 'learner', text: input, correct: ok, instant: true }, ...(!ok ? [{ id: id(), who: 'coach' as const, text: correction, instant: true }] : [])]);
    if (!ok) {
      failureCount.current++; setFailedAttempts(failureCount.current);
      helpedRef.current = true;
      setHelped(true); setHintLevel((value) => Math.min(3, value + 1));
      if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-hint-${turn.id}-${Math.min(3, hintLevel + 1)}`, skill: unit.mirror?.id ?? unit.id, phase: 'dialogue', source: 'authored', modality: 'choice', prompt: displayedPrompt, response: correction, expected: '', correct: null, helped: true, feedback: 'Corrección escrita contextual; el alumno puede volver a intentar o pasar.', parentAttemptId: previousAttempt.current });
      void playSpanish(correction);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { submitted.current = null; }, 350);
      return;
    }
    stopSpeech(); playSnap(); reply();
  }
  function oralReply() {
    if (busy || sending.current) return;
    sending.current = true;
    if (!reviewMode) replyTo.current = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `oral-${turn.id}`, skill: unit.mirror?.id ?? 'look-for-conversation', phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'learner', modality: 'oral', prompt: displayedPrompt, response: 'Continuación oral sin transcripción ni verificación.', expected: turn.expected.en, correct: null, helped: true, feedback: 'La grabación es temporal y no se evalúa ni se sube.' }).id;
    setMessages((current) => [...current, { id: id(), who: 'coach', text: 'Ensayo oral sin evaluación. No se registra como un acierto.', instant: true }]);
    reply();
  }
  function chooseOral(value: boolean) {
    stopSpeech(); modelAudio.reset();
    // The oral rehearsal exposes the model, even if the learner later writes.
    if (value) { helpedRef.current = true; setHelped(true); }
    setOral(value);
  }
  function hint() {
    if (busy || sending.current) return;
    helpedRef.current = true;
    setHelped(true);
    if (turn.id !== 'ask' && dialogue.progressiveHints) {
      const next = Math.min(3, hintLevel + 1); const cue = dialogue.progressiveHints[next - 1]; setHintLevel(next);
      setMessages((current) => [...current, { id: id(), who: 'coach', text: cue, instant: true }]);
      if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-hint-${next}`, skill: unit.mirror?.id ?? unit.id, phase: 'dialogue', source: 'authored', modality: 'choice', prompt: displayedPrompt, response: cue, expected: '', correct: null, helped: true, feedback: `Pista ${next} de 3`, parentAttemptId: previousAttempt.current });
      return;
    }
    const next = Math.min(hintLevel + 1, 3);
    setHintLevel(next);
    const chunks = turn.id === 'respond' ? unit.sentence.slots.map((slot) => slot.en.replace(/[.!?]$/u, '')) : turn.expected.en.split(/\s+/u);
    const cue = next === 1 ? `Empieza por «${chunks[0]}».` : next === 2 ? `Sigue con «${chunks.slice(0, Math.min(2, chunks.length)).join(' ')}».` : `Modelo completo: ${turn.expected.en}`;
    setMessages((current) => [...current, { id: id(), who: 'coach', text: cue, instant: true }]);
    if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-written-hint-${turn.id}-${next}`, skill: unit.mirror?.id ?? unit.id, phase: 'dialogue', source: 'authored', modality: 'choice', prompt: displayedPrompt, response: cue, expected: '', correct: null, helped: true, feedback: `Pista escrita ${next} de 3`, parentAttemptId: previousAttempt.current });
  }
  function showAnswerAndPass() {
    if (busy || revealedAnswer || sending.current) return;
    sending.current = true;
    helpedRef.current = true;
    setHelped(true);
    setRevealedAnswer(true);
    setMessages((current) => [...current, { id: id(), who: 'coach', text: `Así se dice: ${turn.expected.en} (${turn.expected.es})`, audioHint: turn.expected.en, instant: true }]);
    void modelAudio.listen(turn.expected.en);
    if (!reviewMode) replyTo.current = recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-skip-${turn.id}`, skill: unit.mirror?.id ?? unit.id, phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'learner', modality: 'choice', prompt: displayedPrompt, response: '(pasó con modelo)', expected: turn.expected.en, correct: null, helped: true, feedback: 'Se mostró la respuesta; no cuenta como acierto.', parentAttemptId: previousAttempt.current }).id;
    reply(true);
  }
  function listenToModel() {
    if (busy || sending.current) return;
    helpedRef.current = true;
    setHelped(true);
    if (!reviewMode) recordLearningActivity(userId, { unitId: unit.id, unitTitle: unit.title, contentVersion: unit.contentVersion ?? '1', activityId: `chat-audio-hint-${turn.id}`, skill: unit.mirror?.id ?? unit.id, phase: turn.id === 'transfer' ? 'transfer' : 'dialogue', source: 'authored', modality: 'choice', prompt: displayedPrompt, response: 'Modelo inglés solicitado como ayuda; no acredita escucha.', expected: '', correct: null, helped: true, parentAttemptId: previousAttempt.current });
    void modelAudio.listen(turn.expected.en);
  }
  const followingLabel = followingConversationTurn(round, turns.length) === null ? 'Terminar la conversación →' : 'Seguir conversando →';
  // Keep this turn in view; earlier exchanges remain available without replaying them.
  const promptIndex = messages.findIndex((message) => message.id === `prompt-${round}`);
  const previousReplyIndex = messages.findIndex((message) => message.id === `reply-${round - 1}`);
  const turnStart = promptIndex >= 0 ? promptIndex : previousReplyIndex >= 0 ? previousReplyIndex + 1 : 0;
  const turnMessages = messages.slice(turnStart);
  // Keep unsuccessful drafts and older cues available, not stacked over the task.
  const archivedCues = vertical ? turnMessages.filter((message) => message.who === 'learner' && message.correct === false || message.who === 'coach' && !message.audioHint) : [];
  const visibleMessages = turnMessages.filter((message) => !archivedCues.includes(message));
  const lastMessage = turnMessages.at(-1);
  const inlineCue = vertical && !busy && !awaitingNext && !needsModel && lastMessage?.who === 'coach' && !lastMessage.audioHint ? lastMessage.text : undefined;
  const messageView = (message: ChatMessage, historical = false) => {
    const active = !historical && !message.instant && message.id === activeMessage;
    // The model already owns the voice when passing with help. Keep the reply
    // readable and ready, without cancelling that pronunciation model.
    const modelPlayback = !historical && revealedAnswer && message.who === 'coach' && message.audioHint === turn.expected.en ? modelAudio : undefined;
    return <TypedChatMessage key={message.id} message={historical ? { ...message, instant: true } : message} partner={partner} form={form} renderText={unit.mirror ? (text, language) => <MirrorText text={text} lesson={unit.mirror!} language={language} /> : undefined} autoSpeak={active && !revealedAnswer} onReady={active ? () => messageReady(message.id) : undefined} audioPlayback={modelPlayback} />;
  };
  const oralPractice = <div className="chat-oral">
    <p lang="es">{unit.mirror ? <MirrorText text={turn.expected.es} lesson={unit.mirror} language="es" /> : <GrammarText text={turn.expected.es} form={form} language="es" />}</p>
    <p className="coach-row" lang="en">{unit.mirror ? <MirrorText text={turn.expected.en} lesson={unit.mirror} language="en" /> : <GrammarText text={turn.expected.en} form={form} language="en" />}</p>
    <EchoPractice phrase={turn.expected.en} parts={getUnitSentences(unit).find((sentence) => normalizeSentenceAnswer(sentence.en) === normalizeSentenceAnswer(turn.expected.en) && normalizeSentenceAnswer(sentence.slots.map((slot) => slot.en).join(' ')) === normalizeSentenceAnswer(turn.expected.en))?.slots.map((slot) => slot.en)} />
    <button type="button" onClick={oralReply}>Seguir sin evaluación oral →</button>
    <button type="button" className="quiet-action" onClick={() => chooseOral(false)}>Prefiero escribir</button>
  </div>;
  return <GameCard feedback={awaitingNext ? !revealedAnswer && turnMessages.some((message) => message.who === 'learner' && message.correct === true) ? 'correct' : 'model' : needsModel ? 'model' : inlineCue ? 'retry' : undefined} vertical={vertical} stepKey={`chat:${round}:${awaitingNext ? 'reply' : 'answer'}`} onAdvance={vertical && awaitingNext ? following : undefined} advanceLabel={followingLabel} className={`conversation-card chat-card ${turns.length === 1 ? 'chat-single-turn' : ''}`}>
    <div className="conversation-content chat-content">
      <header className="chat-header"><span className="chat-avatar" aria-hidden="true">{partner[0]}</span><div><strong>{partner}</strong>{!vertical || turns.length > 1 ? <small>{turn.id === 'ask' ? 'Ahora preguntas tú' : turn.id === 'transfer' ? 'Otra situación' : 'Una conversación en casa'}</small> : null}</div>{!vertical || turns.length > 1 ? <span>{round + 1}/{turns.length}</span> : null}</header>
      <div className="chat-scene">{unit.id === 'm1-entry-keys' ? <KeysScene found={round >= 1} focus={turn.id === 'transfer' ? 'phone' : 'key'} /> : null}{vertical ? <details className="chat-context"><summary>Situación</summary><p>{turn.context}</p></details> : <p>{turn.context}</p>}</div>
      {restored.recovery?.input ? <details className="chat-recovered-draft"><summary>Borrador anterior guardado</summary><p>El recorrido cambió y no podemos asignar este borrador con seguridad. Lo conservamos sin enviarlo a otro turno.</p><p lang="en">{restored.recovery.input}</p></details> : null}
      <div className="chat-log" ref={log} role="log" aria-label={`Conversación con ${partner}`} aria-live="polite" aria-relevant="additions">
        {visibleMessages.map((message) => messageView(message))}
      </div>
      {awaitingNext ? vertical ? <p className="chat-flow-ready" role="status">Mensaje recibido. Puedes seguir cuando quieras.</p> : <button type="button" className="primary-action" onClick={following}>{followingLabel}</button> : busy && activeMessage === `reply-${round}` ? <p className="chat-reply-pending" role="status">{partner} está respondiendo…</p> : needsModel ? <div className="chat-rescue"><p>Tu intento queda guardado. No necesitas repetirlo más ahora.</p><button type="button" className="primary-action" disabled={busy} onClick={showAnswerAndPass}>Ver el modelo y seguir →</button></div> : oral ? oralPractice : <AnswerStudio feedback={inlineCue} id="dialogue-answer" taskKey={`${unit.id}:${unit.contentVersion}:${turn.id}`} target={unit.mirror ? <MirrorText text={turn.expected.es} lesson={unit.mirror} language="es" /> : <GrammarText text={turn.expected.es} form={form} language="es" />} value={input} onChange={(value) => { setInput(value); submitted.current = null; }} onAnswer={() => answer()} accepts={(value) => acceptedConversationAnswer(unit, turn, value)} disabled={busy} />}
      {vertical && failedAttempts > 0 && !busy && !awaitingNext && !needsModel && !oral ? <button type="button" className="quiet-action chat-repair-exit" onClick={showAnswerAndPass}>Seguir con el modelo</button> : null}
      {archivedCues.length ? <details className="chat-history"><summary>Intentos y pistas</summary><div>{archivedCues.map((message) => messageView(message, true))}</div></details> : null}
      {!awaitingNext && !needsModel ? <details className="chat-help"><summary>¿Necesitas ayuda u otra forma de responder?</summary><div className="chat-tools"><button type="button" className="quiet-action" disabled={busy} onClick={hint}>Pista escrita</button><div><button type="button" className="quiet-action" disabled={busy} aria-label="Escuchar modelo" aria-busy={modelAudio.audio?.status === 'preparing'} onClick={listenToModel}>🔊 {modelAudio.label === 'Escuchar' ? 'Escuchar modelo' : modelAudio.label}</button><AssociationAudioStatus state={modelAudio.audio} compact /></div><button type="button" className="quiet-action" disabled={busy} onClick={() => chooseOral(!oral)}>{oral ? 'Escribir' : 'Prefiero hablar'}</button>{!vertical || failedAttempts === 0 || oral ? <button type="button" className="quiet-action" disabled={busy} onClick={showAnswerAndPass}>Ver respuesta y pasar</button> : null}</div></details> : null}
      {turnStart > 0 ? <details className="chat-history"><summary>Ver conversación anterior</summary><div>{messages.slice(0, turnStart).map((message) => messageView(message, true))}</div></details> : null}
    </div>
  </GameCard>;
}
