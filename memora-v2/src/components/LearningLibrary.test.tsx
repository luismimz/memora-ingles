import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LearningLibrary } from './LearningLibrary';
import { previewUnit } from '../preview/previewUnit';
beforeEach(() => vi.stubGlobal('localStorage', { getItem: () => null }));
it('no rompe el apartado por una unidad sin formas e informa las cargas parciales', () => {
  const html = renderToStaticMarkup(<LearningLibrary mode="grammar" units={[{ ...previewUnit, grammar: [] }, previewUnit]} userId="test" inspection={false} notice="Una misión no se pudo cargar" onRetry={() => {}} onOpen={() => {}} onBack={() => {}} onWords={() => {}} />);
  expect(html).toContain('Una misión no se pudo cargar');
  expect(html).toContain('Volver a intentar');
  expect(html).toContain('Primero prepara:');
  expect(html).toContain('disabled');
  expect(html.match(/<article/g)).toHaveLength(1);
});
