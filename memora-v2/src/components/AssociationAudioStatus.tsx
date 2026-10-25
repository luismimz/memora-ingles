import type { AssociationAudioState } from './useAssociationAudio';

export function AssociationAudioStatus({ state, compact = false }: { state?: AssociationAudioState; compact?: boolean }) {
  if (compact) return state?.status === 'blocked' || state?.status === 'unavailable' ? <p className="association-audio-status" role="status">Audio no disponible · toca 🔊</p> : null;
  const voice = state?.source === 'browser' ? 'Voz del navegador' : state?.source === 'kokoro' ? 'Voz Kokoro' : 'Audio de la palabra';
  const text = !state ? 'Toca 🔊 para escuchar.' : state.status === 'blocked' ? 'No se completó el audio. Toca 🔊 para repetir o sigue con el texto.'
    : state.status === 'preparing' ? 'Preparando audio… Puedes seguir.'
      : state.status === 'unavailable' ? 'Audio no disponible ahora. Puedes seguir.'
        : state.status === 'playing' ? `${voice} · Reproduciendo…` : voice;
  return <p className="association-audio-status" role="status">{text}</p>;
}
