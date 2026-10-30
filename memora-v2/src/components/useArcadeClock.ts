import { useEffect, useRef, useState } from 'react';
import { stopSpeech } from '../services/audio';

export const arcadeCheckpointDue = (completed: number, acknowledged: number, interval = 15) => completed > 0 && interval > 0 && completed % interval === 0 && completed !== acknowledged;

/** One clock for vocabulary and grammar. Choosing an answer ends the question immediately. */
export function useArcadeClock(index: number, revealed: boolean, enabled: boolean, onExpire: () => void, onAdvance: () => void, feedbackMs: number, durationMs = 6000, checkpointEvery = 15, calm = false, manualFeedback = calm) {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.visibilityState === 'hidden');
  const [remaining, setRemaining] = useState(durationMs);
  const [acknowledged, setAcknowledged] = useState(0);
  const left = useRef(durationMs);
  const expire = useRef(onExpire); expire.current = onExpire;
  const advance = useRef(onAdvance); advance.current = onAdvance;
  const advanced = useRef(false);
  const checkpoint = arcadeCheckpointDue(index, acknowledged, checkpointEvery);
  useEffect(() => {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    const changed = () => {
      const next = document.visibilityState === 'hidden';
      setHidden(next);
      if (next) stopSpeech();
    };
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);
  useEffect(() => { if (paused) stopSpeech(); return () => stopSpeech(); }, [index, paused]);
  useEffect(() => { left.current = durationMs; setRemaining(durationMs); advanced.current = false; }, [index, durationMs]);
  useEffect(() => {
    if (!enabled || paused || hidden || revealed || checkpoint || calm) return;
    const deadline = performance.now() + left.current;
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      left.current = Math.max(0, deadline - performance.now()); setRemaining(left.current);
      if (left.current === 0) { window.clearInterval(timer); expire.current(); }
    }, 50);
    return () => window.clearInterval(timer);
  }, [index, enabled, paused, hidden, revealed, checkpoint, calm, durationMs]);
  useEffect(() => {
    if (!enabled || paused || hidden || !revealed || checkpoint || manualFeedback) return;
    const timer = window.setTimeout(() => { if (!advanced.current) { advanced.current = true; advance.current(); } }, feedbackMs);
    return () => window.clearTimeout(timer);
  }, [index, enabled, paused, hidden, revealed, checkpoint, feedbackMs, manualFeedback]);
  return { paused, hidden, remaining, checkpoint, advanceNow: () => { if ((calm || manualFeedback) && enabled && revealed && !paused && !hidden && !checkpoint && !advanced.current) { advanced.current = true; advance.current(); } }, togglePause: () => setPaused((value) => !value), continuePlaying: () => { setAcknowledged(index); setPaused(false); } };
}
