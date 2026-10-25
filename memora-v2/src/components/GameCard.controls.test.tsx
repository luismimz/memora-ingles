import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }), useEffect: () => {},
}));
import { GameCard } from './GameCard';
function button(node: ReactNode): ReactElement<any> | undefined {
  if (Array.isArray(node)) return node.flatMap((child) => button(child) ?? [])[0];
  if (!node || typeof node !== 'object' || !('props' in node)) return;
  const element = node as ReactElement<any>;
  return element.type === 'button' ? element : button(element.props.children);
}
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout, clearTimeout }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('avance accesible sin gesto obligatorio', () => {
  it('muestra la acción concreta en vertical, sin sustituirla por navegación genérica', () => {
    const html = renderToStaticMarkup(<GameCard vertical advanceLabel="Ya la he imaginado" onAdvance={() => {}}>Escena</GameCard>);
    expect(html).toContain('aria-label="Ya la he imaginado"');
    expect(html).toContain('title="Desliza hacia arriba o toca para seguir"');
    expect(html).not.toContain('<small>');
    expect(html).not.toContain('Desliza o toca');
    expect(html).not.toContain('Desliza para continuar');
    expect(renderToStaticMarkup(<GameCard vertical revealFooter={false} onAdvance={() => {}}>Enseñanza pendiente</GameCard>)).not.toContain('card-vertical-next');
  });
  it('ofrece un botón explícito cuando la tarjeta no tiene su propio control', () => {
    const html = renderToStaticMarkup(<GameCard advanceControl advanceLabel="Ya la he imaginado" onAdvance={() => {}}>Escena</GameCard>);
    expect(html).toContain('class="card-advance"');
    expect(html).toContain('Ya la he imaginado');
    expect(html).not.toContain('disabled');
  });
  it('doble pulsación solo avanza una vez y la animación no escribe aprendizaje', () => {
    const advance = vi.fn();
    const control = button(GameCard({ advanceControl: true, children: 'Escena', onAdvance: advance }))!;
    control.props.onClick(); control.props.onClick();
    expect(advance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(230);
    expect(advance).toHaveBeenCalledTimes(1);
  });
  it('no habilita el control mientras la enseñanza no permite continuar', () => {
    expect(button(GameCard({ advanceControl: true, reserveFooter: true, revealFooter: false, children: 'Espera' }))!.props.disabled).toBe(true);
  });
  it('no duplica el botón en tarjetas que ya ofrecen su acción principal', () => {
    const html = renderToStaticMarkup(<GameCard onAdvance={() => {}}><button type="button">Seguir</button></GameCard>);
    expect(html).not.toContain('card-advance');
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});
