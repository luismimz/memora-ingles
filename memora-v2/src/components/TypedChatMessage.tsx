import { useEffect, useRef, useState, type ReactNode } from 'react';
import { playEnglish, playSpanish } from '../services/audio';
import type { GrammarForm } from '../domain/unit';
import { GrammarText } from './GrammarText';

export interface ChatMessage { id: string; who: 'partner' | 'learner' | 'coach'; text: string; language?: 'en' | 'es'; translation?: string; audioHint?: string; correct?: boolean; instant?: boolean }
export function TypedChatMessage({ message, partner, form, autoSpeak, onReady, renderText }: { message: ChatMessage; partner: string; form: GrammarForm; autoSpeak: boolean; onReady?: () => void; renderText?: (text: string, language: 'en' | 'es') => ReactNode }) {
  const [visible, setVisible] = useState(message.instant ? message.text.length : 0);
  const ready = useRef(onReady); ready.current = onReady;
  const speak = useRef(autoSpeak); speak.current = autoSpeak;
  useEffect(() => {
    let delay: ReturnType<typeof setTimeout>; let interval: ReturnType<typeof setInterval>;
    let active = true;
    const finish = () => {
      if (!active) return;
      setVisible(message.text.length);
      if (message.who === 'partner' && speak.current) void (message.language === 'es' ? playSpanish : playEnglish)(message.text);
      ready.current?.();
    };
    if (message.instant) { setVisible(message.text.length); return; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    setVisible(0);
    delay = setTimeout(() => {
      const started = performance.now();
      const duration = Math.min(1400, Math.max(500, message.text.length * 20));
      interval = setInterval(() => {
        const count = Math.ceil(message.text.length * Math.min(1, (performance.now() - started) / duration));
        setVisible(count);
        if (count >= message.text.length) { clearInterval(interval); finish(); }
      }, 35);
    }, 400);
    return () => { active = false; clearTimeout(delay); clearInterval(interval); };
  }, [message.id, message.text, message.who, message.instant]);
  const revealed = visible >= message.text.length;
  return <article className={`chat-bubble chat-${message.who} ${message.correct === false ? 'chat-retry' : ''}`}>
    <small className="chat-speaker">{message.who === 'partner' ? partner : message.who === 'learner' ? 'Tú' : 'Memora · una pista'}</small>
    {visible === 0 && !revealed ? <div className="chat-typing" role="status"><span className="sr-only">{partner} está escribiendo</span><span aria-hidden="true">● ● ●</span></div> : <p className="chat-message-text" lang={message.who === 'coach' ? 'es' : message.language ?? 'en'}>
      {revealed ? message.who === 'coach' ? message.text : renderText ? renderText(message.text, message.language ?? 'en') : <GrammarText text={message.text} form={form} language={message.language ?? 'en'} /> : <><span aria-hidden="true">{message.text.slice(0, visible)}</span><span className="sr-only">{message.text}</span><span className="chat-cursor" aria-hidden="true" /></>}
    </p>}
    {revealed && message.translation ? <p className="chat-translation" lang="es">{renderText ? renderText(message.translation, 'es') : <GrammarText text={message.translation} form={form} language="es" />}</p> : null}
    {revealed && message.who === 'partner' ? <button type="button" className="chat-listen" aria-label={`Escuchar a ${partner}: ${message.text}`} onClick={() => void (message.language === 'es' ? playSpanish : playEnglish)(message.text)}>🔊 Escuchar</button> : null}
    {message.audioHint ? <button type="button" className="chat-audio-hint" onClick={() => void playEnglish(message.audioHint!)}>🔊 Escuchar una ayuda</button> : null}
    {message.correct === true ? <small className="chat-accepted">✓ Respuesta admitida</small> : null}
  </article>;
}
