import { expect, it } from 'vitest';
import keys from '../../content/keys-mission.json';
import { validateUnit } from './unit';
import { keysSituationSource, prepareKeysSituation } from './keysSituation';
import { conversationTurns } from './conversation';
import { normalizeSentenceAnswer } from './sentenceAnswer';
const unit = validateUnit(keys);
it('usa los dos sentidos publicados sin depender del piloto o de gramática antigua; no inventa una palabra ausente', () => {
  const pack = { ...unit, id: 'published-word-pack', kind: 'vocabulary-pack' as const };
  expect(keysSituationSource([pack])?.id).toBe(pack.id);
  expect(prepareKeysSituation(pack)?.conversation.id).toBe(pack.id);
  expect(prepareKeysSituation({ ...unit, words: unit.words.filter((word) => word.en !== 'PHONE') })).toBeNull();
  expect(prepareKeysSituation({ ...unit, words: unit.words.map((word) => word.en === 'PHONE' ? { ...word, status: 'needs_review' } : word) })).toBeNull();
});
it('enseña todas las piezas antes de montarlas y conserva dos sentidos, no cuenta KEYS como una palabra nueva', () => {
  const before = JSON.stringify(unit), data = prepareKeysSituation(unit)!;
  expect(data.words.map((word) => word.en)).toEqual(['KEY', 'PHONE']);
  expect(normalizeSentenceAnswer(data.teaching[2].en.map((piece) => piece.text).join(''))).toBe(normalizeSentenceAnswer(data.keys.en));
  expect(data.modelOrder.map((index) => data.pieces[index].text).join(' ').toLowerCase()).toBe(normalizeSentenceAnswer(data.keys.en));
  expect(conversationTurns(data.conversation).map((turn) => normalizeSentenceAnswer(turn.expected.en))).toEqual([normalizeSentenceAnswer(data.phone.en), normalizeSentenceAnswer(data.keys.en)]);
  expect(() => validateUnit(data.conversation)).not.toThrow();
  expect(JSON.stringify(unit)).toBe(before);
});
