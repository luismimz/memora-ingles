import { useEffect, useRef, useState } from 'react';
import { readLearningActivities } from '../domain/learningActivity';
import { projectConversations } from '../domain/conversationHistory';
import { readWordMemories, readSentenceMemories } from '../domain/memory';
import type { AtomicUnit } from '../domain/unit';
import type { UnitSummary } from '../services/directus';
import { playEnglish } from '../services/audio';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import type { Appearance } from '../useAppearance';
import './evolutionChat.css';

export function EvolutionView({ userId, units: _units, pilot, syncStatus, inspectionMode = false, onBack, onPractice, onProfile, onExit, appearance, onToggleAppearance }: { userId: string; units: UnitSummary[]; pilot: AtomicUnit | null; syncStatus: SyncStatus; inspectionMode?: boolean; onBack: () => void; onPractice: () => void; onProfile: () => void; onExit: () => void; appearance: Appearance; onToggleAppearance: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>();
  const records = inspectionMode ? [] : readLearningActivities(userId);
  const memories = inspectionMode ? [] : readWordMemories(userId);
  const sentences = inspectionMode ? [] : readSentenceMemories(userId);
  const known = pilot?.communication?.dialogue?.partner ? { [pilot.id]: pilot.communication.dialogue.partner } : {};
  const conversations = projectConversations(records, known);
  const matched = conversations.filter((chat) => `${chat.title} ${chat.messages.map((message) => `${message.text} ${message.feedback ?? ''}`).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const active = matched.find((chat) => chat.id === selected) ?? matched[0];
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [active?.id, active?.lastAt]);
  const independent = new Set(records.filter((item) => item.source === 'learner' && item.correct === true && !item.helped && item.modality === 'writing').map((item) => `${item.skill}:${item.response.trim().toLowerCase()}`)).size;
  return <main className="journey-screen evolution-screen">
    <header className="journey-header"><button type="button" className="journey-brand journey-brand-button" onClick={onBack}><span className="brand-mark">M</span><span>MEMORA</span></button><nav className="journey-menu" aria-label="Navegación principal"><button type="button" onClick={onBack}>Inicio</button><button type="button" aria-current="page">Mi evolución</button><button type="button" onClick={onProfile}>Perfil</button></nav><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button><button type="button" className="journey-exit" onClick={onExit}>Salir</button></header>
    <section className="evolution-heading"><p className="eyebrow">MI EVOLUCIÓN</p><h1>Tus conversaciones, juntas.</h1><p role="status">{inspectionMode ? 'Vista de revisión · no lee ni modifica tu historial' : syncLabels[syncStatus]}</p><small>{independent} respuestas escritas admitidas sin ayuda registrada · No equivale todavía a dominio.</small></section>
    <section className="evolution-controls"><label>Buscar una conversación<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Emma, una expresión o una situación" /></label></section>
    <div className="evolution-layout history-chats"><nav className="history-list" aria-label="Mis conversaciones">{matched.map((chat) => <button type="button" key={chat.id} aria-current={active?.id === chat.id ? 'page' : undefined} onClick={() => setSelected(chat.id)}><strong>{chat.title}</strong><small>{chat.practice ? 'Trucos y Arcade · sin mezclarlos con los diálogos' : 'Un chat continuo · varias situaciones'}</small><span>{chat.messages.at(-1)?.text}</span></button>)}{!matched.length ? <p>{records.length ? 'No hay coincidencias.' : 'Tus conversaciones aparecerán aquí.'}</p> : null}</nav>
      <section className="history-conversation" aria-label="Intentos y correcciones"><header><h2>{active?.title ?? 'Tu próxima conversación'}</h2><p>Las repeticiones se agrupan. Los intentos originales y sus correcciones se conservan.</p></header>
        <div className="history-log" ref={log} role="log" aria-label="Conversación guardada">{active?.messages.map((message) => <article key={message.id} className={`history-bubble history-${message.who}`}><small className="history-speaker">{message.speaker}{message.who === 'partner' ? ' · Mensaje del personaje' : ''}</small><p lang={message.who === 'coach' ? 'es' : 'en'}>{message.text}</p>
          {message.who === 'learner' ? <small>{message.modality === 'oral' ? 'Ensayo oral sin evaluación' : message.correct === true ? message.helped ? 'Respuesta con ayuda' : message.modality === 'choice' ? 'Reconocimiento con opciones' : 'Sin ayuda registrada' : message.correct === false ? 'Intento conservado · vuelve a intentarlo' : 'Práctica sin evaluación'}</small> : null}
          {message.feedback ? <p className="history-feedback">{message.feedback}</p> : null}
          {message.who === 'partner' || message.who === 'learner' && message.correct === true && message.modality === 'writing' ? <button type="button" className="quiet-action" onClick={() => void playEnglish(message.text)}>🔊 Escuchar</button> : null}
          {message.parentAttemptId && message.who === 'learner' ? <small>Nuevo intento · el anterior se conserva.</small> : null}
          {message.who === 'learner' && message.attempts.length > 1 ? <details><summary>Practicada {message.attempts.length} veces · sin repetir el mensaje</summary><ul>{records.filter((record) => message.attempts.includes(record.id)).map((record) => <li key={record.id}><small>{new Date(record.at).toLocaleString('es-ES')} · {record.helped ? 'Con ayuda' : 'Sin ayuda registrada'}</small>{record.feedback ? <p>{record.feedback}</p> : null}</li>)}</ul></details> : null}
        </article>)}{!active ? <p className="evolution-empty">Al conversar en una historia, podrás volver aquí y leerla sin entrar en el juego.</p> : null}</div>
      </section>
    </div>
    <section className="evolution-controls history-library"><details><summary>Mis recuerdos y próximos repasos</summary>{memories.map((memory) => <details key={memory.key}><summary>{memory.word.en} · {memory.word.es}</summary><p>{memory.word.scene}</p><p>{memory.word.bridge} → {memory.word.en} → {memory.word.es}</p><button type="button" onClick={() => void playEnglish(memory.word.en)}>🔊 Escuchar</button></details>)}{sentences.map((sentence) => <details key={sentence.key}><summary>{sentence.sentenceEn}</summary><p>{sentence.sentenceEs}</p><small>Próximo repaso: {new Date(sentence.nextReviewAt).toLocaleString('es-ES')}</small></details>)}</details><button type="button" className="arcade-invitation" onClick={onPractice}>✦ MEMORA ARCADE · Recuerda y úsalo</button></section>
  </main>;
}
