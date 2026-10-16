import { useEffect, useRef, useState } from 'react';
import { stopSpeech } from '../services/audio';

export const arcadeCheckpointDue = (completed: number, acknowledged: number) => completed > 0 && completed % 15 === 0 && completed !== acknowledged;

/** One clock for vocabulary and grammar. Choosing an answer ends the question immediately. */
export function useArcadeClock(index: number, revealed: boolean, enabled: boolean, onExpire: () => void, onAdvance: () => void, feedbackMs: number) {
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(6000);
  const [acknowledged, setAcknowledged] = useState(0);
  const left = useRef(6000);
  const expire = useRef(onExpire); expire.current = onExpire;
  const advance = useRef(onAdvance); advance.current = onAdvance;
  const checkpoint = arcadeCheckpointDue(index, acknowledged);
  useEffect(() => { if (paused) stopSpeech(); return () => stopSpeech(); }, [index, paused]);
  useEffect(() => { left.current = 6000; setRemaining(6000); }, [index]);
  useEffect(() => {
    if (!enabled || paused || revealed || checkpoint) return;
    const deadline = performance.now() + left.current;
    const timer = window.setInterval(() => {
      left.current = Math.max(0, deadline - performance.now()); setRemaining(left.current);
      if (left.current === 0) { window.clearInterval(timer); expire.current(); }
    }, 50);
    return () => window.clearInterval(timer);
  }, [index, enabled, paused, revealed, checkpoint]);
  useEffect(() => {
    if (!enabled || paused || !revealed || checkpoint) return;
    const timer = window.setTimeout(() => advance.current(), feedbackMs);
    return () => window.clearTimeout(timer);
  }, [index, enabled, paused, revealed, checkpoint, feedbackMs]);
  return { paused, remaining, checkpoint, togglePause: () => setPaused((value) => !value), continuePlaying: () => { setAcknowledged(index); setPaused(false); } };
}
