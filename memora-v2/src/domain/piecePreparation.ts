import type { GrammarForm, SentenceSlot } from './unit';
import type { LearningActivity } from './learningActivity';

/** Exact teaching contract; a spelling match or an old completion is not enough. */
export function piecePreparationKey(slot?: SentenceSlot, form?: GrammarForm): string | undefined {
  if (!slot?.preparation?.length || !form) return;
  return JSON.stringify([form.visualContract ?? form.id, form.placement, slot.en, slot.es, slot.note ?? '', slot.choices, slot.preparation]);
}

/** Shorten repeated teaching, not the practice or its assisted classification. */
export function canReusePiecePreparation(events: readonly LearningActivity[], slot?: SentenceSlot, form?: GrammarForm): boolean {
  const key = piecePreparationKey(slot, form);
  if (!key) return false;
  const latest = [...events].reverse().find((event) => event.phase === 'construction' && event.pieceSignature === key);
  return Boolean(latest && latest.source === 'learner' && latest.modality === 'choice' && latest.correct === true && latest.prompt === slot!.es && latest.response === slot!.en && latest.expected === slot!.en);
}
