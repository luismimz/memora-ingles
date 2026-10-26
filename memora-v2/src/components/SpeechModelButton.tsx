import { useSpeechPlayback } from './useSpeechPlayback';
import { AssociationAudioStatus } from './AssociationAudioStatus';

/** Presentation only; the owning activity cancels speech and keeps navigation/progress. */
export function SpeechModelButton({ text, label = 'Escuchar modelo inglés', idleLabel = label }: { text: string; label?: string; idleLabel?: string }) {
  const playback = useSpeechPlayback();
  return <>
    <button type="button" className="quiet-action" aria-label={label} aria-busy={playback.audio?.status === 'preparing'} onClick={() => void playback.listen(text)}>🔊 {playback.audio?.status === 'preparing' || playback.audio?.status === 'playing' ? playback.label : idleLabel}</button>
    <AssociationAudioStatus state={playback.audio} compact />
  </>;
}
