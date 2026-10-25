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
it('reconoce respuesta completa una vez, sin botón y sin evaluar borradores incompletos', () => {
  act(() => { tree = create(<Harness />); });
  expect(tree.root.findAllByType('button')).toHaveLength(0);
  type('I am'); act(() => { vi.advanceTimersByTime(1500); }); expect(answer).not.toHaveBeenCalled();
  type('I am playing'); act(() => { vi.advanceTimersByTime(449); }); expect(answer).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); }); expect(answer).toHaveBeenCalledExactlyOnceWith('I am playing');
  act(() => { vi.advanceTimersByTime(2000); }); expect(answer).toHaveBeenCalledOnce();
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
