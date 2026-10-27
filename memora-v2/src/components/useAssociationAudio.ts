import { useCallback, useEffect, useRef, useState } from 'react';
import type { AtomicWord } from '../domain/unit';
import { playEnglish, stopSpeech, type PlaybackResult, type SpeechSource } from '../services/audio';

export interface AssociationAudioState {
  status: 'preparing' | 'playing' | 'ready' | 'blocked' | 'unavailable';
  source: SpeechSource | null;
}

/** Audio accompanies discovery; it never gates visibility, advancement or mastery. */
export function useAssociationAudio(word: AtomicWord, autoPlay = true) {
  const [audioState, setAudioState] = useState<AssociationAudioState | undefined>(autoPlay ? { status: 'preparing', source: null } : undefined);
  const generation = useRef(0);
  const failedWord = useRef('');
  const run = useCallback(async (manual: boolean) => {
    const token = ++generation.current;
    const current = () => token === generation.current;
    const preparing = () => { if (current()) setAudioState({ status: 'preparing', source: null }); };
    const started = (source: SpeechSource) => { if (current()) setAudioState({ status: 'playing', source }); };
    const accept = (result: PlaybackResult) => {
      if (!current()) return false;
      if (result.status === 'cancelled') { setAudioState(undefined); return false; }
      if (result.status !== 'played') {
        setAudioState({ status: result.status === 'unavailable' ? 'unavailable' : 'blocked', source: result.source });
        return false;
      }
      setAudioState({ status: 'ready', source: result.source });
      return true;
    };
    preparing();
    const safe = (playback: Promise<PlaybackResult>) => playback.catch(() => ({ status: 'unavailable' as const, source: null }));
    const key = JSON.stringify([word.en, word.audioUrl]);
    const first = await safe(manual && failedWord.current === key ? playEnglish(word.en.toLowerCase(), word.audioUrl, true, started, true) : playEnglish(word.en.toLowerCase(), word.audioUrl, true, started));
    if (current()) failedWord.current = first.status === 'blocked' || first.status === 'unavailable' ? key : '';
    accept(first);
  }, [word.en, word.audioUrl]);

  useEffect(() => {
    if (!autoPlay) return;
    void run(false);
    return () => { generation.current++; stopSpeech(); };
  }, [run, autoPlay]);

  // AssociationCard stays mounted while its word assembly replaces the scene.
  // Invalidate pending narration at that boundary, not only on unmount.
  return { audioState, listen: () => { void run(true); }, cancel: () => { generation.current++; stopSpeech(); setAudioState(undefined); } };
}
