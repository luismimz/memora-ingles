import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';

/** The owner cancels speech and records help in onRequest; false rejects a stale request. */
export function SpeechModelButton({ text, label = 'Escuchar modelo inglés', idleLabel = label, onRequest }: { text: string; label?: string; idleLabel?: string; onRequest?: () => boolean | void }) {
  const playback = useSpeechPlayback();
  return <>
    <button type="button" className="quiet-action" aria-label={label} aria-busy={playback.audio?.status === 'preparing'} onClick={() => { if (onRequest?.() !== false) void playback.listen(text); }}>🔊 {playback.audio?.status === 'preparing' || playback.audio?.status === 'playing' ? playback.label : idleLabel}</button>
    <AssociationAudioStatus state={playback.audio} compact />
  </>;
}
