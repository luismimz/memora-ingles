import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useArcadeClock } from './useArcadeClock';
vi.mock('../services/audio', () => ({ stopSpeech: vi.fn() }));

const expire = vi.fn();
const advance = vi.fn();
let root: ReactTestRenderer;
let clock: ReturnType<typeof useArcadeClock>;
function Harness({ calm, revealed = false, index = 0, manualFeedback }: { calm: boolean; revealed?: boolean; index?: number; manualFeedback?: boolean }) {
  clock = useArcadeClock(index, revealed, true, expire, advance, 1000, 6000, 15, calm, manualFeedback);
  return null;
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('window', { setInterval, clearInterval, setTimeout, clearTimeout });
  expire.mockClear(); advance.mockClear();
});
afterEach(() => { act(() => root?.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('sin reloj no expira ni avanza solo; doble Seguir produce un avance y el siguiente reto sigue disponible', () => {
  act(() => { root = create(<Harness calm />); });
  act(() => { vi.advanceTimersByTime(20000); clock.advanceNow(); });
  expect(expire).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled();
  act(() => root.update(<Harness calm revealed />));
  act(() => { vi.advanceTimersByTime(10000); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { clock.advanceNow(); clock.advanceNow(); });
  expect(advance).toHaveBeenCalledTimes(1);
  act(() => root.update(<Harness calm index={1} />));
  act(() => clock.advanceNow());
  expect(advance).toHaveBeenCalledTimes(1);
  act(() => root.update(<Harness calm revealed index={1} />));
  act(() => clock.advanceNow());
  expect(advance).toHaveBeenCalledTimes(2);
});

it('activar sin reloj cancela el tiempo pendiente y respeta pausa y feedback al volver', () => {
  act(() => { root = create(<Harness calm={false} />); });
  act(() => { vi.advanceTimersByTime(2000); });
  expect(clock.remaining).toBeLessThan(6000);
  act(() => root.update(<Harness calm />));
  const remaining = clock.remaining;
  act(() => { vi.advanceTimersByTime(20000); });
  expect(clock.remaining).toBe(remaining); expect(expire).not.toHaveBeenCalled();
  act(() => root.update(<Harness calm revealed />));
  act(() => clock.togglePause());
  act(() => clock.advanceNow());
  expect(advance).not.toHaveBeenCalled();
  act(() => clock.togglePause());
  act(() => root.update(<Harness calm={false} revealed />));
  act(() => { vi.advanceTimersByTime(1000); });
  expect(advance).toHaveBeenCalledOnce();
});
it('separa responder sin reloj de continuar automáticamente después del acierto', () => {
  act(() => { root = create(<Harness calm manualFeedback={false} />); });
  act(() => { vi.advanceTimersByTime(60000); });
  expect(expire).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled();
  act(() => root.update(<Harness calm revealed manualFeedback={false} />));
  act(() => { vi.advanceTimersByTime(500); clock.togglePause(); });
  act(() => { vi.advanceTimersByTime(5000); });
  expect(advance).not.toHaveBeenCalled();
  act(() => clock.togglePause());
  act(() => { vi.advanceTimersByTime(1000); });
  expect(advance).toHaveBeenCalledOnce();
});
it('consultar el resultado cancela avance pendiente sin crear otro reloj ni doble avance', () => {
  act(() => { root = create(<Harness calm revealed manualFeedback={false} />); });
  act(() => { vi.advanceTimersByTime(250); });
  act(() => root.update(<Harness calm revealed manualFeedback />));
  act(() => { vi.advanceTimersByTime(10000); });
  expect(advance).not.toHaveBeenCalled();
  act(() => { clock.advanceNow(); clock.advanceNow(); });
  expect(advance).toHaveBeenCalledOnce();
});
it('ocultar la página congela el tiempo y volver conserva los segundos restantes', () => {
  const page=Object.assign(new EventTarget(),{visibilityState:'visible'});
  vi.stubGlobal('document',page);
  act(()=>{root=create(<Harness calm={false}/>);});
  act(()=>{vi.advanceTimersByTime(2000);});
  const remaining=clock.remaining;
  act(()=>{page.visibilityState='hidden';page.dispatchEvent(new Event('visibilitychange'));});
  act(()=>{vi.advanceTimersByTime(60000);});
  expect(clock.remaining).toBe(remaining);
  expect(expire).not.toHaveBeenCalled();
  act(()=>{page.visibilityState='visible';page.dispatchEvent(new Event('visibilitychange'));});
  act(()=>{vi.advanceTimersByTime(remaining-50);});
  expect(expire).not.toHaveBeenCalled();
  act(()=>{vi.advanceTimersByTime(50);});
  expect(expire).toHaveBeenCalledOnce();
});
it('no avanza resultados en segundo plano ni revoca una pausa manual al volver', () => {
  const page=Object.assign(new EventTarget(),{visibilityState:'visible'});
  vi.stubGlobal('document',page);
  act(()=>{root=create(<Harness calm={false} revealed/>);});
  act(()=>{page.visibilityState='hidden';page.dispatchEvent(new Event('visibilitychange'));});
  act(()=>{vi.advanceTimersByTime(5000);clock.togglePause();});
  act(()=>{page.visibilityState='visible';page.dispatchEvent(new Event('visibilitychange'));});
  act(()=>{vi.advanceTimersByTime(5000);});
  expect(advance).not.toHaveBeenCalled();
  act(()=>clock.togglePause());
  act(()=>{vi.advanceTimersByTime(1000);});
  expect(advance).toHaveBeenCalledOnce();
});
