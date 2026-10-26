import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnswerStudio } from './AnswerStudio';
import { sentenceDraftCue } from '../domain/sentenceAnswer';
let tree: ReactTestRenderer;
const answer = vi.fn();
function Harness({ initial = '', taskKey = 'task' }: { initial?: string; taskKey?: string }) {
  const [value, setValue] = useState(initial);
  return <AnswerStudio id="answer" taskKey={taskKey} target="Estoy jugando" value={value} onChange={setValue} onAnswer={answer} accepts={(text) => text.trim().toLowerCase() === 'i am playing'} />;
}
const type = (value: string) => act(() => tree.root.findByType('input').props.onChange({ target: { value } }));
beforeEach(() => { vi.useFakeTimers(); answer.mockClear(); });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.useRealTimers(); });
it.each(['jugar', 'Estoy jugando en mi ordenador.'])('una sola consigna visible etiqueta el campo y conserva el objetivo %s', (target) => {
  act(() => { tree = create(<AnswerStudio id="isolated" taskKey="isolated" target={target} value="" onChange={() => {}} onAnswer={answer} accepts={() => false} />); });
  const label = tree.root.findByType('label');
  expect(label.props.className).toBe('answer-studio-instruction');
  expect(label.props.htmlFor).toBe('isolated');
  expect(label.children).toEqual(['Escribe en inglés']);
  expect(tree.root.findAllByProps({ className: 'answer-studio-direction' })).toHaveLength(0);
  expect(tree.root.findByProps({ id: 'isolated-target' }).children).toEqual([target]);
  expect(tree.root.findByType('input').props['aria-describedby']).toBe('isolated-target isolated-status');
  expect(tree.root.findByType('input').props.placeholder).toBe('Tu respuesta');
  expect(answer).not.toHaveBeenCalled();
});
it('la corrección queda junto al campo y en su descripción sin responder ni revelar un modelo', () => {
  act(() => { tree = create(<AnswerStudio id="repair" taskKey="repair" target="Estoy cocinando carne." value="j am cooking meet" onChange={() => {}} onAnswer={answer} accepts={() => false} feedback="Revisa la primera pieza." />); });
  expect(tree.root.findByProps({ id: 'repair-feedback' }).props.role).toBe('status');
  expect(tree.root.findByType('input').props['aria-describedby']).toContain('repair-feedback');
  act(() => { vi.advanceTimersByTime(1000); });
  expect(answer).not.toHaveBeenCalled();
});
it('reconoce respuesta completa una vez, sin botón y sin evaluar borradores incompletos', () => {
  act(() => { tree = create(<Harness />); });
  expect(tree.root.findAllByType('button')).toHaveLength(0);
  type('I am'); act(() => { vi.advanceTimersByTime(1500); }); expect(answer).not.toHaveBeenCalled();
  type('I am playing'); act(() => { vi.advanceTimersByTime(449); }); expect(answer).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); }); expect(answer).toHaveBeenCalledExactlyOnceWith('I am playing');
  act(() => { vi.advanceTimersByTime(2000); }); expect(answer).toHaveBeenCalledOnce();
});
it('ofrece revisión intencional con Enter sin convertir una pausa en un error', () => {
  act(() => { tree = create(<Harness />); });
  expect(tree.root.findByType('kbd').props['aria-label']).toBe('Enter');
  expect(tree.root.findByType('input').props.enterKeyHint).toBe('send');
  type('I playing'); act(() => { vi.advanceTimersByTime(2000); });
  expect(answer).not.toHaveBeenCalled();
  const preventDefault = vi.fn();
  act(() => tree.root.findByType('form').props.onSubmit({ preventDefault }));
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(answer).toHaveBeenCalledExactlyOnceWith('I playing');
});
it('cambiar el texto, de tarea o salir cancela el reconocimiento pendiente', () => {
  act(() => { tree = create(<Harness />); });
  type('I am playing'); type('I am play'); act(() => { vi.advanceTimersByTime(500); }); expect(answer).not.toHaveBeenCalled();
  type('I am playing'); act(() => tree.update(<Harness taskKey="other" />)); act(() => { vi.advanceTimersByTime(500); }); expect(answer).not.toHaveBeenCalled();
  type('I am playing'); act(() => tree.unmount()); act(() => { vi.advanceTimersByTime(500); }); expect(answer).not.toHaveBeenCalled();
});
it('no envía un borrador restaurado ni responde durante composición del teclado', () => {
  act(() => { tree = create(<Harness initial="I am playing" />); });
  act(() => { vi.advanceTimersByTime(500); }); expect(answer).not.toHaveBeenCalled();
  act(() => tree.root.findByType('input').props.onCompositionStart()); type('I am playing ');
  act(() => { vi.advanceTimersByTime(500); }); expect(answer).not.toHaveBeenCalled();
  act(() => tree.root.findByType('input').props.onCompositionEnd()); act(() => { vi.advanceTimersByTime(450); });
  expect(answer).toHaveBeenCalledExactlyOnceWith('I am playing ');
});

