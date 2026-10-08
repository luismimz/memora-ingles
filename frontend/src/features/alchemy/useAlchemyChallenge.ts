import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react';
import { playNaturalFast } from '../../components/common';
import { afterExam, afterReview } from '../../lib/srs';
import { useStore } from '../../store';
import type { AlchemyChallenge, AlchemyToken } from './alchemy.types';

export type AlchemyStatus = 'ready' | 'dragging' | 'fusing' | 'success';

export interface AlchemyResult {
  status: AlchemyStatus;
  fused: boolean;
  feedback: string | null;
  activeTokenId: string | null;
  registerToken: (tokenId: string) => RefCallback<HTMLDivElement>;
  startDrag(tokenId: string): void;
  dropToken(token: AlchemyToken): void;
  reset(): void;
}

function overlaps(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Cerebro táctil de Alquimia. La colisión se calcula con los rectángulos
 * reales después del gesto, así funciona igual con ratón, trackpad y móvil.
 */
export function useAlchemyChallenge(challenge: AlchemyChallenge, onComplete?: (challenge: AlchemyChallenge) => void): AlchemyResult {
  const store = useStore();
  const [status, setStatus] = useState<AlchemyStatus>('ready');
  const [fused, setFused] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const elements = useRef<Record<string, HTMLDivElement | null>>({});
  const completionHandled = useRef(false);

  const registerToken = useCallback((tokenId: string): RefCallback<HTMLDivElement> => (element) => {
    elements.current[tokenId] = element;
  }, []);

  useEffect(() => {
    setStatus('ready');
    setFused(false);
    setFeedback(null);
    setActiveTokenId(null);
    completionHandled.current = false;
    elements.current = {};
  }, [challenge.id]);

  useEffect(() => {
    if (status !== 'success' || completionHandled.current) return undefined;
    completionHandled.current = true;
    void store.addXp(challenge.xp);

    const now = Date.now();
    const previous = store.progress.get(challenge.wordId);
    const next = previous ? afterReview(previous, 'ok', 0, now) : afterExam('ok', 0, now);
    void store.saveProgress(challenge.wordId, {
      ...next,
      study_day: store.today?.day ?? null,
      last_seen: new Date(now).toISOString(),
    }).catch(() => {});
    store.logAttempts([{
      word: challenge.wordId,
      study_day: store.today?.day ?? null,
      step: previous?.step ?? 0,
      kind: 'practice',
      mode: 'alchemy_fusion',
      result: 'ok',
      ms: 0,
      hours_since_learned: null,
    }]);
    onComplete?.(challenge);
  }, [challenge, onComplete, status, store]);

  useEffect(() => {
    if (status !== 'success') return undefined;
    return playNaturalFast(challenge.targetEn);
  }, [challenge.targetEn, status]);

  const startDrag = useCallback((tokenId: string) => {
    if (status === 'success' || status === 'fusing') return;
    setActiveTokenId(tokenId);
    setFeedback(null);
    setStatus('dragging');
  }, [status]);

  const dropToken = useCallback((token: AlchemyToken) => {
    if (status === 'success' || status === 'fusing') return;
    const dragged = elements.current[token.id];
    const otherPrimary = challenge.tokens.find((candidate) => candidate.role === 'primary' && candidate.id !== token.id);
    const target = otherPrimary ? elements.current[otherPrimary.id] : null;
    const collided = Boolean(dragged && target && overlaps(dragged.getBoundingClientRect(), target.getBoundingClientRect()));

    if (token.role === 'primary' && otherPrimary && collided) {
      setStatus('fusing');
      setFeedback('✨ ¡Fusión perfecta!');
      window.setTimeout(() => {
        setFused(true);
        setStatus('success');
        setActiveTokenId(null);
      }, 260);
      return;
    }

    setStatus('ready');
    setActiveTokenId(null);
    setFeedback(token.role === 'distractor' ? 'Esa pieza no pertenece a esta combinación.' : 'Acerca una pieza principal a la otra para fusionarlas.');
    window.setTimeout(() => setFeedback(null), 1800);
  }, [challenge.tokens, status]);

  const reset = useCallback(() => {
    setStatus('ready');
    setFused(false);
    setFeedback(null);
    setActiveTokenId(null);
    completionHandled.current = false;
  }, []);

  return { status, fused, feedback, activeTokenId, registerToken, startDrag, dropToken, reset };
}
