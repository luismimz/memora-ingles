import type { AssociationAudioState } from './useAssociationAudio';

export function AssociationAudioStatus({ state }: { state?: AssociationAudioState }) {
  const voice = state?.source === 'browser' ? 'Voz del navegador' : state?.source === 'kokoro' ? 'Voz Kokoro' : 'Audio de la palabra';
  const text = !state || state.status === 'blocked' ? 'Toca 🔊 para escuchar.'
    : state.status === 'preparing' ? 'Preparando audio… Puedes seguir.'
      : state.status === 'unavailable' ? 'Audio no disponible ahora. Puedes seguir.'
        : state.status === 'playing' ? `${voice} · Escuchando…` : voice;
  return <p className="association-audio-status" role="status">{text}</p>;
}
