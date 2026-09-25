import { describe, expect, it } from 'vitest';
import { arpabetPhones, ipaPhones, pronunciationEs, render, scoreKeyword, spanishPhones, stressedFocus } from '../../../shared/phonetics.mjs';
import { classifyWord, cognateRule } from '../../../shared/classify.mjs';
import { bucketOf, retentionBy } from '../../../shared/retention.mjs';

const P = (a: string) => arpabetPhones(a);

describe('fonética', () => {
  it('encuentra la sílaba fuerte real', () => {
    expect(render(stressedFocus(P('F ER0 G EH1 T')))).toBe('get');
    expect(render(stressedFocus(P('B IH0 L IY1 V')))).toBe('lib');
    expect(render(stressedFocus(P('B R IH1 NG')))).toBe('bɾin');
  });
  it('convierte ortografía española a sonidos (c/z = θ, ll, ch, qu, gü)', () => {
    expect(render(spanishPhones('cigüeña'))).toBe('θigweɲa');
    expect(render(spanishPhones('chelo'))).toBe('tʃelo');
    expect(render(spanishPhones('quepo'))).toBe('kepo');
    expect(render(spanishPhones('Jerry'))).toBe('xeri');
  });
  it('premia el sonido, no la ortografía', () => {
    expect(scoreKeyword(P('F ER0 G EH1 T'), 'fogata').score).toBeGreaterThan(scoreKeyword(P('F ER0 G EH1 T'), 'furgoneta').score);
    expect(scoreKeyword(P('HH ER1 IY0'), 'jerry').verdict).toBe('good');
    expect(scoreKeyword(P('B AA1 R OW0'), 'mesa').verdict).toBe('bad');
    expect(scoreKeyword(P('W AO1 L'), 'cielo').verdict).toBe('bad');
  });
  it('lee IPA como respaldo', () => {
    expect(render(stressedFocus(ipaPhones('/ˈlædər/')))).toBe('lad');
  });
  it('calcula la pronunciación figurada desde la real', () => {
    expect(pronunciationEs(P('F ER0 G EH1 T'))).toBe('far-GUET');
    expect(pronunciationEs(P('M EY1 B IY0'))).toBe('MEI-bi');
  });
});

describe('clasificación', () => {
  const irregular = new Map([['bring', { past: 'brought', participle: 'brought' }], ['bear', { past: 'bore', participle: 'born' }]]);
  const known = new Map([['bed', 'cama'], ['room', 'habitación'], ['car', 'coche'], ['pet', 'mascota'], ['week', 'semana'], ['end', 'final']]);
  it('cognados solo con la traducción principal (los falsos amigos nunca pasan)', () => {
    expect(cognateRule('delicious', 'delicioso')).toMatch(/oso/);
    expect(cognateRule('actually', 'en realidad')).toBeNull();
    expect(cognateRule('save', 'ahorrar / salvar')).toBeNull();
  });
  it('tipos', () => {
    expect(classifyWord({ en: 'bring', es: 'traer' }, { irregular }).kind).toBe('irregular');
    expect(classifyWord({ en: 'bear', es: 'oso' }, { irregular }).kind).toBe('keyword');
    expect(classifyWord({ en: 'give up', es: 'rendirse' }).kind).toBe('phrasal');
    expect(classifyWord({ en: 'day off', es: 'día libre' }).kind).toBe('chunk');
    expect(classifyWord({ en: 'weekend', es: 'fin de semana' }, { known }).kind).toBe('easy');
    expect(classifyWord({ en: 'carpet', es: 'alfombra' }, { known }).kind).toBe('keyword');
    expect(classifyWord({ en: 'borrow', es: 'pedir prestado' }).kind).toBe('keyword');
  });
});

describe('retención compartida', () => {
  it('ventanas y agrupación por asociación', () => {
    expect(bucketOf({ kind: 'review', hours_since_learned: 30 })).toBe('24h');
    expect(bucketOf({ kind: 'rescue', hours_since_learned: 0 })).toBeNull();
    const at = [
      { kind: 'exam', hours_since_learned: 0, result: 'ok', word: 1, mnemonic: 7, created_at: '1' },
      { kind: 'exam', hours_since_learned: 0, result: 'fail', word: 2, mnemonic: 8, created_at: '2' },
      { kind: 'review', hours_since_learned: 1.2, result: 'doubt', word: 1, mnemonic: 7, created_at: '3' },
    ];
    const by = retentionBy(at, (a: { mnemonic: number }) => a.mnemonic);
    expect(by.get(7)!.exam).toEqual({ n: 1, rate: 1 });
    expect(by.get(7)!['1h']).toEqual({ n: 1, rate: 0.5 });
    expect(by.get(8)!.exam.rate).toBe(0);
  });
});
