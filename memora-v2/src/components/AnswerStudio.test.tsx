import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnswerStudio } from './AnswerStudio';
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
