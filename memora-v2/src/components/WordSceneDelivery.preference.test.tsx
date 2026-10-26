import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { WordSceneDelivery } from './WordSceneDelivery';
import { SceneVisual } from './SceneVisual';
import { previewUnit } from '../preview/previewUnit';
vi.mock('../services/audio', () => ({ playEnglish: vi.fn() }));
it('con un puente rechazado ofrece significado sin volver a pedir su imagen ni resolver por navegar', () => {
  vi.stubGlobal('localStorage', { getItem: () => '1' });
  const answer = vi.fn(), model = vi.fn();
  let tree: ReturnType<typeof create>;
  try {
    act(() => { tree = create(<WordSceneDelivery userId="isolated" word={previewUnit.words[0]} options={previewUnit.words.slice(0, 2)} answered={false} correct={false} presentationKey="isolated" onAnswer={answer} onModel={model} />); });
    expect(tree!.root.findAllByType(SceneVisual)).toHaveLength(0);
    expect(tree!.root.findByType('h1').children).toEqual(['¿Qué significa?']);
    expect(answer).not.toHaveBeenCalled(); expect(model).not.toHaveBeenCalled();
    act(() => tree!.unmount());
  } finally { vi.unstubAllGlobals(); }
});
