import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';

/** The owner cancels speech and records help in onRequest; false rejects a stale request. */
export function SpeechModelButton({ text, label = 'Escuchar modelo inglés', idleLabel = label, onRequest, disabled = false, staticAudioId, language = 'en' }: { text: string; label?: string; idleLabel?: string; onRequest?: () => boolean | void; disabled?: boolean; staticAudioId?: string; language?: 'en' | 'es' }) {
  const playback = useSpeechPlayback();
  return <>
    <button type="button" className="quiet-action" disabled={disabled} aria-label={label} aria-busy={playback.audio?.status === 'preparing'} onClick={() => { if (!disabled && onRequest?.() !== false) void playback.listen(text, language, staticAudioId); }}>🔊 {playback.audio?.status === 'preparing' || playback.audio?.status === 'playing' ? playback.label : idleLabel}</button>
    <AssociationAudioStatus state={playback.audio} compact />
  </>;
}
