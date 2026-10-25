import { useCallback, useEffect, useRef, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import { playEnglish, playSpanish, prefetchSpanish, stopSpeech, type PlaybackResult, type SpeechSource } from '../services/audio';

export interface AssociationAudioState {
  status: 'preparing' | 'playing' | 'ready' | 'blocked' | 'unavailable';
  source: SpeechSource | null;
}

/** Audio accompanies discovery; it never gates visibility, advancement or mastery. */
export function useAssociationAudio(word: AtomicWord) {
  const [audioState, setAudioState] = useState<AssociationAudioState>({ status: 'preparing', source: null });
  const generation = useRef(0);
  const run = useCallback(async (wordOnly: boolean) => {
    const token = ++generation.current;
    const current = () => token === generation.current;
    const preparing = () => { if (current()) setAudioState({ status: 'preparing', source: null }); };
    const started = (source: SpeechSource) => { if (current()) setAudioState({ status: 'playing', source }); };
    const accept = (result: PlaybackResult) => {
      if (!current()) return false;
      if (result.status !== 'played') {
        setAudioState({ status: result.status === 'unavailable' ? 'unavailable' : 'blocked', source: result.source });
        return false;
      }
      setAudioState({ status: 'ready', source: result.source });
      return true;
    };
    preparing();
    const safe = (playback: Promise<PlaybackResult>) => playback.catch(() => ({ status: 'unavailable' as const, source: null }));
    const first = await safe(playEnglish(word.en.toLowerCase(), word.audioUrl, true, started));
    if (!accept(first) || wordOnly || word.associationMode === 'cognate') return;
    preparing();
    if (!accept(await safe(playSpanish(word.scene, true, started)))) return;
    preparing();
    accept(await safe(playEnglish(word.en.toLowerCase(), word.audioUrl, true, started)));
  }, [word.en, word.audioUrl, word.scene, word.associationMode]);

  useEffect(() => {
    void run(false);
    if (word.associationMode !== 'cognate') prefetchSpanish(word.scene);
    return () => { generation.current++; stopSpeech(); };
  }, [run, word.associationMode, word.scene]);

  // AssociationCard stays mounted while its word assembly replaces the scene.
  // Invalidate pending narration at that boundary, not only on unmount.
  return { audioState, listen: () => { void run(true); }, cancel: () => { generation.current++; stopSpeech(); } };
}
