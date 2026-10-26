import { useEffect, useRef, useState } from 'react';
import { playEnglish, playSpanish } from '../services/audio';
import type { AssociationAudioState } from './useAssociationAudio';

/** Presentation state only. The owning lesson retains speech cancellation and navigation. */
export function useSpeechPlayback() {
  const [audio, setAudio] = useState<AssociationAudioState>();
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  function reset() { request.current++; setAudio(undefined); }
  async function listen(text: string, language: 'en' | 'es' = 'en', staticAudioId?: string) {
    const token = ++request.current;
    setAudio({ status: 'preparing', source: null });
    const started = (source: AssociationAudioState['source']) => {
      if (token === request.current) setAudio({ status: 'playing', source });
    };
    try {
      const result = await (language === 'es' ? playSpanish(text, true, started) : playEnglish(text, staticAudioId, true, started));
      if (token !== request.current) return;
      setAudio(result?.status === 'cancelled' ? undefined : { status: result?.status === 'played' ? 'ready' : result?.status === 'blocked' ? 'blocked' : 'unavailable', source: result?.source ?? null });
    } catch { if (token === request.current) setAudio({ status: 'unavailable', source: null }); }
  }
  const label = audio?.status === 'preparing' ? 'Preparando…' : audio?.status === 'playing' ? 'Reproduciendo…' : 'Escuchar';
  return { audio, listen, reset, label };
}
