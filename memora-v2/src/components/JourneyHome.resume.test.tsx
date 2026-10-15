import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyHome } from './JourneyHomeV2';
import { initialGame } from '../domain/game';
import { writeGameCheckpoint } from '../domain/gameCheckpoint';

beforeEach(() => {
  const rows = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => rows.set(key, value) });
});
const units = Array.from({ length: 12 }, (_, index) => ({ id: `pack-${index}`, title: `Parada ${index + 1}`, kind: 'vocabulary-pack' as const, words: [{ en: `WORD${index}`, es: 'palabra' }] }));
function home() {
  return renderToStaticMarkup(<JourneyHome units={units} userId="learner" resumeUnitId="pack-10" resumeLearningMode="vocabulary" onOpen={() => {}} onConverse={() => {}} onExit={() => {}} onProfile={() => {}} appearance="light" onToggleAppearance={() => {}} />);
}
describe('posición de Home después de parar', () => {
  it('mantiene la siguiente parada aunque aún no tenga checkpoint y haya anteriores sin jugar', () => {
    expect(home()).toContain('Tu posición · parada 11 de 12');
    expect(home()).toContain('Parada 11: Parada 11. Continúa aquí.');
  });
  it('distingue una actividad en curso de una parada todavía sin empezar', () => {
    writeGameCheckpoint('learner', 'pack-10:vocabulary', '1', { ...initialGame, phase: 'recall', recallIndex: 1 });
    const html = home();
    expect(html).toContain('JUSTO DONDE LO DEJASTE');
    expect(html).toContain('Recuerda lo que aprendiste');
    expect(html).toContain('Continuar jugando');
  });
});
