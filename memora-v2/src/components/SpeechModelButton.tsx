import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';
import { useEffect } from 'react';

/** The owner cancels speech and records help in onRequest; false rejects a stale request. */
export function SpeechModelButton({ text, label = 'Escuchar modelo inglés', idleLabel = label, onRequest, onBusyChange, disabled = false, staticAudioId, language = 'en' }: { text: string; label?: string; idleLabel?: string; onRequest?: () => boolean | void; onBusyChange?: (busy:boolean)=>void; disabled?: boolean; staticAudioId?: string; language?: 'en' | 'es' }) {
  const playback = useSpeechPlayback();
  const busy=playback.audio?.status==='preparing' || playback.audio?.status==='playing';
  useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  useEffect(()=>()=>onBusyChange?.(false),[onBusyChange]);
  return <>
    <button type="button" className="quiet-action" data-feed-surface="true" disabled={disabled} aria-label={label} aria-busy={playback.audio?.status === 'preparing'} onClick={() => { if (!disabled && onRequest?.() !== false) void playback.listen(text, language, staticAudioId); }}>🔊 {playback.audio?.status === 'preparing' || playback.audio?.status === 'playing' ? playback.label : idleLabel}</button>
    <AssociationAudioStatus state={playback.audio} compact />
  </>;
}
