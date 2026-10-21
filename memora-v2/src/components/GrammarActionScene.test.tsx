import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { previewUnit } from '../preview/previewUnit';
import { lessonForForm } from '../domain/grammarLesson';
import { GrammarActionScene, supportsGrammarAction } from './GrammarActionScene';
const form = previewUnit.grammar.find((candidate) => candidate.englishBase === 'play')!;
const lesson = lessonForForm(form, 'jugar')!;
const render = (stage: 'teach' | 'explain' | 'write' | 'finished', feedback: 'idle' | 'help' | 'correct') => renderToStaticMarkup(<GrammarActionScene form={form} lesson={lesson} stage={stage} feedback={feedback} />);
describe('gramática con una consecuencia observable', () => {
  it('solo presenta la escena para el patrón y respuesta originales compatibles', () => {
    expect(supportsGrammarAction(lesson, form)).toBe(true);
    expect(supportsGrammarAction({ ...lesson, id: 'future-pattern' }, form)).toBe(false);
    expect(supportsGrammarAction({ ...lesson, checks: [] }, form)).toBe(false);
    expect(supportsGrammarAction(lesson, { ...form, englishBase: 'brush' })).toBe(false);
  });
  it('no revela la frase ni la palabra evaluada en el encuadre del reto', () => {
    const html = render('write', 'idle');
    expect(html).toContain('Cuenta qué estás haciendo');
    expect(html).not.toMatch(/I am playing|I&#x27;m playing|\bAM\b|\bPLAYING\b/i);
    expect(html).not.toContain('is-running');
  });
  it('comprender conecta el tablero pero producir la respuesta pone el juego en marcha', () => {
    expect(render('explain', 'correct')).toContain('is-connected');
    expect(render('explain', 'correct')).not.toContain('is-running');
    expect(render('write', 'correct')).toContain('is-running');
    expect(render('write', 'correct')).toContain('El tablero está jugando');
  });
  it('el error deja una reparación, no una victoria ni una promesa de dominio', () => {
    const html = render('write', 'help');
    expect(html).toContain('vuelve a probar');
    expect(html).not.toContain('is-running');
    expect(html).toContain('el repaso comprobará');
  });
});
