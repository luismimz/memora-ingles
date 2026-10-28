import { expect, it } from 'vitest';
import { sentenceSpellingRepair } from './sentenceAnswer';

it('localiza la H sobrante de la captura sin reescribir las piezas acertadas', () => {
  expect(sentenceSpellingRepair('i want cold whater', 'I want cold water.')).toEqual({ changes: [{ written: 'whater', expected: 'water', start: 12, end: 18 }], corrected: 'i want cold water' });
  expect(sentenceSpellingRepair('I want cold WATRE!', 'I want cold water.')?.corrected).toBe('I want cold water!');
  expect(sentenceSpellingRepair('I want cofee', 'I want coffee.')?.corrected).toBe('I want coffee');
});
it('respeta contracciones, puntuación y rangos del texto real', () => {
  expect(sentenceSpellingRepair("I'm clod.", 'I am cold.')?.corrected).toBe("I'm cold.");
  expect(sentenceSpellingRepair('I don’t want cofee.', "I don't want coffee.")?.corrected).toBe('I don’t want coffee.');
  expect(sentenceSpellingRepair('j am cooking meet', 'I am cooking meat.')?.corrected).toBe('i am cooking meat');
});
it.each(['I want', 'I want cold w', 'I want cold wate', 'I want cold water', 'I want cold water extra', 'wrong wrong wrong words', '<script>water</script>', 'I want coffee', 'I want cold wa'])('no corrige prefijos, frases acertadas o mensajes lejanos: %s', (value) => {
  expect(sentenceSpellingRepair(value, 'I want cold water.')).toBeUndefined();
});
