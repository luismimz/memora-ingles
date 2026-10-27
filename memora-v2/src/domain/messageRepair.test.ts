import { expect, it } from 'vitest';
import { validateMessageRepair } from './messageRepair';
import { computerPlayingLesson } from './computerPlayingPractice';
import { validateGrammarLesson } from './grammarLesson';
import { previewUnit } from '../preview/previewUnit';

const lesson = computerPlayingLesson(previewUnit, 'ing')!;
const check = lesson.checks.find((item) => item.repair)!;
const repair = check.repair!;
it('acepta una reparación del mensaje enseñado y solo con piezas ya modeladas', () => {
  expect(() => validateMessageRepair(repair, lesson.steps, check.answers)).not.toThrow();
  expect(() => validateGrammarLesson(lesson)).not.toThrow();
});
it('rechaza solución no enseñada, opción desconocida y modelo visual que dice otra cosa', () => {
  expect(() => validateMessageRepair({ ...repair, solution: 'I was playing.' }, lesson.steps, check.answers)).toThrow();
  expect(() => validateMessageRepair({ ...repair, choices: [...repair.choices, { text: 'DO', role: 'auxiliary' }] }, lesson.steps, check.answers)).toThrow('desconocidas');
  expect(() => validateMessageRepair({ ...repair, joined: { ...repair.joined, inserted: 'has' } }, lesson.steps, check.answers)).toThrow('modelo');
  expect(() => validateMessageRepair({ ...repair, pieces: [...repair.pieces, { text: 'unknown', role: 'context' }] }, lesson.steps, check.answers)).toThrow('desconocidas');
});
it('rechaza una reparación imposible o una mezcla de modalidades aunque tenga un texto bonito', () => {
  expect(() => validateMessageRepair({ ...repair, choices: [repair.choices[0], repair.choices[2]] }, lesson.steps, check.answers)).toThrow('realmente');
  expect(() => validateGrammarLesson({ ...lesson, checks: lesson.checks.map((item) => item === check ? { ...item, choices: ['AM', 'MY'] } : item) })).toThrow('interacción');
});
