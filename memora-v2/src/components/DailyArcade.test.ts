import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDeck } from './DailyArcade';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
describe('ráfaga adaptativa', () => {
  beforeEach(() => { const records = new Map<string, string>(); vi.stubGlobal('localStorage', { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => records.set(key, value) }); });
  it('no ofrece opciones vacías o duplicadas y mantiene producción', () => {
    const deck = makeDeck('test', reviewUnits, true);
    for (const round of deck) { expect(round.choices.every(Boolean)).toBe(true); expect(new Set(round.choices).size).toBe(round.choices.length); }
    expect(deck.some((round) => ['complete', 'write'].includes(round.kind))).toBe(true);
  });
  it('incluye preguntas cotidianas y respuestas revisadas; no evalúa Feynman por longitud', () => {
    const deck = makeDeck('test', reviewUnits, true);
    const conversation = deck.find((round) => round.kind === 'conversation');
    expect(conversation?.prompt).toBe('What are you doing?');
    expect(conversation?.acceptedAnswers?.length).toBeGreaterThan(0);
    expect(deck.some((round) => String(round.kind) === 'feynman')).toBe(false);
  });
  it('no resucita vocabulario retirado desde la memoria local', () => {
    localStorage.setItem('memora-v2.words.test', JSON.stringify([{ key: 'invalid', word: { ...previewUnit.words[0], en: 'INVALID' } }]));
    expect(makeDeck('test', [previewUnit], false).some((round) => round.word?.en === 'INVALID')).toBe(false);
  });
});
