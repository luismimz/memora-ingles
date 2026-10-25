import { useEffect, useRef, useState } from 'react';
import { readLearningActivities } from '../domain/learningActivity';
import { projectConversations } from '../domain/conversationHistory';
import { readWordMemories, readSentenceMemories } from '../domain/memory';
import { loadLearningProfile } from '../domain/learningProfile';
import type { AtomicUnit } from '../domain/unit';
import type { UnitSummary } from '../services/directus';
import { playEnglish, playSpanish, stopSpeech } from '../services/audio';
import { syncLabels, type SyncStatus } from '../services/progressSync';
import type { Appearance } from '../useAppearance';
import './evolutionChat.css';
import { EvolutionMemoryLibrary } from './EvolutionMemoryLibrary';

export function EvolutionView({ userId, units, pilot, syncStatus, inspectionMode = false, onBack, onPractice, onProfile, onExit, appearance, onToggleAppearance }: { userId: string; units: UnitSummary[]; pilot: AtomicUnit | null; syncStatus: SyncStatus; inspectionMode?: boolean; onBack: () => void; onPractice: () => void; onProfile: () => void; onExit: () => void; appearance: Appearance; onToggleAppearance: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>();
  const records = inspectionMode ? [] : readLearningActivities(userId);
  const memories = inspectionMode ? [] : readWordMemories(userId);
  const sentences = inspectionMode ? [] : readSentenceMemories(userId);
  const profile = inspectionMode ? null : loadLearningProfile(userId, units);
  const due = profile ? profile.dueWords + profile.dueChunks + profile.dueSentences : 0;
  const nextReview = profile?.nextReviewAt && Number.isFinite(Date.parse(profile.nextReviewAt)) ? new Date(profile.nextReviewAt) : null;
  const responses = records.filter((item) => item.source === 'learner' && item.correct !== null && Number.isFinite(Date.parse(item.at)));
  const latest = [...responses].sort((left, right) => Date.parse(right.at) - Date.parse(left.at))[0];
  const independent = responses.filter((item) => item.correct === true && !item.helped && item.modality === 'writing').length;
  const assisted = responses.filter((item) => item.correct === true && (item.helped || item.modality === 'choice')).length;
  const known = pilot?.communication?.dialogue?.partner ? { [pilot.id]: pilot.communication.dialogue.partner } : {};
  const conversations = projectConversations(records, known);
  const matched = conversations.filter((chat) => `${chat.title} ${chat.messages.map((message) => `${message.text} ${message.feedback ?? ''}`).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const active = matched.find((chat) => chat.id === selected) ?? matched[0];
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [active?.id, active?.lastAt]);
  useEffect(() => () => stopSpeech(), []);
  return <main className="journey-screen evolution-screen">
    <header className="journey-header"><button type="button" className="journey-brand journey-brand-button" onClick={onBack}><span className="brand-mark">M</span><span>MEMORA</span></button><nav className="journey-menu" aria-label="Navegación principal"><button type="button" onClick={onBack}>Inicio</button><button type="button" aria-current="page">Mi evolución</button><button type="button" onClick={onProfile}>Perfil</button></nav><button type="button" className="appearance-toggle" onClick={onToggleAppearance} aria-label={`Activar modo ${appearance === 'light' ? 'oscuro' : 'claro'}`}>{appearance === 'light' ? '☾' : '☀'}</button><button type="button" className="journey-exit" onClick={onExit}>Salir</button></header>
    <section className="evolution-heading"><p className="eyebrow">MI EVOLUCIÓN</p><h1>Tu práctica, más clara.</h1><p role="status">{inspectionMode ? 'Vista de revisión · no lee ni modifica tu historial' : syncLabels[syncStatus]}</p></section>
    <section className="evolution-overview" aria-label="Resumen de mi práctica">
      <div className="evolution-last"><p className="eyebrow">{latest ? 'ÚLTIMA PRÁCTICA REGISTRADA' : 'TU PUNTO DE PARTIDA'}</p><h2>{latest?.unitTitle ?? (memories.length || sentences.length ? 'Tus recuerdos anteriores siguen aquí.' : 'Tu primer paso empieza en el recorrido.')}</h2><p>{latest ? <time dateTime={latest.at}>{new Date(latest.at).toLocaleString('es-ES')}</time> : memories.length || sentences.length ? 'No hay respuestas detalladas para este resumen. Puedes consultar las palabras y frases guardadas abajo.' : 'Una actividad cada vez. Aquí verás lo que hayas practicado, sin tener que terminar una misión completa.'}</p></div>
      <dl className="evolution-evidence"><div><dt>Respuestas registradas</dt><dd>{responses.length}</dd></div><div><dt>Aciertos escritos sin ayuda registrada</dt><dd>{independent}</dd></div><div><dt>Aciertos con ayuda u opciones</dt><dd>{assisted}</dd></div></dl>
      <p className="evolution-evidence-note">Son intentos, incluidos los reintentos; no palabras nuevas ni dominio. Consultar un modelo o cerrar una tanda no suma una respuesta.</p>
      <div className="evolution-next"><h2>¿Qué toca ahora?</h2><p>{inspectionMode ? 'La revisión no consulta ni modifica tus repasos personales.' : due > 0 ? `${due} ${due === 1 ? 'repaso sugerido' : 'repasos sugeridos'} entre palabras, piezas y frases. El recorrido prepara la siguiente actividad disponible.` : nextReview ? `Próxima oportunidad sugerida: ${nextReview.toLocaleString('es-ES')}. Puedes seguir aprendiendo antes.` : 'Vuelve al recorrido para continuar desde tu posición. No necesitas escoger entre todos los apartados.'}</p><small>El repaso estima oportunidades; no conoce el instante exacto en que olvidarás algo.</small><button type="button" className="primary-action" onClick={onBack}>{responses.length || memories.length || sentences.length ? 'Volver a mi recorrido' : 'Ir a mi recorrido'}</button></div>
    </section>
    <details className="evolution-section" onToggle={(event) => { if (event.currentTarget.open && log.current) log.current.scrollTop = log.current.scrollHeight; }}><summary>Conversaciones e intentos <small>Leer, buscar o escuchar lo que practicaste</small></summary>
    <section className="evolution-controls"><label>Buscar una conversación<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Emma, una expresión o una situación" /></label></section>
    <div className="evolution-layout history-chats"><nav className="history-list" aria-label="Mis conversaciones">{matched.map((chat) => <button type="button" key={chat.id} aria-current={active?.id === chat.id ? 'page' : undefined} onClick={() => setSelected(chat.id)}><strong>{chat.title}</strong><small>{chat.practice ? 'Trucos y Arcade · sin mezclarlos con los diálogos' : 'Un chat continuo · varias situaciones'}</small><span>{chat.messages.at(-1)?.text}</span></button>)}{!matched.length ? <p>{query.trim() ? 'No hay coincidencias.' : 'Tus conversaciones aparecerán aquí.'}</p> : null}</nav>
      <section className="history-conversation" aria-label="Intentos y correcciones"><header><h2>{active?.title ?? 'Tu próxima conversación'}</h2><p>Las repeticiones se agrupan. Los intentos originales y sus correcciones se conservan.</p></header>
        <div className="history-log" ref={log} role="log" aria-label="Conversación guardada">{active?.messages.map((message) => <article key={message.id} className={`history-bubble history-${message.who}`}><small className="history-speaker">{message.speaker}{message.who === 'partner' ? ' · Mensaje del personaje' : ''}</small><p lang={message.language}>{message.text}</p>
          {message.who === 'learner' ? <small>{message.modality === 'oral' ? 'Ensayo oral sin evaluación' : message.correct === true ? message.helped ? 'Respuesta con ayuda' : message.modality === 'choice' ? 'Reconocimiento con opciones' : 'Sin ayuda registrada' : message.correct === false ? 'Intento conservado · vuelve a intentarlo' : 'Práctica sin evaluación'}</small> : null}
          {message.feedback ? <p className="history-feedback">{message.feedback}</p> : null}
          {message.language && (message.who === 'partner' || message.who === 'learner' && message.correct === true && message.modality === 'writing') ? <button type="button" className="quiet-action" aria-label={`Escuchar ${message.language === 'es' ? 'en español' : 'en inglés'}: ${message.text}`} onClick={() => void (message.language === 'es' ? playSpanish(message.text) : playEnglish(message.text))}>🔊 Escuchar</button> : null}
          {message.who === 'partner' && !message.language ? <small>Este mensaje no tiene idioma de audio registrado.</small> : null}
          {message.parentAttemptId && message.who === 'learner' ? <small>Nuevo intento · el anterior se conserva.</small> : null}
          {message.who === 'learner' && message.attempts.length > 1 ? <details><summary>Practicada {message.attempts.length} veces · sin repetir el mensaje</summary><ul>{records.filter((record) => message.attempts.includes(record.id)).map((record) => <li key={record.id}><small>{new Date(record.at).toLocaleString('es-ES')} · {record.helped ? 'Con ayuda' : 'Sin ayuda registrada'}</small>{record.feedback ? <p>{record.feedback}</p> : null}</li>)}</ul></details> : null}
        </article>)}{!active ? <p className="evolution-empty">Al conversar en una historia, podrás volver aquí y leerla sin entrar en el juego.</p> : null}</div>
      </section>
    </div>
    </details>
    <EvolutionMemoryLibrary memories={memories} sentences={sentences} onListen={(english) => void playEnglish(english)} onPractice={onPractice} />
  </main>;
}
