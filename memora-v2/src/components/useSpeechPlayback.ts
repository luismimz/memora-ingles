import { useEffect, useRef, useState } from 'react';
import { playEnglish, playSpanish, type PlaybackResult } from '../services/audio';
import type { AssociationAudioState } from './useAssociationAudio';

/** Presentation state only. The owning lesson retains speech cancellation and navigation. */
export function useSpeechPlayback() {
  const [audio, setAudio] = useState<AssociationAudioState>();
  const request = useRef(0);
  const failedModel = useRef('');
  useEffect(() => () => { request.current++; }, []);
  function reset() { request.current++; failedModel.current = ''; setAudio(undefined); }
  async function listen(text: string, language: 'en' | 'es' = 'en', staticAudioId?: string): Promise<PlaybackResult | undefined> {
    const key = JSON.stringify([text, language, staticAudioId]);
    const retryWithDevice = failedModel.current === key;
    const token = ++request.current;
    setAudio({ status: 'preparing', source: null });
    const started = (source: AssociationAudioState['source']) => {
      if (token === request.current) setAudio({ status: 'playing', source });
    };
    try {
      const result = await (language === 'es' ? retryWithDevice ? playSpanish(text, true, started, true) : playSpanish(text, true, started) : retryWithDevice ? playEnglish(text, staticAudioId, true, started, true) : playEnglish(text, staticAudioId, true, started));
      if (token !== request.current) return;
      failedModel.current = result?.status === 'blocked' || result?.status === 'unavailable' ? key : '';
      setAudio(result?.status === 'cancelled' ? undefined : { status: result?.status === 'played' ? 'ready' : result?.status === 'blocked' ? 'blocked' : 'unavailable', source: result?.source ?? null });
      return result;
    } catch {
      if (token !== request.current) return;
      failedModel.current = key;
      setAudio({ status: 'unavailable', source: null });
      return { status: 'unavailable', source: null };
    }
  }
  const label = audio?.status === 'preparing' ? 'Preparando…' : audio?.status === 'playing' ? 'Reproduciendo…' : 'Escuchar';
  return { audio, listen, reset, label };
}