it('orienta una sola vez sobre un borrador cercano sin responder; Enter conserva el texto real', () => {
  const cue = vi.fn();
  function Draft({ taskKey = 'draft' }: { taskKey?: string }) {
    const [value, setValue] = useState('');
    return <AnswerStudio id="draft" taskKey={taskKey} target="Estoy cocinando carne" value={value} onChange={setValue} onAnswer={answer} accepts={(text) => text === 'I am cooking meat'} draftCue={(text) => sentenceDraftCue(text, 'I am cooking meat')} onDraftCue={cue} />;
  }
  act(() => { tree = create(<Draft />); });
  type('j am cooking meet'); act(() => { vi.advanceTimersByTime(1199); }); expect(cue).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); }); expect(cue).toHaveBeenCalledExactlyOnceWith('j am cooking meet', 'Revisa «j» y «meet».'); expect(answer).not.toHaveBeenCalled();
  type('i am cooking meet'); act(() => { vi.advanceTimersByTime(2000); }); expect(cue).toHaveBeenCalledOnce();
  act(() => tree.root.findByType('form').props.onSubmit({ preventDefault() {} })); expect(answer).toHaveBeenCalledExactlyOnceWith('i am cooking meet');
});

it('cancelar o componer nunca dispara orientación pendiente y el acierto conserva prioridad', () => {
  const cue = vi.fn();
  function Draft({ disabled = false, taskKey = 'draft' }: { disabled?: boolean; taskKey?: string }) {
    const [value, setValue] = useState('j am cooking meet');
    return <AnswerStudio id="draft" taskKey={taskKey} target="Estoy cocinando carne" value={value} onChange={setValue} onAnswer={answer} accepts={(text) => text === 'I am cooking meat'} draftCue={(text) => sentenceDraftCue(text, 'I am cooking meat')} onDraftCue={cue} disabled={disabled} />;
  }
  act(() => { tree = create(<Draft />); }); act(() => { vi.advanceTimersByTime(2000); }); expect(cue).not.toHaveBeenCalled();
  act(() => tree.root.findByType('input').props.onCompositionStart()); type('i am cooking meet'); act(() => { vi.advanceTimersByTime(2000); }); expect(cue).not.toHaveBeenCalled();
  act(() => tree.root.findByType('input').props.onCompositionEnd()); act(() => tree.update(<Draft disabled />)); act(() => { vi.advanceTimersByTime(2000); }); expect(cue).not.toHaveBeenCalled();
  act(() => tree.update(<Draft />)); type('I am cooking meat'); act(() => { vi.advanceTimersByTime(450); }); expect(answer).toHaveBeenCalledExactlyOnceWith('I am cooking meat'); expect(cue).not.toHaveBeenCalled();
  type('i am cooking meet'); act(() => tree.update(<Draft taskKey="new" />)); act(() => { vi.advanceTimersByTime(2000); }); expect(cue).not.toHaveBeenCalled();
  type('j am cooking meet'); act(() => tree.unmount()); act(() => { vi.advanceTimersByTime(2000); }); expect(cue).not.toHaveBeenCalled();
});
