import { describe, it, expect } from 'vitest';
// The server contract is deliberately exercised with the same dialogue payload.
// @ts-expect-error JavaScript Directus extension has no declaration file.
import { validateProgressBatch } from '../../../backend/extensions/memora-ai/dist/core/progress.js';

describe('contrato compartido de progreso', () => {
  const event = { id: 'bb86563e-8867-4f43-9051-a24c5708e826', at: '2026-10-12T10:00:00Z', kind: 'sentenceExposure', args: ['m1-entry-keys', { en: 'What are you looking for?', es: '¿Qué estás buscando?', slots: [] }] };
  it('guarda una frase del diálogo aunque no sea un ejercicio de piezas', () => {
    expect(validateProgressBatch({ course: 'es-en', events: [event] })).toHaveLength(1);
  });
  it('no acepta piezas que no existen ni frases vacías', () => {
    expect(() => validateProgressBatch({ course: 'es-en', events: [{ ...event, kind: 'chunkExposure', args: [...event.args, 0] }] })).toThrow('Pieza');
    expect(() => validateProgressBatch({ course: 'es-en', events: [{ ...event, args: ['m1-entry-keys', { en: '', es: 'algo', slots: [] }] }] })).toThrow('Frase');
  });
  it('acepta el intento del chat con su pregunta real y la corrección vinculada', () => {
    const id = '4a8ffec3-f946-4662-ae68-a3e1f4a0d065';
    const activity = { id, at: event.at, unitId: 'm1-entry-keys', unitTitle: 'Has perdido las llaves', contentVersion: '1', activityId: 'turn-respond', skill: 'look-for-conversation', phase: 'dialogue', source: 'learner', modality: 'writing', prompt: 'What are you looking for?', response: 'I looking for my keys', expected: "I'm looking for my keys.", correct: false, helped: false, feedback: 'Falta AM.' };
    expect(validateProgressBatch({ course: 'es-en', events: [{ id, at: event.at, kind: 'learning', args: [activity] }] })[0].args[0]).toEqual(activity);
  });
});
